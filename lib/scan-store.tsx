import AsyncStorage from "@react-native-async-storage/async-storage";
import { useContext, createContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ScanMode = "qr" | "barcode";
export type ScanKind = "QR code" | "Barcode";
export type DateFilter = "all" | "today" | "week";

export type ScanRecord = {
  id: string;
  data: string;
  type: ScanKind;
  mode: ScanMode;
  createdAt: string;
};

export type ScanSettings = {
  defaultMode: ScanMode;
  haptic: boolean;
  sound: boolean;
  autoCopy: boolean;
  darkMode: boolean;
};

const HISTORY_KEY = "scanly.history.v1";
const SETTINGS_KEY = "scanly.settings.v1";
const ONBOARDING_KEY = "scanly.onboarding.v1";

const DEFAULT_SETTINGS: ScanSettings = {
  defaultMode: "qr",
  haptic: true,
  sound: true,
  autoCopy: false,
  darkMode: true,
};

const DEMO_HISTORY: ScanRecord[] = [
  {
    id: "demo-1",
    data: "https://scanly.app/launch",
    type: "QR code",
    mode: "qr",
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
  },
  {
    id: "demo-2",
    data: "036000291452",
    type: "Barcode",
    mode: "barcode",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(),
  },
];

type ScanContextValue = {
  history: ScanRecord[];
  settings: ScanSettings;
  isHydrated: boolean;
  onboardingSeen: boolean;
  addScan: (scan: Omit<ScanRecord, "id" | "createdAt"> & Partial<Pick<ScanRecord, "id" | "createdAt">>) => ScanRecord;
  removeAll: () => void;
  updateSettings: (patch: Partial<ScanSettings>) => void;
  completeOnboarding: () => void;
  findScan: (id?: string) => ScanRecord | undefined;
};

const ScanContext = createContext<ScanContextValue | null>(null);

export function ScanProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<ScanRecord[]>(DEMO_HISTORY);
  const [settings, setSettings] = useState<ScanSettings>(DEFAULT_SETTINGS);
  const [onboardingSeen, setOnboardingSeen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([AsyncStorage.getItem(HISTORY_KEY), AsyncStorage.getItem(SETTINGS_KEY), AsyncStorage.getItem(ONBOARDING_KEY)])
      .then(([historyRaw, settingsRaw, onboardingRaw]) => {
        if (!mounted) return;
        if (historyRaw) setHistory(JSON.parse(historyRaw));
        if (settingsRaw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(settingsRaw) });
        if (onboardingRaw === "true") setOnboardingSeen(true);
        setIsHydrated(true);
      })
      .catch(() => setIsHydrated(true));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (isHydrated) void AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history, isHydrated]);

  useEffect(() => {
    if (isHydrated) void AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings, isHydrated]);

  const value = useMemo<ScanContextValue>(
    () => ({
      history,
      settings,
      isHydrated,
      onboardingSeen,
      addScan: (scan) => {
        const item: ScanRecord = {
          ...scan,
          id: scan.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: scan.createdAt ?? new Date().toISOString(),
        };
        setHistory((current) => [item, ...current.filter((existing) => existing.data !== item.data)].slice(0, 100));
        return item;
      },
      removeAll: () => setHistory([]),
      updateSettings: (patch) => setSettings((current) => ({ ...current, ...patch })),
      completeOnboarding: () => {
        setOnboardingSeen(true);
        void AsyncStorage.setItem(ONBOARDING_KEY, "true");
      },
      findScan: (id) => (id ? history.find((item) => item.id === id) : history[0]),
    }),
    [history, settings, isHydrated, onboardingSeen],
  );

  return <ScanContext.Provider value={value}>{children}</ScanContext.Provider>;
}

export function useScanStore() {
  const value = useContext(ScanContext);
  if (!value) throw new Error("useScanStore must be used within ScanProvider");
  return value;
}

export function formatScanTime(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  if (sameDay) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function isUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

export function isProductCode(value: string) {
  return /^\d{8,14}$/.test(value.trim());
}

export const BARCODE_TYPES = [
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "code128",
  "code39",
  "code93",
  "codabar",
  "itf14",
  "datamatrix",
  "pdf417",
  "aztec",
] as const;
