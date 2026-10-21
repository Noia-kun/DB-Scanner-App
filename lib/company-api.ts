import type { ScanMode } from "@/lib/scan-store";

export type EmployeeRole = "viewer" | "staff" | "admin";
export type ItemStatus = "Active" | "Quarantined" | "Retired";
export type CompanyApiMode = "mock" | "http";
export type MutationKind = "add_item" | "update_location" | "edit_info";
export type ItemValues = {
  code: string;
  name: string;
  sku: string;
  location: string;
  status: ItemStatus;
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
};

export type CompanySession = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  employee: Employee;
};

export type AuditEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  timestamp: string;
  oldValues: Partial<ItemValues>;
  newValues: Partial<ItemValues>;
};

export type CompanyItem = ItemValues & {
  id: string;
  updatedAt: string;
  updatedBy: string;
  auditLog: AuditEntry[];
  pendingSync?: boolean;
};

export type ActionActor = Pick<Employee, "id" | "name" | "role">;

export type CompanyAction = {
  id: string;
  kind: MutationKind;
  code: string;
  itemId?: string;
  mode?: ScanMode;
  payload: Partial<ItemValues>;
  actor: ActionActor;
  createdAt: string;
  oldValues: Partial<ItemValues>;
  newValues: Partial<ItemValues>;
  expectedUpdatedAt?: string;
  force?: boolean;
  status?: "pending" | "blocked";
  error?: string;
};

export class CompanyApiError extends Error {
  code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "DUPLICATE" | "CONFLICT" | "NETWORK" | "INVALID" | "UNKNOWN";
  status?: number;

  constructor(code: CompanyApiError["code"], message: string, status?: number) {
    super(message);
    this.name = "CompanyApiError";
    this.code = code;
    this.status = status;
  }
}

export interface CompanyApi {
  readonly mode: CompanyApiMode;
  login(identifier: string, password: string): Promise<CompanySession>;
  lookupItem(code: string, accessToken: string): Promise<CompanyItem | null>;
  mutate(action: CompanyAction, accessToken: string): Promise<CompanyItem>;
}

const API_BASE_URL = (process.env.EXPO_PUBLIC_COMPANY_API_BASE_URL ?? "").replace(/\/$/, "");
const AUTH_METHOD = process.env.EXPO_PUBLIC_COMPANY_AUTH_METHOD ?? "mock";
export const COMPANY_API_MODE: CompanyApiMode = API_BASE_URL && API_BASE_URL !== "[API BASE URL]" ? "http" : "mock";
export const COMPANY_API_DESCRIPTION = COMPANY_API_MODE === "mock" ? "Preview mock company system" : `${AUTH_METHOD} company API`;

const MOCK_ACCOUNTS: Array<{ identifier: string; password: string; employee: Employee }> = [
  { identifier: "viewer@company.test", password: "viewer123", employee: { id: "emp-100", name: "Maya Hassan", email: "viewer@company.test", role: "viewer" } },
  { identifier: "staff@company.test", password: "staff123", employee: { id: "emp-200", name: "Omar Rahman", email: "staff@company.test", role: "staff" } },
  { identifier: "admin@company.test", password: "admin123", employee: { id: "emp-300", name: "Aisha Al-Kuwari", email: "admin@company.test", role: "admin" } },
];

let mockItems: CompanyItem[] = [
  {
    id: "item-1001",
    code: "https://dbscan.company/item/1001",
    name: "Front Desk Tablet",
    sku: "DB-1001",
    location: "Head office · Level 1",
    status: "Active",
    updatedAt: new Date(Date.now() - 1000 * 60 * 48).toISOString(),
    updatedBy: "Aisha Al-Kuwari",
    auditLog: [],
  },
  {
    id: "item-1002",
    code: "036000291452",
    name: "Thermal printer roll",
    sku: "SUP-036000291452",
    location: "Warehouse · Bay 4",
    status: "Active",
    updatedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    updatedBy: "Omar Rahman",
    auditLog: [],
  },
];
const mockTokens = new Map<string, Employee>();

function cloneItem(item: CompanyItem): CompanyItem {
  return { ...item, auditLog: item.auditLog.map((entry) => ({ ...entry, oldValues: { ...entry.oldValues }, newValues: { ...entry.newValues } })) };
}

function getMockEmployee(accessToken: string) {
  const employee = mockTokens.get(accessToken);
  if (!employee) throw new CompanyApiError("UNAUTHORIZED", "Your company session is no longer valid. Sign in again.");
  return employee;
}

function roleAllows(kind: MutationKind, role: EmployeeRole) {
  if (kind === "add_item" || kind === "update_location") return role === "staff" || role === "admin";
  return role === "admin";
}

