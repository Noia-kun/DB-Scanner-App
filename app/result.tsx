import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionButton, palette, SectionLabel, StatusPill } from "@/components/scan-ui";
import { CompanyApiError, type CompanyItem, type ItemStatus, type MutationKind } from "@/lib/company-api";
import { useCompanyStore } from "@/lib/company-store";
import { formatScanTime, isProductCode, isUrl, useScanStore } from "@/lib/scan-store";

type LookupState = "loading" | "found" | "missing" | "unauthorized" | "offline" | "error";
type EditorMode = "add" | "location" | "info";

function confirmOverwrite(message: string) {
  if (Platform.OS === "web") return Promise.resolve(typeof window !== "undefined" && window.confirm(message));
  return new Promise<boolean>((resolve) => Alert.alert("Confirm overwrite", message, [{ text: "Cancel", style: "cancel", onPress: () => resolve(false) }, { text: "Overwrite", style: "destructive", onPress: () => resolve(true) }]));
}

function itemSnapshot(item: CompanyItem) {
  return { code: item.code, name: item.name, sku: item.sku, location: item.location, status: item.status };
}

export default function ResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { findScan } = useScanStore();
  const { session, companyOffline, syncStatus, syncMessage, queue, can, lookupItem, submitAction } = useCompanyStore();
  const scan = findScan(id) ?? findScan(undefined);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lookupState, setLookupState] = useState<LookupState>("loading");
  const [lookupMessage, setLookupMessage] = useState("Checking the company system…");
  const [companyItem, setCompanyItem] = useState<CompanyItem | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode | null>(null);
  const [form, setForm] = useState({ name: "", sku: "", location: "", status: "Active" as ItemStatus });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const runLookup = useCallback(() => {
    if (!scan) return;
    if (!session) {
      setLookupState("unauthorized");
      setLookupMessage("Sign in to look up this code in the company system.");
      return;
    }
    setLookupState("loading");
    setLookupMessage("Checking the company system…");
    void lookupItem(scan.data).then((item) => {
      setCompanyItem(item);
      setLookupState(item ? "found" : "missing");
      setLookupMessage(item ? "Matched in the company database." : "No item uses this code yet.");
    }).catch((error) => {
      setLookupState(error instanceof CompanyApiError && error.code === "NETWORK" ? "offline" : "error");
      setLookupMessage(error instanceof Error ? error.message : "Company lookup failed. Local scanning is still available.");
    });
  }, [lookupItem, scan, session]);

  useEffect(() => {
    const timer = setTimeout(runLookup, 0);
    return () => clearTimeout(timer);
  }, [runLookup]);

  const copy = async () => { if (!scan) return; try { await Clipboard.setStringAsync(scan.data); setActionError(null); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { setActionError("Could not copy this result. Try selecting the text instead."); } };
  const open = async () => { if (!scan) return; try { await Linking.openURL(scan.data); setActionError(null); } catch { setActionError("This link could not be opened on the current device."); } };
  const product = async () => { if (!scan) return; try { await Linking.openURL(`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(scan.data)}`); setActionError(null); } catch { setActionError("Product lookup needs a browser connection."); } };
  const share = async () => { if (!scan) return; try { await Share.share({ message: scan.data, title: "DBScan result" }); setActionError(null); } catch { setActionError("Sharing is unavailable right now. You can still copy the result."); } };

  const openEditor = (mode: EditorMode) => {
    setFormError(null);
    setEditorMode(mode);
    setForm({
      name: mode === "info" ? companyItem?.name ?? "" : "",
      sku: mode === "info" ? companyItem?.sku ?? "" : scan?.data ? `SCAN-${scan.data.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}` : "",
      location: mode === "location" || mode === "info" ? companyItem?.location ?? "" : "",
      status: mode === "info" ? companyItem?.status ?? "Active" : "Active",
    });
  };

  const submitEditor = async (force = false): Promise<void> => {
    if (!scan || !session || !editorMode) return;
    const kind: MutationKind = editorMode === "add" ? "add_item" : editorMode === "location" ? "update_location" : "edit_info";
    const payload = editorMode === "add" ? { name: form.name, sku: form.sku, location: form.location, status: form.status } : editorMode === "location" ? { location: form.location } : { name: form.name, sku: form.sku, location: form.location, status: form.status };
    if (editorMode !== "location" && (!form.name.trim() || !form.sku.trim())) {
      setFormError("Name and SKU are required.");
      return;
    }
    if (!form.location.trim()) {
      setFormError("Location is required.");
      return;
    }
    if (!force && editorMode !== "add") {
      const confirmed = await confirmOverwrite("Confirm replacing the current company item values with this edit?");
      if (!confirmed) return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const result = await submitAction({ kind, code: scan.data, itemId: companyItem?.id, mode: scan.mode, payload, oldValues: companyItem ? itemSnapshot(companyItem) : {}, expectedUpdatedAt: companyItem?.updatedAt, force });
      setCompanyItem(result.item);
      setLookupState("found");
      setLookupMessage(result.queued ? "Saved locally. This change is queued for company sync." : "Updated in the company system with an audit entry.");
      setEditorMode(null);
    } catch (error) {
      if (error instanceof CompanyApiError && error.code === "CONFLICT" && !force) {
        const overwrite = await confirmOverwrite("This item changed in the company dashboard. Overwrite those newer values with your edit?");
        if (overwrite) await submitEditor(true);
        return;
      }
      setFormError(error instanceof Error ? error.message : "Could not save this company change.");
    } finally {
      setSaving(false);
    }
  };

  if (!scan) return <View style={styles.screen}><Text style={styles.missing}>That scan is no longer in history.</Text><ActionButton label="Back to scanner" icon="center-focus-strong" variant="primary" onPress={() => router.replace("/")} /></View>;

  const syncLabel = syncStatus === "syncing" ? "Syncing" : syncStatus === "queued" ? `${queue.length} queued` : syncStatus === "error" ? "Review needed" : syncStatus === "offline" ? "Offline" : session ? "Synced" : "Local only";
  const syncTone = syncStatus === "error" ? "danger" : syncStatus === "offline" ? "offline" : syncStatus === "queued" ? "warning" : "live";
  const canMutate = can("staff");
  const canEdit = can("admin");

  return <View style={styles.screen}><ScrollView contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 20 }} showsVerticalScrollIndicator={false}>
    <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) + 4 }]}><Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Close scan result"><MaterialIcons name="close" size={22} color={palette.text} /></Pressable><View style={styles.topBarRight}><StatusPill label="Decoded" /><Text style={styles.time}>{formatScanTime(scan.createdAt)}</Text></View></View>
    <View style={styles.hero}><View style={[styles.resultIcon, scan.type === "QR code" ? styles.resultQr : styles.resultBar]}><MaterialIcons name={scan.type === "QR code" ? "qr-code-2" : "view-week"} size={40} color={palette.brand} /></View><Text style={styles.kicker}>{scan.type.toUpperCase()} · LOCAL READ</Text><Text style={styles.title}>Readable signal.</Text><Text style={styles.subtitle}>Choose what happens next. This result is saved to your on-device history.</Text></View>
    <View style={styles.resultCard} accessibilityLabel={`${scan.type} decoded result`} accessibilityRole="text"><View style={styles.resultCardHeader}><Text style={styles.resultCardLabel}>DECODED CONTENT</Text><Pressable onPress={copy} accessibilityRole="button" accessibilityLabel="Copy decoded content"><MaterialIcons name={copied ? "check" : "content-copy"} size={19} color={copied ? palette.brand : palette.muted} /></Pressable></View><Text style={styles.data} selectable>{scan.data}</Text>{isUrl(scan.data) && <View style={styles.urlRow}><MaterialIcons name="link" size={16} color={palette.brand} /><Text style={styles.urlHint}>Web link detected</Text></View>}{isProductCode(scan.data) && <View style={styles.urlRow}><MaterialIcons name="inventory-2" size={16} color={palette.amber} /><Text style={[styles.urlHint, { color: palette.amber }]}>Product code detected</Text></View>}</View>
    <View style={styles.primaryActions}><ActionButton label={copied ? "Copied" : "Copy result"} icon={copied ? "check" : "content-copy"} variant="primary" onPress={copy} style={{ flex: 1 }} />{isUrl(scan.data) && <ActionButton label="Open link" icon="open-in-new" onPress={open} style={{ flex: 1 }} />}</View>
    <View style={styles.secondaryActions}><ActionButton label="Share" icon="share" onPress={share} style={{ flex: 1 }} />{isProductCode(scan.data) && <ActionButton label="Product lookup" icon="shopping-bag" onPress={product} style={{ flex: 1 }} />}</View>
    {actionError && <Text style={styles.actionError} accessibilityRole="alert">{actionError}</Text>}

    <View style={styles.companyHeader}><View><SectionLabel>Company system</SectionLabel><Text style={styles.companyTitle}>Inventory match</Text></View><StatusPill label={syncLabel} tone={syncTone} /></View>
    <View style={styles.companyCard}>
      {lookupState === "loading" && <View style={styles.companyMessage}><MaterialIcons name="sync" size={24} color={palette.brand} /><Text style={styles.companyMessageTitle}>Checking company records…</Text><Text style={styles.companyMessageDetail}>The local scan is already saved. We are looking for a matching item.</Text></View>}
      {lookupState === "unauthorized" && <View style={styles.companyMessage}><MaterialIcons name="lock-outline" size={24} color={palette.brand} /><Text style={styles.companyMessageTitle}>Sign in to look up this item</Text><Text style={styles.companyMessageDetail}>Scanning remains available offline. Company lookup needs an employee session.</Text><ActionButton label="Sign in" icon="login" variant="primary" onPress={() => router.push("/login")} style={styles.companyCta} /></View>}
      {(lookupState === "offline" || (companyOffline && lookupState === "error")) && <View style={styles.companyMessage}><MaterialIcons name="cloud-off" size={24} color={palette.purple} /><Text style={styles.companyMessageTitle}>Company system offline</Text><Text style={styles.companyMessageDetail}>{lookupMessage} Local scanning and queued updates still work.</Text><ActionButton label="Try again" icon="refresh" onPress={runLookup} style={styles.companyCta} /></View>}
      {lookupState === "error" && !companyOffline && <View style={styles.companyMessage}><MaterialIcons name="error-outline" size={24} color={palette.danger} /><Text style={styles.companyMessageTitle}>Lookup needs attention</Text><Text style={styles.companyMessageDetail}>{lookupMessage}</Text><ActionButton label="Retry lookup" icon="refresh" onPress={runLookup} style={styles.companyCta} /></View>}
      {lookupState === "missing" && <View style={styles.companyMessage}><MaterialIcons name="inventory-2" size={24} color={palette.brand} /><Text style={styles.companyMessageTitle}>Not in the company system</Text><Text style={styles.companyMessageDetail}>Add a new item with this scanned code pre-filled, or return to the scanner.</Text>{canMutate ? <ActionButton label="Add new item" icon="add-box" variant="primary" onPress={() => openEditor("add")} style={styles.companyCta} /> : <Text style={styles.roleHint}>Viewer role is read-only. Ask a staff or admin employee to add it.</Text>}</View>}
      {lookupState === "found" && companyItem && <><View style={styles.itemHeader}><View style={styles.itemBadge}><MaterialIcons name="inventory-2" size={20} color={palette.brand} /></View><View style={{ flex: 1 }}><Text style={styles.itemName}>{companyItem.name}</Text><Text style={styles.itemSku}>{companyItem.sku}</Text></View><StatusPill label={companyItem.status} tone={companyItem.status === "Active" ? "live" : "warning"} /></View><View style={styles.detailGrid}><View style={styles.detailCell}><Text style={styles.detailLabel}>LOCATION</Text><Text style={styles.detailValue}>{companyItem.location}</Text></View><View style={styles.detailCell}><Text style={styles.detailLabel}>LAST UPDATED</Text><Text style={styles.detailValue}>{formatScanTime(companyItem.updatedAt)}</Text></View><View style={styles.detailCell}><Text style={styles.detailLabel}>UPDATED BY</Text><Text style={styles.detailValue}>{companyItem.updatedBy}</Text></View></View>{companyItem.pendingSync && <Text style={styles.pendingNote}>Saved locally and queued for company sync. It will not be dropped.</Text>}<View style={styles.companyActions}><ActionButton label="Update location" icon="place" onPress={() => openEditor("location")} disabled={!canMutate} style={{ flex: 1, paddingHorizontal: 8, opacity: canMutate ? 1 : 0.46 }} /><ActionButton label="Edit info" icon="edit" onPress={() => openEditor("info")} disabled={!canEdit} style={{ flex: 1, paddingHorizontal: 8, opacity: canEdit ? 1 : 0.46 }} /></View></>}
      <Text style={styles.syncDetail}>{syncMessage}</Text>
    </View>

    <View style={styles.recovery}><Text style={styles.recoveryLabel}>NOT THE RIGHT RESULT?</Text><Pressable onPress={() => router.replace("/")} style={styles.retryButton} accessibilityRole="button" accessibilityLabel="Retry scanning in the camera"><MaterialIcons name="refresh" size={18} color={palette.brand} /><Text style={styles.retryText}>Scan another code</Text></Pressable><Pressable onPress={() => router.replace({ pathname: "/", params: { mode: scan.mode === "qr" ? "barcode" : "qr" } })} style={styles.retryButton} accessibilityRole="button" accessibilityLabel="Try the other scanner mode"><MaterialIcons name="swap-horiz" size={18} color={palette.muted} /><Text style={styles.retryMuted}>Try {scan.mode === "qr" ? "Barcode" : "QR"} mode</Text></Pressable></View>
  </ScrollView>
  <Modal visible={editorMode !== null} animationType="slide" transparent onRequestClose={() => setEditorMode(null)}><View style={styles.modalBackdrop}><View style={styles.editorCard}><View style={styles.editorHeader}><View><Text style={styles.editorKicker}>{editorMode === "add" ? "NEW ITEM" : editorMode === "location" ? "LOCATION" : "ITEM INFO"}</Text><Text style={styles.editorTitle}>{editorMode === "add" ? "Add company item" : editorMode === "location" ? "Update location" : "Edit item info"}</Text></View><Pressable onPress={() => setEditorMode(null)} style={styles.modalClose} accessibilityRole="button" accessibilityLabel="Close editor"><MaterialIcons name="close" size={20} color={palette.text} /></Pressable></View>{editorMode !== "location" && <><Text style={styles.fieldLabel}>Name</Text><TextInput value={form.name} onChangeText={(value) => setForm((current) => ({ ...current, name: value }))} style={styles.fieldInput} placeholder="Item name" placeholderTextColor={palette.muted} accessibilityLabel="Item name" /><Text style={styles.fieldLabel}>SKU</Text><TextInput value={form.sku} onChangeText={(value) => setForm((current) => ({ ...current, sku: value }))} style={styles.fieldInput} placeholder="SKU" placeholderTextColor={palette.muted} accessibilityLabel="Item SKU" /></>}<Text style={styles.fieldLabel}>Location</Text><TextInput value={form.location} onChangeText={(value) => setForm((current) => ({ ...current, location: value }))} style={styles.fieldInput} placeholder="Building · floor · room" placeholderTextColor={palette.muted} accessibilityLabel="Item location" />{editorMode !== "location" && <><Text style={styles.fieldLabel}>Status</Text><View style={styles.statusChoices}>{(["Active", "Quarantined", "Retired"] as ItemStatus[]).map((status) => <Pressable key={status} onPress={() => setForm((current) => ({ ...current, status }))} style={[styles.statusChoice, form.status === status && styles.statusChoiceActive]} accessibilityRole="radio" accessibilityState={{ selected: form.status === status }}><Text style={[styles.statusChoiceText, form.status === status && styles.statusChoiceTextActive]}>{status}</Text></Pressable>)}</View></>}{formError && <Text style={styles.formError} accessibilityRole="alert">{formError}</Text>}<Text style={styles.auditHint}>Your employee ID, timestamp, old values, and new values will be recorded.</Text><ActionButton label={saving ? "Saving…" : "Save change"} icon="save" variant="primary" onPress={() => void submitEditor()} disabled={saving} style={{ marginTop: 16 }} /></View></View></Modal>
  </View>;
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
  companyHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 30, marginBottom: 10 },
  companyTitle: { color: palette.text, fontSize: 21, fontWeight: "900", marginTop: 4 },
  companyCard: { backgroundColor: palette.panel, borderRadius: 22, borderWidth: 1, borderColor: palette.border, padding: 16 },
  companyMessage: { alignItems: "center", paddingVertical: 12 },
  companyMessageTitle: { color: palette.text, fontSize: 17, fontWeight: "900", marginTop: 10, textAlign: "center" },
  companyMessageDetail: { color: palette.muted, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 6, maxWidth: 300 },
  companyCta: { marginTop: 16, minWidth: 180 },
  roleHint: { color: palette.muted, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 16 },
  itemHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemBadge: { width: 42, height: 42, borderRadius: 14, backgroundColor: palette.sandDim, alignItems: "center", justifyContent: "center" },
  itemName: { color: palette.text, fontSize: 16, fontWeight: "900" },
  itemSku: { color: palette.muted, fontSize: 12, marginTop: 3 },
  detailGrid: { borderTopWidth: 1, borderTopColor: palette.border, marginTop: 16, paddingTop: 14, gap: 12 },
  detailCell: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  detailLabel: { color: palette.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  detailValue: { color: palette.text, fontSize: 13, fontWeight: "800", textAlign: "right", flex: 1 },
  pendingNote: { color: palette.amber, fontSize: 12, lineHeight: 18, marginTop: 14 },
  companyActions: { flexDirection: "row", gap: 8, marginTop: 16 },
  syncDetail: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 14 },
  recovery: { marginTop: 34, paddingTop: 22, borderTopWidth: 1, borderTopColor: palette.border, gap: 2 },
  recoveryLabel: { color: palette.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1.4, marginBottom: 9 },
  retryButton: { minHeight: 45, borderRadius: 13, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 10 },
  retryText: { color: palette.brand, fontSize: 14, fontWeight: "900" },
  retryMuted: { color: palette.muted, fontSize: 14, fontWeight: "800" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(18,59,90,0.26)" },
  editorCard: { backgroundColor: palette.panel, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 },
  editorHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  editorKicker: { color: palette.brand, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  editorTitle: { color: palette.text, fontSize: 24, fontWeight: "900", marginTop: 4 },
  modalClose: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, borderColor: palette.border, alignItems: "center", justifyContent: "center" },
  fieldLabel: { color: palette.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1.2, textTransform: "uppercase", marginTop: 11 },
  fieldInput: { minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelRaised, color: palette.text, paddingHorizontal: 13, fontSize: 14, marginTop: 6 },
  statusChoices: { flexDirection: "row", gap: 8, marginTop: 7 },
  statusChoice: { minHeight: 38, borderRadius: 11, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  statusChoiceActive: { backgroundColor: palette.sand, borderColor: palette.sand },
  statusChoiceText: { color: palette.muted, fontSize: 12, fontWeight: "800" },
  statusChoiceTextActive: { color: palette.brand },
  formError: { color: palette.danger, fontSize: 12, lineHeight: 18, marginTop: 12 },
  auditHint: { color: palette.muted, fontSize: 11, lineHeight: 17, marginTop: 13 },
});
