import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, StyleSheet, Text, View, type PressableProps, type ViewStyle } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { ScanMode } from "@/lib/scan-store";

export const palette = {
  canvas: "#FFFFFF",
  panel: "#FFFFFF",
  panelRaised: "#F4F0EA",
  border: "#D8D0C4",
  text: "#123B5A",
  muted: "#71808C",
  sand: "#D6C5B0",
  sandDim: "#EEE6DC",
  amber: "#B38347",
  danger: "#B54E54",
  purple: "#3F78A0",
  brand: "#123B5A",
  bankBlue: "#0B4F93",
  ivory: "#FFF7E8",
};

export function AppMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.mark, compact && styles.markCompact]} accessible accessibilityLabel="Doha Bank Scan Smart Scanner">
      <Svg width={compact ? 34 : 40} height={compact ? 34 : 40} viewBox="0 0 100 100">
        <Rect x="16" y="16" width="68" height="68" rx="18" fill={palette.panel} stroke={palette.border} strokeWidth="1.5" />
        <Path d="M30 20H23c-5 0-9 4-9 9v7M70 20h7c5 0 9 4 9 9v7M14 64v7c0 5 4 9 9 9h7M86 64v7c0 5-4 9-9 9h-7" fill="none" stroke={palette.sand} strokeWidth="4" strokeLinecap="round" />
        <Rect x="30" y="30" width="40" height="40" rx="9" fill={palette.bankBlue} />
        <Rect x="34" y="35" width="7" height="30" rx="3.5" fill={palette.sand} />
        <Path d="M41 35c17 0 26 6 26 15s-9 15-26 15v-5c11 0 18-3 18-10s-7-10-18-10z" fill={palette.ivory} />
        <Circle cx="50" cy="50" r="2.5" fill={palette.sand} />
      </Svg>
      {!compact && <View style={styles.wordmark}><Text style={styles.markText}>DOHA BANK SCAN</Text><Text style={styles.markSubtext}>Smart Scanner</Text></View>}
    </View>
  );
}

export function ModeSegmentedControl({ mode, onChange }: { mode: ScanMode; onChange: (mode: ScanMode) => void }) {
  return (
    <View style={styles.modeControl} accessibilityRole="tablist" accessibilityLabel="Scanner mode">
      {(["qr", "barcode"] as ScanMode[]).map((item) => {
        const selected = item === mode;
        return (
          <Pressable
            key={item}
            onPress={() => onChange(item)}
            style={[styles.modeOption, selected && styles.modeOptionActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={item === "qr" ? "QR mode" : "Barcode mode"}
            accessibilityHint={`Switch scanner to ${item === "qr" ? "QR codes" : "1D and 2D barcodes"}`}
          >
            <MaterialIcons name={item === "qr" ? "qr-code-2" : "view-week"} size={18} color={selected ? palette.brand : palette.muted} />
            <Text style={[styles.modeText, selected && styles.modeTextActive]}>{item === "qr" ? "QR" : "Barcode"}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ActionButton({ label, icon, onPress, variant = "secondary", style, ...props }: PressableProps & { label: string; icon: React.ComponentProps<typeof MaterialIcons>["name"]; variant?: "primary" | "secondary" | "ghost"; style?: ViewStyle }) {
  return (
    <Pressable
      {...props}
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, variant === "primary" && styles.actionPrimary, variant === "ghost" && styles.actionGhost, pressed && styles.pressed, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <MaterialIcons name={icon} size={19} color={variant === "primary" ? palette.brand : palette.text} />
      <Text style={[styles.actionText, variant === "primary" && styles.actionTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

export function StatusPill({ label, tone = "live", icon = "radio-button-checked" }: { label: string; tone?: "live" | "warning" | "danger" | "offline"; icon?: React.ComponentProps<typeof MaterialIcons>["name"] }) {
  const color = tone === "warning" ? palette.amber : tone === "danger" ? palette.danger : tone === "offline" ? palette.purple : palette.brand;
  return (
    <View style={styles.statusPill} accessibilityLabel={label} accessibilityRole="text">
      <MaterialIcons name={icon} size={12} color={color} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function EmptyState({ icon, title, detail }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; title: string; detail: string }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}><MaterialIcons name={icon} size={28} color={palette.brand} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDetail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { flexDirection: "row", alignItems: "center", gap: 10 },
  markCompact: { gap: 0 },
  wordmark: { gap: 1 },
  markText: { color: palette.brand, fontSize: 13, fontWeight: "900", letterSpacing: 1.6 },
  markSubtext: { color: palette.sand, fontSize: 8, fontWeight: "900", letterSpacing: 2.1 },
  modeControl: { flexDirection: "row", backgroundColor: palette.panel, borderRadius: 16, borderWidth: 1, borderColor: palette.border, padding: 4, gap: 4 },
  modeOption: { minHeight: 42, minWidth: 92, paddingHorizontal: 14, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  modeOptionActive: { backgroundColor: palette.sand },
  modeText: { color: palette.muted, fontSize: 13, fontWeight: "800", letterSpacing: 0.4 },
  modeTextActive: { color: palette.brand },
  actionButton: { minHeight: 52, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelRaised, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  actionPrimary: { backgroundColor: palette.sand, borderColor: palette.sand },
  actionGhost: { backgroundColor: "transparent", borderColor: "transparent" },
  actionText: { color: palette.text, fontSize: 14, fontWeight: "800" },
  actionTextPrimary: { color: palette.brand },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusText: { fontSize: 11, fontWeight: "800", letterSpacing: 1.3, textTransform: "uppercase" },
  sectionLabel: { color: palette.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.4, textTransform: "uppercase" },
  emptyState: { marginTop: 40, alignItems: "center", paddingHorizontal: 28 },
  emptyIcon: { width: 68, height: 68, borderRadius: 22, backgroundColor: palette.sandDim, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  emptyTitle: { color: palette.text, fontSize: 20, fontWeight: "800", textAlign: "center" },
  emptyDetail: { color: palette.muted, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 8 },
});
