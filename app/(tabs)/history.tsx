import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState, palette, SectionLabel, StatusPill } from "@/components/scan-ui";
import { formatScanTime, useScanStore, type DateFilter, type ScanKind } from "@/lib/scan-store";

const SESSION_REFERENCE_TIME = Date.now();

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { history } = useScanStore();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ScanKind>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const filtered = useMemo(() => {
    const now = new Date(SESSION_REFERENCE_TIME);
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime();
    return history.filter((item) => {
      const matchesQuery = !query.trim() || `${item.data} ${item.type}`.toLowerCase().includes(query.toLowerCase());
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const createdAt = new Date(item.createdAt).getTime();
      const matchesDate = dateFilter === "all" || (dateFilter === "today" ? createdAt >= startToday : createdAt >= startOfWeek);
      return matchesQuery && matchesType && matchesDate;
    });
  }, [dateFilter, history, query, typeFilter]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back to scanner"><MaterialIcons name="arrow-back" size={21} color={palette.text} /></Pressable>
          <View style={{ flex: 1, marginLeft: 14 }}><Text style={styles.kicker}>LOCAL ARCHIVE</Text><Text style={styles.title}>Scan history</Text></View>
          <StatusPill label={`${history.length} total`} />
        </View>

        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={21} color={palette.muted} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search a result or type" placeholderTextColor={palette.muted} style={styles.searchInput} accessibilityLabel="Search scan history" />
          {query.length > 0 && <Pressable onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel="Clear search"><MaterialIcons name="close" size={18} color={palette.muted} /></Pressable>}
        </View>

        <View style={styles.filterBlock}>
          <SectionLabel>Code type</SectionLabel>
          <View style={styles.filterRow}>{(["all", "QR code", "Barcode"] as const).map((filter) => <Pressable key={filter} onPress={() => setTypeFilter(filter)} style={[styles.filterChip, typeFilter === filter && styles.filterChipActive]} accessibilityRole="button" accessibilityState={{ selected: typeFilter === filter }}><Text style={[styles.filterText, typeFilter === filter && styles.filterTextActive]}>{filter === "all" ? "All" : filter}</Text></Pressable>)}</View>
          <SectionLabel>Date</SectionLabel>
          <View style={styles.filterRow}>{(["all", "today", "week"] as DateFilter[]).map((filter) => <Pressable key={filter} onPress={() => setDateFilter(filter)} style={[styles.filterChip, dateFilter === filter && styles.filterChipActive]} accessibilityRole="button" accessibilityState={{ selected: dateFilter === filter }}><Text style={[styles.filterText, dateFilter === filter && styles.filterTextActive]}>{filter === "all" ? "Any time" : filter === "today" ? "Today" : "This week"}</Text></Pressable>)}</View>
        </View>

        {history.length === 0 ? <EmptyState icon="history" title="Your archive is clear" detail="Scanned codes will appear here. History stays on this device and works offline." /> : filtered.length === 0 ? <EmptyState icon="manage-search" title="Nothing matches" detail="Try a different keyword or reset one of the filters." /> : <View style={styles.list}>{filtered.map((item) => <Pressable key={item.id} onPress={() => router.push({ pathname: "/result", params: { id: item.id } })} style={({ pressed }) => [styles.historyCard, pressed && { opacity: 0.75 }]} accessibilityRole="button" accessibilityLabel={`Open ${item.type}, ${item.data}`} accessibilityHint="Double tap to view result actions">
          <View style={[styles.typeIcon, item.type === "QR code" ? styles.qrIcon : styles.barcodeIcon]}><MaterialIcons name={item.type === "QR code" ? "qr-code-2" : "view-week"} size={22} color={palette.canvas} /></View>
          <View style={styles.itemCopy}><View style={styles.itemMeta}><Text style={styles.itemType}>{item.type}</Text><Text style={styles.itemTime}>{formatScanTime(item.createdAt)}</Text></View><Text style={styles.itemData} numberOfLines={2}>{item.data}</Text></View>
          <MaterialIcons name="chevron-right" size={21} color={palette.muted} />
        </Pressable>)}</View>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas },
  topBar: { paddingHorizontal: 20, flexDirection: "row", alignItems: "center" },
  backButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panel, alignItems: "center", justifyContent: "center" },
  kicker: { color: palette.mint, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: palette.text, fontSize: 28, fontWeight: "900", marginTop: 4 },
  searchBox: { margin: 20, marginTop: 24, minHeight: 54, borderRadius: 16, backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 9 },
  searchInput: { flex: 1, color: palette.text, fontSize: 15, paddingVertical: 10 },
  filterBlock: { paddingHorizontal: 20, gap: 10 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  filterChip: { paddingHorizontal: 14, minHeight: 38, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panel, alignItems: "center", justifyContent: "center" },
  filterChipActive: { backgroundColor: palette.mint, borderColor: palette.mint },
  filterText: { color: palette.muted, fontSize: 12, fontWeight: "800" },
  filterTextActive: { color: palette.canvas },
  list: { paddingHorizontal: 20, paddingTop: 10, gap: 9 },
  historyCard: { minHeight: 84, borderRadius: 19, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panel, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  typeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  qrIcon: { backgroundColor: palette.mint },
  barcodeIcon: { backgroundColor: palette.amber },
  itemCopy: { flex: 1 },
  itemMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  itemType: { color: palette.text, fontSize: 12, fontWeight: "900" },
  itemTime: { color: palette.muted, fontSize: 11, fontWeight: "700" },
  itemData: { color: palette.muted, fontSize: 13, lineHeight: 18, marginTop: 5 },
});