function applyMockMutation(action: CompanyAction): CompanyItem {
  const employee = getMockEmployee(`mock:${action.actor.id}`);
  if (!roleAllows(action.kind, employee.role)) throw new CompanyApiError("FORBIDDEN", "Your database role cannot perform this action.");
  const now = new Date().toISOString();
  if (action.kind === "add_item") {
    if (mockItems.some((item) => item.code === action.code)) throw new CompanyApiError("DUPLICATE", "That code already belongs to an item in the company system.");
    const values: ItemValues = {
      code: action.code,
      name: action.payload.name?.trim() || "New scanned item",
      sku: action.payload.sku?.trim() || `SCAN-${action.code.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}`,
      location: action.payload.location?.trim() || "Unassigned",
      status: action.payload.status ?? "Active",
    };
    const audit: AuditEntry = { id: `audit-${Date.now()}`, employeeId: employee.id, employeeName: employee.name, timestamp: now, oldValues: {}, newValues: values };
    const item: CompanyItem = { id: `item-${Date.now()}`, ...values, updatedAt: now, updatedBy: employee.name, auditLog: [audit] };
    mockItems = [item, ...mockItems];
    return cloneItem(item);
  }
  const index = mockItems.findIndex((item) => item.id === action.itemId || item.code === action.code);
  if (index < 0) throw new CompanyApiError("NOT_FOUND", "The item no longer exists in the company system.");
  const current = mockItems[index];
  if (!action.force && action.expectedUpdatedAt && current.updatedAt !== action.expectedUpdatedAt) throw new CompanyApiError("CONFLICT", "This item changed on the company dashboard. Review the latest values before overwriting.");
  const oldValues: Partial<ItemValues> = { code: current.code, name: current.name, sku: current.sku, location: current.location, status: current.status };
  const values: ItemValues = {
    code: action.payload.code ?? current.code,
    name: action.payload.name ?? current.name,
    sku: action.payload.sku ?? current.sku,
    location: action.payload.location ?? current.location,
    status: action.payload.status ?? current.status,
  };
  const audit: AuditEntry = { id: `audit-${Date.now()}`, employeeId: employee.id, employeeName: employee.name, timestamp: now, oldValues, newValues: values };
  const item: CompanyItem = { ...current, ...values, updatedAt: now, updatedBy: employee.name, auditLog: [...current.auditLog, audit] };
  mockItems[index] = item;
  return cloneItem(item);
}

const mockApi: CompanyApi = {
  mode: "mock",
  async login(identifier, password) {
    await new Promise((resolve) => setTimeout(resolve, 260));
    const account = MOCK_ACCOUNTS.find((candidate) => candidate.identifier === identifier.trim().toLowerCase() && candidate.password === password);
    if (!account) throw new CompanyApiError("UNAUTHORIZED", "Use one of the Preview employee accounts below.");
    const accessToken = `mock:${account.employee.id}`;
    mockTokens.set(accessToken, account.employee);
    return { accessToken, refreshToken: accessToken, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(), employee: account.employee };
  },
  async lookupItem(code, accessToken) {
    getMockEmployee(accessToken);
    await new Promise((resolve) => setTimeout(resolve, 220));
    const item = mockItems.find((candidate) => candidate.code === code.trim());
    return item ? cloneItem(item) : null;
  },
  async mutate(action, accessToken) {
    const employee = getMockEmployee(accessToken);
    if (employee.id !== action.actor.id) throw new CompanyApiError("UNAUTHORIZED", "The signed-in employee does not match this action.");
    await new Promise((resolve) => setTimeout(resolve, 220));
    return applyMockMutation(action);
  },
};

async function httpRequest<T>(path: string, accessToken: string | undefined, init: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) throw new CompanyApiError("NETWORK", "Company API base URL is not configured.");
  try {
    const normalizedAuth = AUTH_METHOD.toLowerCase();
    const authHeaders: Record<string, string> = accessToken && normalizedAuth.includes("api-key") ? { "X-API-Key": accessToken } : accessToken && !normalizedAuth.includes("cookie") ? { Authorization: `Bearer ${accessToken}` } : {};
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: normalizedAuth.includes("cookie") ? "include" : init.credentials,
      headers: { "Content-Type": "application/json", ...authHeaders, ...(init.headers ?? {}) },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const code = body.code === "CONFLICT" || response.status === 409 ? "CONFLICT" : body.code === "DUPLICATE" ? "DUPLICATE" : response.status === 401 ? "UNAUTHORIZED" : response.status === 403 ? "FORBIDDEN" : response.status === 404 ? "NOT_FOUND" : "UNKNOWN";
      throw new CompanyApiError(code, body.message ?? "The company system returned an error.", response.status);
    }
    return body as T;
  } catch (error) {
    if (error instanceof CompanyApiError) throw error;
    throw new CompanyApiError("NETWORK", "The company system is unreachable. Your action is safe to retry.");
  }
}

const httpApi: CompanyApi = {
  mode: "http",
  async login(identifier, password) {
    const response = await httpRequest<CompanySession>("/auth/login", undefined, { method: "POST", body: JSON.stringify({ identifier, password, authMethod: AUTH_METHOD }) });
    return response;
  },
  async lookupItem(code, accessToken) {
    try {
      const response = await httpRequest<{ item?: CompanyItem }>(`/items/by-code/${encodeURIComponent(code)}`, accessToken);
      return response.item ?? (response as unknown as CompanyItem);
    } catch (error) {
      if (error instanceof CompanyApiError && error.code === "NOT_FOUND") return null;
      throw error;
    }
  },
  async mutate(action, accessToken) {
    if (!roleAllows(action.kind, action.actor.role)) throw new CompanyApiError("FORBIDDEN", "Your database role cannot perform this action.");
    const isAdd = action.kind === "add_item";
    const path = isAdd ? "/items" : `/items/${encodeURIComponent(action.itemId ?? action.code)}`;
    const method = isAdd ? "POST" : "PATCH";
    const response = await httpRequest<{ item?: CompanyItem }>(path, accessToken, {
      method,
      body: JSON.stringify({ ...action.payload, code: action.code, expectedUpdatedAt: action.expectedUpdatedAt, force: action.force, audit: { employee: action.actor, timestamp: action.createdAt, oldValues: action.oldValues, newValues: action.newValues } }),
    });
    return response.item ?? (response as unknown as CompanyItem);
  },
};

export const companyApi: CompanyApi = COMPANY_API_MODE === "http" ? httpApi : mockApi;
export const MOCK_EMPLOYEE_HINTS = MOCK_ACCOUNTS.map((account) => ({ identifier: account.identifier, password: account.password, role: account.employee.role }));
export function isRetryableCompanyError(error: unknown) {
  return error instanceof CompanyApiError && error.code === "NETWORK";
}
