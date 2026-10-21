import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, StyleSheet, Text, View, type PressableProps, type ViewStyle } from "react-native";
import type { ScanMode } from "@/lib/scan-store";

export const palette = {
  canvas: "#062B49",
  panel: "#0B3A5B",
  panelRaised: "#114866",
  border: "#2C5F79",
  text: "#FFF7E8",
  muted: "#B7C8D3",
  mint: "#E8D4AE",
  mintDim: "#735D38",
  amber: "#F2C57C",
  danger: "#FF8B7E",
  purple: "#9DC5DE",
};

export function AppMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.mark, compact && styles.markCompact]} accessible accessibilityLabel="DBScan">
      <View style={styles.markCornerTop} />
      <View style={styles.markCornerBottom} />
      {!compact && <Text style={styles.markText}>DBSCAN</Text>}
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
            <MaterialIcons name={item === "qr" ? "qr-code-2" : "view-week"} size={18} color={selected ? palette.canvas : palette.muted} />
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
      <MaterialIcons name={icon} size={19} color={variant === "primary" ? palette.canvas : palette.text} />
      <Text style={[styles.actionText, variant === "primary" && styles.actionTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

export function StatusPill({ label, tone = "live", icon = "radio-button-checked" }: { label: string; tone?: "live" | "warning" | "danger" | "offline"; icon?: React.ComponentProps<typeof MaterialIcons>["name"] }) {
  const color = tone === "warning" ? palette.amber : tone === "danger" ? palette.danger : tone === "offline" ? palette.purple : palette.mint;
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
      <View style={styles.emptyIcon}><MaterialIcons name={icon} size={28} color={palette.mint} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDetail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { flexDirection: "row", alignItems: "center", gap: 10 },
  markCompact: { gap: 0 },
  markCornerTop: { width: 16, height: 16, borderTopWidth: 3, borderLeftWidth: 3, borderColor: palette.mint, borderRadius: 3 },
  markCornerBottom: { position: "absolute", left: 9, top: 9, width: 16, height: 16, borderBottomWidth: 3, borderRightWidth: 3, borderColor: palette.mint, borderRadius: 3 },
  markText: { color: palette.text, fontSize: 14, fontWeight: "800", letterSpacing: 3 },
  modeControl: { flexDirection: "row", backgroundColor: palette.panel, borderRadius: 16, borderWidth: 1, borderColor: palette.border, padding: 4, gap: 4 },
  modeOption: { minHeight: 42, minWidth: 92, paddingHorizontal: 14, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  modeOptionActive: { backgroundColor: palette.mint },
  modeText: { color: palette.muted, fontSize: 13, fontWeight: "800", letterSpacing: 0.4 },
  modeTextActive: { color: palette.canvas },
  actionButton: { minHeight: 52, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelRaised, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  actionPrimary: { backgroundColor: palette.mint, borderColor: palette.mint },
  actionGhost: { backgroundColor: "transparent", borderColor: "transparent" },
  actionText: { color: palette.text, fontSize: 14, fontWeight: "800" },
  actionTextPrimary: { color: palette.canvas },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusText: { fontSize: 11, fontWeight: "800", letterSpacing: 1.3, textTransform: "uppercase" },
  sectionLabel: { color: palette.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.4, textTransform: "uppercase" },
  emptyState: { marginTop: 40, alignItems: "center", paddingHorizontal: 28 },
  emptyIcon: { width: 68, height: 68, borderRadius: 22, backgroundColor: palette.mintDim, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  emptyTitle: { color: palette.text, fontSize: 20, fontWeight: "800", textAlign: "center" },
  emptyDetail: { color: palette.muted, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 8 },
});
