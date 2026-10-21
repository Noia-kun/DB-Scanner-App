import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActionButton, palette, StatusPill } from "@/components/scan-ui";
import { formatScanTime, isProductCode, isUrl, useScanStore } from "@/lib/scan-store";

export default function ResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { findScan } = useScanStore();
  const scan = findScan(id) ?? findScan(undefined);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!scan) return <View style={styles.screen}><Text style={styles.missing}>That scan is no longer in history.</Text><ActionButton label="Back to scanner" icon="center-focus-strong" variant="primary" onPress={() => router.replace("/")} /></View>;

  const copy = async () => { try { await Clipboard.setStringAsync(scan.data); setActionError(null); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { setActionError("Could not copy this result. Try selecting the text instead."); } };
  const open = async () => { try { await Linking.openURL(scan.data); setActionError(null); } catch { setActionError("This link could not be opened on the current device."); } };
  const product = async () => { try { await Linking.openURL(`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(scan.data)}`); setActionError(null); } catch { setActionError("Product lookup needs a browser connection."); } };
  const share = async () => { try { await Share.share({ message: scan.data, title: "DBScan result" }); setActionError(null); } catch { setActionError("Sharing is unavailable right now. You can still copy the result."); } };

  return <View style={styles.screen}><ScrollView contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 20 }} showsVerticalScrollIndicator={false}>
    <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) + 4 }]}><Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Close scan result"><MaterialIcons name="close" size={22} color={palette.text} /></Pressable><View style={styles.topBarRight}><StatusPill label="Decoded" /><Text style={styles.time}>{formatScanTime(scan.createdAt)}</Text></View></View>
    <View style={styles.hero}><View style={[styles.resultIcon, scan.type === "QR code" ? styles.resultQr : styles.resultBar]}><MaterialIcons name={scan.type === "QR code" ? "qr-code-2" : "view-week"} size={40} color={palette.brand} /></View><Text style={styles.kicker}>{scan.type.toUpperCase()} · LOCAL READ</Text><Text style={styles.title}>Readable signal.</Text><Text style={styles.subtitle}>Choose what happens next. This result is saved to your on-device history.</Text></View>
    <View style={styles.resultCard} accessibilityLabel={`${scan.type} decoded result`} accessibilityRole="text"><View style={styles.resultCardHeader}><Text style={styles.resultCardLabel}>DECODED CONTENT</Text><Pressable onPress={copy} accessibilityRole="button" accessibilityLabel="Copy decoded content"><MaterialIcons name={copied ? "check" : "content-copy"} size={19} color={copied ? palette.brand : palette.muted} /></Pressable></View><Text style={styles.data} selectable>{scan.data}</Text>{isUrl(scan.data) && <View style={styles.urlRow}><MaterialIcons name="link" size={16} color={palette.brand} /><Text style={styles.urlHint}>Web link detected</Text></View>}{isProductCode(scan.data) && <View style={styles.urlRow}><MaterialIcons name="inventory-2" size={16} color={palette.amber} /><Text style={[styles.urlHint, { color: palette.amber }]}>Product code detected</Text></View>}</View>
    <View style={styles.primaryActions}><ActionButton label={copied ? "Copied" : "Copy result"} icon={copied ? "check" : "content-copy"} variant="primary" onPress={copy} style={{ flex: 1 }} />{isUrl(scan.data) && <ActionButton label="Open link" icon="open-in-new" onPress={open} style={{ flex: 1 }} />}</View>
    <View style={styles.secondaryActions}><ActionButton label="Share" icon="share" onPress={share} style={{ flex: 1 }} />{isProductCode(scan.data) && <ActionButton label="Product lookup" icon="shopping-bag" onPress={product} style={{ flex: 1 }} />}</View>
    {actionError && <Text style={styles.actionError} accessibilityRole="alert">{actionError}</Text>}
    <View style={styles.recovery}><Text style={styles.recoveryLabel}>NOT THE RIGHT RESULT?</Text><Pressable onPress={() => router.replace("/")} style={styles.retryButton} accessibilityRole="button" accessibilityLabel="Retry scanning in the camera"><MaterialIcons name="refresh" size={18} color={palette.brand} /><Text style={styles.retryText}>Scan another code</Text></Pressable><Pressable onPress={() => router.replace({ pathname: "/", params: { mode: scan.mode === "qr" ? "barcode" : "qr" } })} style={styles.retryButton} accessibilityRole="button" accessibilityLabel="Try the other scanner mode"><MaterialIcons name="swap-horiz" size={18} color={palette.muted} /><Text style={styles.retryMuted}>Try {scan.mode === "qr" ? "Barcode" : "QR"} mode</Text></Pressable></View>
  </ScrollView></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas, paddingHorizontal: 20 },
  missing: { color: palette.text, fontSize: 18, fontWeight: "800", marginTop: 100, textAlign: "center", marginBottom: 20 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panel, alignItems: "center", justifyContent: "center" },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: 13 },
  time: { color: palette.muted, fontSize: 12, fontWeight: "700" },
  hero: { alignItems: "center", paddingTop: 28, paddingBottom: 24 },
  resultIcon: { width: 84, height: 84, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  resultQr: { backgroundColor: palette.sand },
  resultBar: { backgroundColor: palette.amber },
  kicker: { color: palette.brand, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: palette.text, fontSize: 32, fontWeight: "900", marginTop: 8 },
  subtitle: { color: palette.muted, fontSize: 14, lineHeight: 21, textAlign: "center", maxWidth: 320, marginTop: 8 },
  resultCard: { padding: 18, borderRadius: 22, backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.border },
  resultCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resultCardLabel: { color: palette.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  data: { color: palette.text, fontSize: 19, lineHeight: 28, fontWeight: "800", marginTop: 18 },
  urlRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16 },
  urlHint: { color: palette.brand, fontSize: 12, fontWeight: "800" },
  primaryActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  secondaryActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  actionError: { color: palette.danger, fontSize: 12, lineHeight: 18, marginTop: 10 },
  recovery: { marginTop: 34, paddingTop: 22, borderTopWidth: 1, borderTopColor: palette.border, gap: 2 },
  recoveryLabel: { color: palette.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1.4, marginBottom: 9 },
  retryButton: { minHeight: 45, borderRadius: 13, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 10 },
  retryText: { color: palette.brand, fontSize: 14, fontWeight: "900" },
  retryMuted: { color: palette.muted, fontSize: 14, fontWeight: "800" },
});
