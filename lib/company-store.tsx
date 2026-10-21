import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { COMPANY_API_DESCRIPTION, COMPANY_API_MODE, CompanyApiError, companyApi, isRetryableCompanyError, type CompanyAction, type CompanyItem, type CompanySession, type EmployeeRole, type ItemValues, type MutationKind } from "@/lib/company-api";

const SESSION_KEY = "dbscan.company.session.v1";
const QUEUE_KEY = "dbscan.company.queue.v1";
const CACHE_KEY = "dbscan.company.cache.v1";

type SyncStatus = "idle" | "synced" | "syncing" | "queued" | "offline" | "error";
type ItemCache = Record<string, CompanyItem>;
type SubmitResult = { queued: boolean; item: CompanyItem };

type CompanyStoreValue = {
  session: CompanySession | null;
  authHydrated: boolean;
  authLoading: boolean;
  apiMode: typeof COMPANY_API_MODE;
  apiDescription: string;
  companyOffline: boolean;
  setCompanyOffline: (offline: boolean) => void;
  syncStatus: SyncStatus;
  syncMessage: string;
  queue: CompanyAction[];
  lastSyncAt: string | null;
  signIn: (identifier: string, password: string) => Promise<CompanySession>;
  signOut: () => Promise<void>;
  can: (role: EmployeeRole) => boolean;
  lookupItem: (code: string) => Promise<CompanyItem | null>;
  submitAction: (input: { kind: MutationKind; code: string; itemId?: string; mode?: "qr" | "barcode"; payload: Partial<ItemValues>; oldValues: Partial<ItemValues>; expectedUpdatedAt?: string; force?: boolean }) => Promise<SubmitResult>;
  syncNow: () => Promise<void>;
  retryBlocked: (actionId: string, force?: boolean) => Promise<void>;
};

const CompanyContext = createContext<CompanyStoreValue | null>(null);

