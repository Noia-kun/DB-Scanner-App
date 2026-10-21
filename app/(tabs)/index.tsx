import { CameraView, scanFromURLAsync, useCameraPermissions, type BarcodeScanningResult, type BarcodeType } from "expo-camera";
import * as Clipboard from "expo-clipboard";
import { createAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActionButton, AppMark, ModeSegmentedControl, palette, StatusPill } from "@/components/scan-ui";
import { BARCODE_TYPES, useScanStore, type ScanMode } from "@/lib/scan-store";

const TUTORIAL = [
  { eyebrow: "01 / 03", title: "Center the code", detail: "Place a QR or barcode inside the sand frame. DBScan will detect it locally." },
  { eyebrow: "02 / 03", title: "Hold steady", detail: "A clean, even surface helps the decoder read tiny details in low light." },
  { eyebrow: "03 / 03", title: "Stay in control", detail: "Switch QR and Barcode modes at any time without leaving the viewfinder." },
];

let scanSuccessTone: ReturnType<typeof createAudioPlayer> | null = null;

function playScanSuccessTone() {
  if (Platform.OS === "web") return;
  try {
    scanSuccessTone ??= createAudioPlayer(require("@/assets/sounds/scan-success.wav"));
    scanSuccessTone.seekTo(0);
    scanSuccessTone.play();
  } catch {
    // Sound is an enhancement; a scan should still complete if the audio session is unavailable.
  }
}

type Feedback = "warmup" | "unrecognized" | "poor-lighting" | "offline";

