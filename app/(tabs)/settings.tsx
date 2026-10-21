import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { palette, SectionLabel } from "@/components/scan-ui";
import { useScanStore, type ScanMode } from "@/lib/scan-store";

function SettingRow({ icon, title, detail, children, onPress, danger = false }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; title: string; detail: string; children?: React.ReactNode; onPress?: () => void; danger?: boolean }) {
  return <Pressable onPress={onPress} style={styles.settingRow} accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={title} accessibilityHint={detail}>
    <View style={[styles.settingIcon, danger && styles.dangerIcon]}><MaterialIcons name={icon} size={20} color={danger ? palette.danger : palette.brand} /></View>
    <View style={styles.settingCopy}><Text style={[styles.settingTitle, danger && { color: palette.danger }]}>{title}</Text><Text style={styles.settingDetail}>{detail}</Text></View>
    {children}
  </Pressable>;
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, removeAll, history } = useScanStore();
  const [showModes, setShowModes] = useState(false);

  const clearHistory = () => {
    const clear = () => removeAll();
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm("Clear every saved scan from this device?")) clear();
    } else Alert.alert("Clear history?", "This removes every saved scan from DBScan.", [{ text: "Cancel", style: "cancel" }, { text: "Clear", style: "destructive", onPress: clear }]);
  };

  const feedbackToggle = (key: "haptic" | "sound" | "autoCopy") => {
    updateSettings({ [key]: !settings[key] });
    if (key === "haptic" && !settings.haptic) void Haptics.selectionAsync();
  };

  return <View style={styles.screen}><ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
    <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
      <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back to scanner"><MaterialIcons name="arrow-back" size={21} color={palette.text} /></Pressable>
      <View style={{ flex: 1, marginLeft: 14 }}><Text style={styles.kicker}>CONTROL ROOM</Text><Text style={styles.title}>Settings</Text></View>
      <Text style={styles.version}>v1.0</Text>
    </View>

    <View style={styles.intro}><Text style={styles.introTitle}>Make every scan feel right.</Text><Text style={styles.introDetail}>Tune the small details. DBScan keeps the defaults calm, local, and fast.</Text></View>

    <View style={styles.section}><SectionLabel>Scanner</SectionLabel><View style={styles.card}>
      <SettingRow icon="qr-code-2" title="Default scan mode" detail="Choose what opens first" onPress={() => setShowModes((value) => !value)}><View style={styles.valuePill}><Text style={styles.valueText}>{settings.defaultMode === "qr" ? "QR" : "Barcode"}</Text><MaterialIcons name="expand-more" size={18} color={palette.muted} /></View></SettingRow>
      {showModes && <View style={styles.modeChoices}>{(["qr", "barcode"] as ScanMode[]).map((mode) => <Pressable key={mode} onPress={() => { updateSettings({ defaultMode: mode }); setShowModes(false); }} style={[styles.modeChoice, settings.defaultMode === mode && styles.modeChoiceActive]} accessibilityRole="radio" accessibilityState={{ selected: settings.defaultMode === mode }}><MaterialIcons name={mode === "qr" ? "qr-code-2" : "view-week"} size={18} color={settings.defaultMode === mode ? palette.brand : palette.muted} /><Text style={[styles.modeChoiceText, settings.defaultMode === mode && { color: palette.brand }]}>{mode === "qr" ? "QR codes" : "1D / 2D barcodes"}</Text></Pressable>)}</View>}
      <SettingRow icon="vibration" title="Haptic feedback" detail="A quiet pulse confirms a read"><Switch value={settings.haptic} onValueChange={() => feedbackToggle("haptic")} trackColor={{ false: palette.border, true: palette.sandDim }} thumbColor={settings.haptic ? palette.sand : palette.muted} accessibilityLabel="Haptic feedback" /></SettingRow>
      <SettingRow icon="volume-up" title="Sound feedback" detail="Play a soft confirmation tone"><Switch value={settings.sound} onValueChange={() => feedbackToggle("sound")} trackColor={{ false: palette.border, true: palette.sandDim }} thumbColor={settings.sound ? palette.sand : palette.muted} accessibilityLabel="Sound feedback" /></SettingRow>
      <SettingRow icon="content-copy" title="Auto-copy result" detail="Copy decoded text as soon as it reads"><Switch value={settings.autoCopy} onValueChange={() => feedbackToggle("autoCopy")} trackColor={{ false: palette.border, true: palette.sandDim }} thumbColor={settings.autoCopy ? palette.sand : palette.muted} accessibilityLabel="Auto-copy result" /></SettingRow>
    </View></View>

    <View style={styles.section}><SectionLabel>Appearance</SectionLabel><View style={styles.card}><SettingRow icon="palette" title="Company theme" detail="Deep blue and sand beige highlights"><View style={styles.valuePill}><Text style={styles.valueText}>ON</Text><MaterialIcons name="check" size={18} color={palette.brand} /></View></SettingRow></View></View>

    <View style={styles.section}><SectionLabel>Data</SectionLabel><View style={styles.card}><SettingRow icon="delete-outline" title="Clear scan history" detail={`${history.length} saved result${history.length === 1 ? "" : "s"} on this device`} onPress={clearHistory} danger><MaterialIcons name="chevron-right" size={21} color={palette.muted} /></SettingRow></View></View>
    <Text style={styles.footer}>DBScan decodes locally. No scan leaves your device unless you choose to open or share it.</Text>
  </ScrollView></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas },
  topBar: { paddingHorizontal: 20, flexDirection: "row", alignItems: "center" },
  backButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panel, alignItems: "center", justifyContent: "center" },
  kicker: { color: palette.brand, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: palette.text, fontSize: 28, fontWeight: "900", marginTop: 4 },
  version: { color: palette.muted, fontSize: 12, fontWeight: "800" },
  intro: { paddingHorizontal: 20, paddingTop: 26, paddingBottom: 24 },
  introTitle: { color: palette.text, fontSize: 22, fontWeight: "900" },
  introDetail: { color: palette.muted, fontSize: 14, lineHeight: 21, marginTop: 7, maxWidth: 340 },
  section: { paddingHorizontal: 20, marginBottom: 24, gap: 10 },
  card: { borderRadius: 20, backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.border, overflow: "hidden" },
  settingRow: { minHeight: 78, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  settingIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: palette.sandDim, alignItems: "center", justifyContent: "center" },
  dangerIcon: { backgroundColor: "#4A2E34" },
  settingCopy: { flex: 1 },
  settingTitle: { color: palette.text, fontSize: 14, fontWeight: "900" },
  settingDetail: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  valuePill: { flexDirection: "row", alignItems: "center", gap: 2 },
  valueText: { color: palette.brand, fontSize: 12, fontWeight: "900" },
  modeChoices: { marginHorizontal: 14, marginBottom: 8, padding: 5, backgroundColor: palette.panelRaised, borderRadius: 14, gap: 4 },
  modeChoice: { minHeight: 42, borderRadius: 10, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 9 },
  modeChoiceActive: { backgroundColor: palette.sand },
  modeChoiceText: { color: palette.muted, fontSize: 13, fontWeight: "800" },
  footer: { color: palette.muted, fontSize: 12, lineHeight: 18, textAlign: "center", paddingHorizontal: 32, marginTop: 4 },
});