async function readSecure(key: string) {
  try {
    return Platform.OS === "web" ? await AsyncStorage.getItem(key) : await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}
async function writeSecure(key: string, value: string) {
  if (Platform.OS === "web") return AsyncStorage.setItem(key, value);
  return SecureStore.setItemAsync(key, value);
}
async function removeSecure(key: string) {
  if (Platform.OS === "web") return AsyncStorage.removeItem(key);
  return SecureStore.deleteItemAsync(key);
}
function roleRank(role: EmployeeRole) {
  return role === "admin" ? 3 : role === "staff" ? 2 : 1;
}
function requiredRole(kind: MutationKind): EmployeeRole {
  return kind === "edit_info" ? "admin" : "staff";
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The company system could not complete that action.";
}
function isExpired(session: CompanySession) {
  return new Date(session.expiresAt).getTime() <= Date.now();
}
function cacheItem(item: CompanyItem, queue: CompanyAction[]) {
  const pending = queue.some((action) => action.code === item.code && action.status !== "blocked");
  return { ...item, pendingSync: pending };
}
function optimisticItem(action: CompanyAction, current: CompanyItem | undefined): CompanyItem {
  const now = action.createdAt;
  if (action.kind === "add_item") {
    return {
      id: action.itemId ?? `local-${action.id}`,
      code: action.code,
      name: action.payload.name ?? "New scanned item",
      sku: action.payload.sku ?? `SCAN-${action.code.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}`,
      location: action.payload.location ?? "Unassigned",
      status: action.payload.status ?? "Active",
      updatedAt: now,
      updatedBy: action.actor.name,
      auditLog: [],
      pendingSync: true,
    };
  }
  if (!current) throw new CompanyApiError("NOT_FOUND", "This item is not cached on the device yet.");
  return { ...current, ...action.payload, updatedAt: now, updatedBy: action.actor.name, pendingSync: true };
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CompanySession | null>(null);
  const [authHydrated, setAuthHydrated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [cache, setCache] = useState<ItemCache>({});
  const [queue, setQueue] = useState<CompanyAction[]>([]);
  const [companyOffline, setCompanyOffline] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState("No company action pending.");
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([readSecure(SESSION_KEY), AsyncStorage.getItem(QUEUE_KEY), AsyncStorage.getItem(CACHE_KEY)])
      .then(([sessionRaw, queueRaw, cacheRaw]) => {
        if (!mounted) return;
        if (sessionRaw) {
          const parsed = JSON.parse(sessionRaw) as CompanySession;
          if (!isExpired(parsed)) setSession(parsed);
          else void removeSecure(SESSION_KEY);
        }
        if (queueRaw) setQueue(JSON.parse(queueRaw) as CompanyAction[]);
        if (cacheRaw) setCache(JSON.parse(cacheRaw) as ItemCache);
        setAuthHydrated(true);
      })
      .catch(() => setAuthHydrated(true));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (authHydrated) void AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }, [authHydrated, queue]);
  useEffect(() => {
    if (authHydrated) void AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  }, [authHydrated, cache]);
  useEffect(() => {
    if (queue.length > 0 && syncStatus !== "syncing") setSyncStatus(companyOffline ? "offline" : "queued");
  }, [companyOffline, queue.length, syncStatus]);

  const signIn = useCallback(async (identifier: string, password: string) => {
    setAuthLoading(true);
    try {
      const next = await companyApi.login(identifier, password);
      await writeSecure(SESSION_KEY, JSON.stringify(next));
      setSession(next);
      setSyncStatus("synced");
      setSyncMessage(`Signed in as ${next.employee.name}.`);
      return next;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await removeSecure(SESSION_KEY);
    setSession(null);
    setSyncStatus(queue.length > 0 ? "offline" : "idle");
    setSyncMessage(queue.length > 0 ? "Pending actions are safe and waiting for the next sign-in." : "Signed out of the company system.");
  }, [queue.length]);

  useEffect(() => {
    if (!session) return;
    const remaining = new Date(session.expiresAt).getTime() - Date.now();
    const timer = setTimeout(() => void signOut(), Math.max(0, Math.min(remaining, 2_147_483_647)));
    return () => clearTimeout(timer);
  }, [session, signOut]);

  const can = useCallback((role: EmployeeRole) => Boolean(session && roleRank(session.employee.role) >= roleRank(role)), [session]);

  const enqueue = useCallback((action: CompanyAction, optimistic: CompanyItem | undefined) => {
    setQueue((current) => [...current, { ...action, status: "pending" }]);
    if (optimistic) setCache((current) => ({ ...current, [optimistic.code]: { ...optimistic, pendingSync: true } }));
    setSyncStatus("queued");
    setSyncMessage("Saved on this device. It will sync automatically when the company system is reachable.");
    return optimistic;
  }, []);

  const lookupItem = useCallback(async (code: string) => {
    if (!session) throw new CompanyApiError("UNAUTHORIZED", "Sign in to look up company items.");
    if (isExpired(session)) {
      setSession(null);
      await removeSecure(SESSION_KEY);
      throw new CompanyApiError("UNAUTHORIZED", "Your company session expired. Sign in again.");
    }
    const cached = cache[code];
    if (companyOffline) {
      if (cached) return cacheItem(cached, queue);
      throw new CompanyApiError("NETWORK", "Offline: this code is not cached on the device.");
    }
    try {
      const item = await companyApi.lookupItem(code, session.accessToken);
      if (item) setCache((current) => ({ ...current, [item.code]: cacheItem(item, queue) }));
      setSyncStatus(queue.length > 0 ? "queued" : "synced");
      setSyncMessage(item ? "Company item loaded." : "No matching item was found.");
      return item;
    } catch (error) {
      if (cached && isRetryableCompanyError(error)) return cacheItem(cached, queue);
      if (isRetryableCompanyError(error)) {
        setSyncStatus("offline");
        setSyncMessage("Company system unreachable. Local scanning still works.");
      }
      throw error;
    }
  }, [cache, companyOffline, queue, session]);

  const submitAction = useCallback(async (input: Parameters<CompanyStoreValue["submitAction"]>[0]) => {
    if (!session) throw new CompanyApiError("UNAUTHORIZED", "Sign in before changing company data.");
    if (isExpired(session)) throw new CompanyApiError("UNAUTHORIZED", "Your company session expired. Sign in again.");
    if (!can(requiredRole(input.kind))) throw new CompanyApiError("FORBIDDEN", `Your ${session.employee.role} role cannot perform this action.`);
    const action: CompanyAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind: input.kind,
      code: input.code,
      itemId: input.itemId,
      mode: input.mode,
      payload: input.payload,
      actor: { id: session.employee.id, name: session.employee.name, role: session.employee.role },
      createdAt: new Date().toISOString(),
      oldValues: input.oldValues,
      newValues: input.payload,
      expectedUpdatedAt: input.expectedUpdatedAt,
      force: input.force,
    };
    const current = cache[input.code];
    if (companyOffline) return { queued: true, item: enqueue(action, optimisticItem(action, current)) as CompanyItem };
    try {
      const item = await companyApi.mutate(action, session.accessToken);
      setCache((existing) => ({ ...existing, [item.code]: item }));
      setSyncStatus(queue.length > 0 ? "queued" : "synced");
      setSyncMessage("Company item updated and audit recorded.");
      return { queued: false, item };
    } catch (error) {
      if (isRetryableCompanyError(error)) return { queued: true, item: enqueue(action, optimisticItem(action, current)) as CompanyItem };
      throw error;
    }
  }, [cache, can, companyOffline, enqueue, queue.length, session]);

  const syncNow = useCallback(async () => {
    if (!session || queue.length === 0) {
      if (queue.length === 0 && session) setSyncStatus("synced");
      return;
    }
    if (companyOffline) {
      setSyncStatus("offline");
      setSyncMessage("Offline mode is on. Pending actions remain queued.");
      return;
    }
    setSyncStatus("syncing");
    setSyncMessage(`Syncing ${queue.length} pending action${queue.length === 1 ? "" : "s"}…`);
    let working = [...queue];
    let blocked = false;
    for (const action of queue) {
      if (action.status === "blocked") {
        blocked = true;
        continue;
      }
      try {
        const item = await companyApi.mutate(action, session.accessToken);
        setCache((existing) => ({ ...existing, [item.code]: item }));
        working = working.filter((candidate) => candidate.id !== action.id);
        setQueue(working);
      } catch (error) {
        blocked = true;
        working = working.map((candidate) => candidate.id === action.id ? { ...candidate, status: "blocked", error: errorMessage(error) } : candidate);
        setQueue(working);
      }
    }
    setLastSyncAt(new Date().toISOString());
    setSyncStatus(blocked ? "error" : working.length > 0 ? "queued" : "synced");
    setSyncMessage(blocked ? "A pending action needs review before it can sync." : working.length > 0 ? `${working.length} action${working.length === 1 ? "" : "s"} still queued.` : "All company actions are synced.");
  }, [companyOffline, queue, session]);

  const retryBlocked = useCallback(async (actionId: string, force = false) => {
    if (!session) throw new CompanyApiError("UNAUTHORIZED", "Sign in again before retrying queued actions.");
    setQueue((current) => current.map((action) => action.id === actionId ? { ...action, status: "pending", error: undefined, force: force || action.force } : action));
    setSyncStatus("queued");
    setSyncMessage(force ? "Force overwrite approved. Sync will retry this action." : "Queued action released for another sync attempt.");
  }, [session]);

  useEffect(() => {
    if (!session || companyOffline) return;
    void syncNow();
    const timer = setInterval(() => void syncNow(), 15000);
    return () => clearInterval(timer);
  }, [companyOffline, session, syncNow]);

  const value = useMemo<CompanyStoreValue>(() => ({ session, authHydrated, authLoading, apiMode: COMPANY_API_MODE, apiDescription: COMPANY_API_DESCRIPTION, companyOffline, setCompanyOffline: (offline) => { setCompanyOffline(offline); setSyncStatus(offline ? "offline" : queue.length > 0 ? "queued" : "synced"); }, syncStatus, syncMessage, queue, lastSyncAt, signIn, signOut, can, lookupItem, submitAction, syncNow, retryBlocked }), [authHydrated, authLoading, can, companyOffline, lastSyncAt, lookupItem, queue, retryBlocked, session, signIn, signOut, submitAction, syncMessage, syncNow, syncStatus]);
  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompanyStore() {
  const value = useContext(CompanyContext);
  if (!value) throw new Error("useCompanyStore must be used within CompanyProvider");
  return value;
}