export default function ScannerScreen() {
  const router = useRouter();
  const { mode: requestedMode } = useLocalSearchParams<{ mode?: ScanMode }>();
  const insets = useSafeAreaInsets();
  const { settings, addScan, completeOnboarding, onboardingSeen, isHydrated, history } = useScanStore();
  const [mode, setMode] = useState<ScanMode>(requestedMode === "qr" || requestedMode === "barcode" ? requestedMode : settings.defaultMode);
  const [permission, requestPermission] = useCameraPermissions();
  const [tutorialStep, setTutorialStep] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>("warmup");
  const [offline, setOffline] = useState(false);
  const [scanning, setScanning] = useState(false);
  const showTutorial = isHydrated && !onboardingSeen;

  useEffect(() => {
    const warmup = setTimeout(() => setFeedback(null), 1500);
    return () => clearTimeout(warmup);
  }, []);

  const isNativeCameraReady = Platform.OS !== "web" && permission?.granted === true;
  const isDenied = Platform.OS !== "web" && permission?.granted === false;
  const routeMode = requestedMode === "qr" || requestedMode === "barcode" ? requestedMode : null;
  const activeMode = routeMode ?? mode;
  const guidance = activeMode === "qr" ? "Align a square QR code inside the frame" : "Align the bars or matrix inside the frame";
  const countLabel = history.length === 1 ? "1 saved" : `${history.length} saved`;
  const barcodeTypes = useMemo(() => (activeMode === "qr" ? ["qr"] : BARCODE_TYPES) as BarcodeType[], [activeMode]);

  const finishOnboarding = () => {
    completeOnboarding();
  };

  const allowCamera = async () => {
    if (Platform.OS !== "web") await requestPermission();
    finishOnboarding();
  };

  const saveDecoded = async (data: string) => {
    const normalized = data.trim();
    if (!normalized) {
      setFeedback("unrecognized");
      setScanning(false);
      return;
    }
    if (settings.haptic) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (settings.sound) playScanSuccessTone();
    if (settings.autoCopy) await Clipboard.setStringAsync(normalized);
    const item = addScan({ data: normalized, mode: activeMode, type: activeMode === "qr" ? "QR code" : "Barcode" });
    setScanning(false);
    router.push({ pathname: "/result", params: { id: item.id } });
  };

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scanning) return;
    setScanning(true);
    void saveDecoded(data);
  };

  const demoScan = () => {
    void saveDecoded(mode === "qr" ? "https://scanly.app/launch" : "036000291452");
  };

  const importFromGallery = async () => {
    const permissionResponse = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResponse.granted) {
      setFeedback("unrecognized");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (result.canceled) return;
    try {
      const decoded = await scanFromURLAsync(result.assets[0].uri, barcodeTypes);
      if (decoded[0]?.data) await saveDecoded(decoded[0].data);
      else setFeedback("unrecognized");
    } catch {
      setFeedback("unrecognized");
    }
  };

  const setScannerMode = (nextMode: ScanMode) => {
    setMode(nextMode);
    router.setParams({ mode: undefined });
    setFeedback(null);
    setScanning(false);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
          <AppMark />
          <View style={styles.topActions}>
            <Pressable onPress={() => setOffline((current) => !current)} style={[styles.iconButton, offline && styles.iconButtonActive]} accessibilityRole="button" accessibilityLabel={offline ? "Turn offline mode off" : "Turn offline mode on"}>
              <MaterialIcons name={offline ? "cloud-off" : "cloud-queue"} size={20} color={offline ? palette.purple : palette.muted} />
            </Pressable>
            <Pressable onPress={() => router.push("/history")} style={styles.historyPill} accessibilityRole="button" accessibilityLabel={`Open scan history, ${countLabel}`}>
              <MaterialIcons name="history" size={18} color={palette.brand} />
              <Text style={styles.historyCount}>{countLabel}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>READY WHEN YOU ARE</Text>
          <Text style={styles.title}>Scan the signal.</Text>
          <Text style={styles.subtitle}>{guidance}</Text>
        </View>

        <View style={styles.modeRow}>
          <ModeSegmentedControl mode={activeMode} onChange={setScannerMode} />
          <StatusPill label={offline ? "Local only" : "Decoder live"} tone={offline ? "offline" : "live"} icon={offline ? "cloud-off" : "radio-button-checked"} />
        </View>

        <View style={styles.cameraShell}>
          {isNativeCameraReady ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              onBarcodeScanned={scanning ? undefined : handleBarcodeScanned}
              barcodeScannerSettings={{ barcodeTypes }}
              onCameraReady={() => setFeedback(null)}
            />
          ) : (
            <View style={styles.demoCamera}>
              <View style={styles.demoGlow} />
              <View style={styles.demoGrid} />
              <View style={styles.demoCode}>
                <View style={styles.demoCodeFinder} />
                <View style={[styles.demoCodeFinder, styles.demoCodeFinderRight]} />
                <View style={[styles.demoCodeFinder, styles.demoCodeFinderBottom]} />
                <View style={styles.demoCodeBars} />
              </View>
              <Text style={styles.demoHint}>{Platform.OS === "web" ? "Preview mode · tap demo scan" : "Camera permission required"}</Text>
            </View>
          )}

          <View style={styles.frame} pointerEvents="none">
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <View style={styles.scanLine} />
          </View>

          <View style={styles.cameraTopStatus}>
            <StatusPill label={feedback === "warmup" ? "Warming up" : isDenied ? "Permission needed" : "Back camera"} tone={feedback === "warmup" || isDenied ? "warning" : "live"} icon={feedback === "warmup" ? "hourglass-top" : isDenied ? "lock" : "camera-alt"} />
          </View>

          {feedback && feedback !== "warmup" && (
            <View style={styles.feedbackCard}>
              <MaterialIcons name={feedback === "offline" ? "cloud-off" : feedback === "poor-lighting" ? "light-mode" : "search-off"} size={20} color={feedback === "offline" ? palette.purple : palette.amber} />
              <View style={{ flex: 1 }}>
                <Text style={styles.feedbackTitle}>{feedback === "offline" ? "Offline, still scanning" : feedback === "poor-lighting" ? "More light will help" : "No readable code yet"}</Text>
                <Text style={styles.feedbackDetail}>{feedback === "offline" ? "Local decode is fully available without a connection." : feedback === "poor-lighting" ? "Move toward a brighter, even surface." : "Try moving closer or switch modes."}</Text>
              </View>
              <Pressable onPress={() => setFeedback(null)} accessibilityRole="button" accessibilityLabel="Dismiss scanner feedback"><MaterialIcons name="close" size={18} color={palette.muted} /></Pressable>
            </View>
          )}

          {isDenied && !showTutorial && (
            <View style={styles.permissionCard}>
              <MaterialIcons name="no-photography" size={28} color={palette.amber} />
              <Text style={styles.permissionTitle}>Camera access is off</Text>
              <Text style={styles.permissionDetail}>Allow access to scan live codes. Your camera stays on-device.</Text>
              <ActionButton label="Request camera access" icon="lock-open" variant="primary" onPress={allowCamera} />
            </View>
          )}
        </View>

        <View style={styles.bottomActions}>
          <ActionButton label="Gallery" icon="photo-library" onPress={() => void importFromGallery()} style={{ flex: 1, paddingHorizontal: 6 }} />
          <ActionButton label={Platform.OS === "web" ? "Demo scan" : "Tap to scan"} icon="center-focus-strong" variant="primary" onPress={demoScan} style={{ flex: 1, paddingHorizontal: 6 }} />
          <ActionButton label="Poor light" icon="light-mode" onPress={() => setFeedback("poor-lighting")} style={{ flex: 1, paddingHorizontal: 6 }} />
        </View>

        <View style={styles.footerRow}>
          <Pressable onPress={() => setFeedback("offline")} style={styles.footerLink} accessibilityRole="button" accessibilityLabel="Show offline scanning status">
            <MaterialIcons name="offline-bolt" size={17} color={palette.brand} />
            <Text style={styles.footerLinkText}>Works offline</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/settings")} style={styles.footerLink} accessibilityRole="button" accessibilityLabel="Open scanner settings">
            <MaterialIcons name="tune" size={17} color={palette.muted} />
            <Text style={styles.footerLinkTextMuted}>Tune scan</Text>
          </Pressable>
        </View>
      </ScrollView>

      {showTutorial && (
        <View style={styles.tutorialBackdrop}>
          <View style={[styles.tutorialSheet, { paddingBottom: Math.max(insets.bottom, 18) + 16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.tutorialHeader}>
              <Text style={styles.kicker}>QUICK START · 10 SEC</Text>
              <Pressable onPress={finishOnboarding} accessibilityRole="button" accessibilityLabel="Skip scanner tutorial"><Text style={styles.skipText}>Skip</Text></Pressable>
            </View>
            <View style={styles.tutorialIcon}><MaterialIcons name={tutorialStep === 0 ? "center-focus-strong" : tutorialStep === 1 ? "pan-tool" : "swap-horiz"} size={30} color={palette.brand} /></View>
            <Text style={styles.tutorialEyebrow}>{TUTORIAL[tutorialStep].eyebrow}</Text>
            <Text style={styles.tutorialTitle}>{TUTORIAL[tutorialStep].title}</Text>
            <Text style={styles.tutorialDetail}>{TUTORIAL[tutorialStep].detail}</Text>
            <View style={styles.tutorialDots}>{TUTORIAL.map((_, index) => <View key={index} style={[styles.tutorialDot, index === tutorialStep && styles.tutorialDotActive]} />)}</View>
            <ActionButton label={tutorialStep === TUTORIAL.length - 1 ? "Allow camera & start" : "Next"} icon={tutorialStep === TUTORIAL.length - 1 ? "camera-alt" : "arrow-forward"} variant="primary" onPress={() => tutorialStep === TUTORIAL.length - 1 ? void allowCamera() : setTutorialStep((step) => step + 1)} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas },
  topBar: { paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: palette.panel, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.border },
  iconButtonActive: { backgroundColor: "#E8F0F4", borderColor: "#7FA2B7" },
  historyPill: { minHeight: 42, borderRadius: 14, paddingHorizontal: 12, backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.border, flexDirection: "row", alignItems: "center", gap: 7 },
  historyCount: { color: palette.text, fontSize: 12, fontWeight: "800" },
  headerCopy: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 18 },
  kicker: { color: palette.brand, fontSize: 11, fontWeight: "900", letterSpacing: 1.7 },
  title: { color: palette.text, fontSize: 34, fontWeight: "900", letterSpacing: -1, marginTop: 7 },
  subtitle: { color: palette.muted, fontSize: 15, lineHeight: 22, marginTop: 7, maxWidth: 330 },
  modeRow: { paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 },
  cameraShell: { marginHorizontal: 20, aspectRatio: 0.86, borderRadius: 28, overflow: "hidden", backgroundColor: "#0A3553", borderWidth: 1, borderColor: palette.border, position: "relative" },
  demoCamera: { ...StyleSheet.absoluteFill, backgroundColor: "#0D4565", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  demoGlow: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "#185776", opacity: 0.85 },
  demoGrid: { ...StyleSheet.absoluteFill, opacity: 0.12, backgroundColor: "transparent", borderWidth: 1, borderColor: palette.sand },
  demoCode: { width: 128, height: 128, backgroundColor: "#F3E4C4", borderRadius: 10, position: "relative", alignItems: "center", justifyContent: "center" },
  demoCodeFinder: { position: "absolute", width: 28, height: 28, top: 12, left: 12, borderWidth: 5, borderColor: "#062B49", borderRadius: 3 },
  demoCodeFinderRight: { left: undefined, right: 12 },
  demoCodeFinderBottom: { top: undefined, bottom: 12 },
  demoCodeBars: { width: 30, height: 56, borderLeftWidth: 5, borderRightWidth: 5, borderColor: "#062B49", opacity: 0.8 },
  demoHint: { position: "absolute", bottom: 24, color: palette.brand, fontSize: 11, fontWeight: "800", letterSpacing: 1.1, textTransform: "uppercase" },
  frame: { ...StyleSheet.absoluteFill, margin: 38, borderRadius: 18 },
  corner: { position: "absolute", width: 32, height: 32, borderColor: palette.sand, borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 10 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 10 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 10 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 10 },
  scanLine: { position: "absolute", top: "48%", left: 0, right: 0, height: 2, backgroundColor: palette.sand, opacity: 0.65 },
  cameraTopStatus: { position: "absolute", top: 18, left: 18, right: 18, flexDirection: "row", justifyContent: "space-between" },
  feedbackCard: { position: "absolute", left: 14, right: 14, bottom: 14, borderRadius: 18, backgroundColor: "rgba(6,43,73,0.94)", borderWidth: 1, borderColor: palette.border, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  feedbackTitle: { color: palette.text, fontSize: 13, fontWeight: "800" },
  feedbackDetail: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  permissionCard: { position: "absolute", left: 18, right: 18, top: "31%", padding: 20, alignItems: "center", borderRadius: 22, backgroundColor: "rgba(6,43,73,0.95)", borderWidth: 1, borderColor: palette.amber },
  permissionTitle: { color: palette.text, fontSize: 17, fontWeight: "900", marginTop: 12 },
  permissionDetail: { color: palette.muted, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 7, marginBottom: 16 },
  bottomActions: { paddingHorizontal: 20, paddingTop: 16, flexDirection: "row", gap: 8 },
  footerRow: { paddingHorizontal: 22, paddingTop: 17, flexDirection: "row", justifyContent: "space-between" },
  footerLink: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  footerLinkText: { color: palette.brand, fontSize: 13, fontWeight: "800" },
  footerLinkTextMuted: { color: palette.muted, fontSize: 13, fontWeight: "700" },
  tutorialBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(1,19,32,0.72)", justifyContent: "flex-end", zIndex: 5 },
  tutorialSheet: { backgroundColor: palette.panel, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderTopWidth: 1, borderColor: palette.border, paddingHorizontal: 24, paddingTop: 12 },
  sheetHandle: { width: 42, height: 4, borderRadius: 4, backgroundColor: palette.border, alignSelf: "center", marginBottom: 20 },
  tutorialHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  skipText: { color: palette.muted, fontSize: 13, fontWeight: "800", padding: 6 },
  tutorialIcon: { width: 62, height: 62, borderRadius: 22, backgroundColor: palette.sand, alignItems: "center", justifyContent: "center", marginTop: 20 },
  tutorialEyebrow: { color: palette.brand, fontSize: 12, fontWeight: "900", letterSpacing: 1.2, marginTop: 20 },
  tutorialTitle: { color: palette.text, fontSize: 28, fontWeight: "900", marginTop: 7 },
  tutorialDetail: { color: palette.muted, fontSize: 15, lineHeight: 22, marginTop: 9, marginBottom: 20 },
  tutorialDots: { flexDirection: "row", gap: 6, marginBottom: 18 },
  tutorialDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.border },
  tutorialDotActive: { width: 22, backgroundColor: palette.sand },
});
