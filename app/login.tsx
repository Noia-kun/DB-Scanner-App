import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionButton, AppMark, palette, StatusPill } from "@/components/scan-ui";
import { MOCK_EMPLOYEE_HINTS } from "@/lib/company-api";
import { useCompanyStore } from "@/lib/company-store";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { apiDescription, apiMode, authLoading, signIn } = useCompanyStore();
  const [identifier, setIdentifier] = useState("staff@company.test");
  const [password, setPassword] = useState("staff123");
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setError(null);
    try {
      await signIn(identifier, password);
      if (router.canGoBack()) router.back();
      else router.replace("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign-in failed. Try again.");
    }
  };
  return <View style={styles.screen}><ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
    <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) + 4 }]}><Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back"><MaterialIcons name="arrow-back" size={21} color={palette.text} /></Pressable><StatusPill label={apiMode === "mock" ? "Preview mode" : "Company API"} tone={apiMode === "mock" ? "warning" : "live"} /></View>
    <View style={styles.hero}><AppMark compact /><Text style={styles.kicker}>COMPANY SYSTEM</Text><Text style={styles.title}>Sign in to sync.</Text><Text style={styles.subtitle}>Use your existing employee account to look up items and attribute every change.</Text></View>
    <View style={styles.card}><Text style={styles.label}>Employee email</Text><TextInput value={identifier} onChangeText={setIdentifier} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="you@company.com" placeholderTextColor={palette.muted} style={styles.input} accessibilityLabel="Employee email" /><Text style={[styles.label, { marginTop: 16 }]}>Password</Text><TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" placeholderTextColor={palette.muted} style={styles.input} accessibilityLabel="Employee password" />{error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}<ActionButton label={authLoading ? "Signing in…" : "Sign in"} icon="login" variant="primary" onPress={() => void submit()} disabled={authLoading || !identifier.trim() || !password} style={{ marginTop: 20 }} /></View>
    <View style={styles.infoCard}><View style={styles.infoHeader}><MaterialIcons name="swap-vertical-circle" size={20} color={palette.brand} /><Text style={styles.infoTitle}>{apiDescription}</Text></View><Text style={styles.infoDetail}>{apiMode === "mock" ? "The real API base URL and auth method are not configured yet. These Preview accounts exercise the same role and sync flows." : "Requests use the configured company API adapter. Tokens never appear in the UI."}</Text>{apiMode === "mock" && <View style={styles.hints}>{MOCK_EMPLOYEE_HINTS.map((hint) => <Pressable key={hint.identifier} onPress={() => { setIdentifier(hint.identifier); setPassword(hint.password); }} style={styles.hint} accessibilityRole="button" accessibilityLabel={`Use ${hint.role} Preview account`}><Text style={styles.hintRole}>{hint.role}</Text><Text style={styles.hintEmail}>{hint.identifier}</Text><Text style={styles.hintPassword}>{hint.password}</Text></Pressable>)}</View>}</View>
  </ScrollView></View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas, paddingHorizontal: 20 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  backButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panel, alignItems: "center", justifyContent: "center" },
  hero: { alignItems: "center", paddingTop: 36, paddingBottom: 28 },
  kicker: { color: palette.brand, fontSize: 10, fontWeight: "900", letterSpacing: 1.5, marginTop: 20 },
  title: { color: palette.text, fontSize: 31, fontWeight: "900", marginTop: 8 },
  subtitle: { color: palette.muted, fontSize: 14, lineHeight: 21, textAlign: "center", maxWidth: 330, marginTop: 8 },
  card: { backgroundColor: palette.panel, borderRadius: 22, borderWidth: 1, borderColor: palette.border, padding: 18 },
  label: { color: palette.muted, fontSize: 11, fontWeight: "900", letterSpacing: 1.2, textTransform: "uppercase" },
  input: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelRaised, paddingHorizontal: 14, color: palette.text, fontSize: 15, marginTop: 8 },
  error: { color: palette.danger, fontSize: 13, lineHeight: 19, marginTop: 12 },
  infoCard: { backgroundColor: palette.ivory, borderRadius: 20, padding: 16, marginTop: 16, borderWidth: 1, borderColor: palette.sandDim },
  infoHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoTitle: { color: palette.brand, fontSize: 13, fontWeight: "900" },
  infoDetail: { color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 8 },
  hints: { gap: 8, marginTop: 14 },
  hint: { minHeight: 48, borderRadius: 13, backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.sandDim, paddingHorizontal: 11, justifyContent: "center" },
  hintRole: { color: palette.brand, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 },
  hintEmail: { color: palette.text, fontSize: 12, fontWeight: "800", marginTop: 2 },
  hintPassword: { color: palette.muted, fontSize: 11, marginTop: 1 },
});
