import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Modal,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { LineChart, BarChart } from "react-native-gifted-charts";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { fetchEvidenceTrend, fetchLmEvidenceTrend } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, "MmEvidenceComplianceAnalytics">;

// ─── colour helpers ──────────────────────────────────────────────────────────

function evidenceColor(rate?: number | null) {
  if (rate == null) return "#626781";
  if (rate >= 90) return "#2E8B57";
  if (rate >= 70) return "#AD531A";
  return "#7D0000";
}

// ─── Animated progress bar ───────────────────────────────────────────────────

function AnimBar({ pct, color }: { pct: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.min(pct, 100),
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [pct]);
  return (
    <View style={bar.track}>
      <Animated.View
        style={[
          bar.fill,
          {
            backgroundColor: color,
            width: anim.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
}
const bar = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E0E0EF",
    overflow: "hidden",
    flex: 1,
    marginRight: 6,
  },
  fill: { height: "100%", borderRadius: 4 },
});

// ─── Main screen ─────────────────────────────────────────────────────────────

export function MmEvidenceComplianceAnalyticsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { rollingWindows, isLineManager, lineId } = route.params;
  const [windowDays, setWindowDays] = useState(route.params.windowDays);
  const { authState } = useAuth();

  const currentData = rollingWindows?.[String(windowDays)];
  const lineWiseDataRaw = currentData?.lineWiseCompliance || currentData?.lineMetrics || [];

  const [lineSelectorVisible, setLineSelectorVisible] = useState(false);
  const [currentLineId, setCurrentLineId] = useState<number | null>(lineId ?? null);

  useEffect(() => {
    setCurrentLineId(lineId ?? null);
  }, [lineId]);

  const activeLine = currentLineId != null ? lineWiseDataRaw.find((l: any) => l.lineId === currentLineId) : null;
  const currentRate = activeLine ? activeLine.evidenceComplianceRate : (currentData?.plantEvidenceComplianceRate ?? currentData?.evidenceComplianceRate);
  const activeTitle = activeLine ? activeLine.lineName : "Plant-wide";
  interface LineEvidenceStat {
    lineName: string;
    evidenceComplianceRate: number | null;
  }

  const lineWiseData: LineEvidenceStat[] = (currentData?.lineWiseCompliance ?? []).map((l: any) => ({
    lineName: l.lineName,
    evidenceComplianceRate: l.evidenceComplianceRate,
  }));

  const [trendData, setTrendData] = useState<{ value: number; label: string; dataPointText: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!authState.session?.token) return;
      setLoading(true);
      setError(null);
      try {
        const data = isLineManager
          ? await fetchLmEvidenceTrend(authState.session.token, windowDays, currentLineId)
          : await fetchEvidenceTrend(authState.session.token, windowDays);
        
        if (!data || data.length === 0) {
          setTrendData([]);
        } else {
          const formatted = data
            .filter((d) => d.evidenceComplianceRate != null)
            .map((d) => ({
              value: Number(d.evidenceComplianceRate),
              label: new Date(d.evaluationDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              }),
              dataPointText: `${Number(d.evidenceComplianceRate).toFixed(1)}%`,
            }));
          setTrendData(formatted);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load trend data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [authState.session?.token, windowDays, currentLineId]);

  // Bar chart data from line-wise summary
  const barData = lineWiseData
    .filter((l) => l.evidenceComplianceRate != null)
    .map((l) => ({
      value: l.evidenceComplianceRate as number,
      label:
        l.lineName && l.lineName.length > 8
          ? l.lineName.substring(0, 8) + "…"
          : l.lineName || "Line",
      frontColor: evidenceColor(l.evidenceComplianceRate as number),
      topLabelComponent: () => (
        <Text style={{ fontSize: 9, fontWeight: "700", color: evidenceColor(l.evidenceComplianceRate as number), marginBottom: 2 }}>
          {(l.evidenceComplianceRate as number).toFixed(1)}%
        </Text>
      ),
    }));

  const cColor = evidenceColor(currentRate);

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Pressable hitSlop={12} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={26} color="#111" />
        </Pressable>
        <Pressable 
          style={s.headerTitleContainer} 
          onPress={() => isLineManager && setLineSelectorVisible(true)}
          disabled={!isLineManager}
        >
          <Text style={s.headerTitle}>{activeTitle} Evidence ({windowDays}d)</Text>
          {isLineManager && <Ionicons name="chevron-down" size={18} color="#111" style={{ marginLeft: 4 }} />}
        </Pressable>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* ── Hero KPI card ── */}
        <View style={[s.heroCard, { borderLeftColor: cColor }]}>
          <View style={s.heroLeft}>
            <Ionicons name="document-attach-outline" size={26} color={cColor} style={{ marginBottom: 4 }} />
            <Text style={[s.heroValue, { color: cColor }, useWindowDimensions().width < 380 && { fontSize: 36 }]}>
              {currentRate != null ? `${currentRate.toFixed(1)}%` : "N/A"}
            </Text>
            <Text style={s.heroLabel}>{activeTitle} Evidence Compliance</Text>
          </View>
          <View style={s.heroBadge}>
            <Text style={[s.heroBadgeText, { color: cColor }]}>
              {currentRate == null ? "N/A" : currentRate >= 90 ? "✓ Good" : currentRate >= 70 ? "⚠ Warn" : "✗ Critical"}
            </Text>
          </View>
        </View>

        <View style={s.toggleContainer}>
          <Pressable
            style={[s.toggleBtn, windowDays === 365 && s.toggleBtnActive]}
            onPress={() => setWindowDays(365)}
          >
            <Text style={[s.toggleBtnText, windowDays === 365 && s.toggleBtnTextActive]}>365 Days</Text>
          </Pressable>
          <Pressable
            style={[s.toggleBtn, windowDays === 30 && s.toggleBtnActive]}
            onPress={() => setWindowDays(30)}
          >
            <Text style={[s.toggleBtnText, windowDays === 30 && s.toggleBtnTextActive]}>30 Days</Text>
          </Pressable>
        </View>

        {/* ── Colour legend ── */}
        <View style={s.legendRow}>
          {([["#2E8B57", "≥90% Good"], ["#AD531A", "70–90% Warn"], ["#7D0000", "<70% Critical"]] as [string, string][]).map(
            ([c, l]) => (
              <View key={l} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: c }]} />
                <Text style={s.legendText}>{l}</Text>
              </View>
            ),
          )}
        </View>

        {/* ── Historical trend line chart ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="trending-up-outline" size={18} color={colors.primary} />
            <Text style={s.sectionTitle}>Historical Trend</Text>
          </View>

          {loading ? (
            <View style={s.center}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={s.loadingText}>Loading trend data...</Text>
            </View>
          ) : error ? (
            <View style={s.center}>
              <Ionicons name="warning-outline" size={28} color={colors.danger} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : trendData.length > 0 ? (
            <View style={s.chartCard}>
              <LineChart
                data={trendData}
                height={210}
                color={cColor}
                thickness={3}
                spacing={trendData.length > 10 ? 36 : 52}
                initialSpacing={16}
                endSpacing={16}
                yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                xAxisLabelTextStyle={{
                  color: colors.textMuted,
                  fontSize: 9,
                  width: trendData.length > 10 ? 36 : 52,
                  textAlign: "center",
                }}
                yAxisSuffix="%"
                maxValue={100}
                noOfSections={5}
                dataPointsColor={cColor}
                dataPointsRadius={5}
                // Reference lines
                referenceLine1Config={{ color: "#2E8B57", dashWidth: 4, dashGap: 4, thickness: 1 }}
                referenceLine1Position={90}
                referenceLine2Config={{ color: "#AD531A", dashWidth: 4, dashGap: 4, thickness: 1 }}
                referenceLine2Position={70}
                // Area gradient fill
                areaChart
                startFillColor={cColor}
                startOpacity={0.18}
                endFillColor={cColor}
                endOpacity={0.01}
                // Data labels
                showValuesAsDataPointsText
                textShiftY={-10}
                textShiftX={-4}
                textColor={cColor}
                textFontSize={9}
                curved
              />
              <View style={s.refLegend}>
                <View style={s.refItem}>
                  <View style={[s.refLine, { backgroundColor: "#2E8B57" }]} />
                  <Text style={s.refText}>90% Good threshold</Text>
                </View>
                <View style={s.refItem}>
                  <View style={[s.refLine, { backgroundColor: "#AD531A" }]} />
                  <Text style={s.refText}>70% Warn threshold</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={s.emptyCard}>
              <Ionicons name="analytics-outline" size={36} color={colors.textMuted} />
              <Text style={s.emptyText}>No historical data yet.</Text>
              <Text style={s.emptySubText}>Run the analytics sync job to populate trend data.</Text>
            </View>
          )}
        </View>

        {/* ── Line-wise bar chart ── */}
        {barData.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Ionicons name="bar-chart-outline" size={18} color={colors.primary} />
              <Text style={s.sectionTitle}>Line-wise Breakdown</Text>
            </View>
            <View style={s.chartCard}>
              <BarChart
                data={barData}
                height={220}
                barWidth={36}
                spacing={20}
                roundedTop
                roundedBottom
                yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                xAxisLabelTextStyle={{
                  color: colors.textMuted,
                  fontSize: 9,
                  textAlign: "center",
                }}
                yAxisSuffix="%"
                maxValue={100}
                noOfSections={5}
                showValuesAsTopLabel
                topLabelTextStyle={{ color: colors.text, fontSize: 9, fontWeight: "bold" }}
              />
            </View>
          </View>
        )}

        {/* ── Line-wise list ── */}
        {lineWiseData.filter((l) => l.evidenceComplianceRate != null).length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Ionicons name="list-outline" size={18} color={colors.primary} />
              <Text style={s.sectionTitle}>Line Detail</Text>
            </View>
            <View style={s.listCard}>
              {lineWiseData
                .filter((l) => l.evidenceComplianceRate != null)
                .sort((a, b) => (b.evidenceComplianceRate ?? 0) - (a.evidenceComplianceRate ?? 0))
                .map((line, idx) => {
                  const rate = line.evidenceComplianceRate as number;
                  const cc = evidenceColor(rate);
                  return (
                    <View
                      key={line.lineName}
                      style={[s.listRow, idx > 0 && s.listRowBorder]}
                    >
                      <View style={s.listTop}>
                        <Text style={s.listLineName}>{line.lineName}</Text>
                        <Text style={[s.listRate, { color: cc }]}>
                          {rate.toFixed(1)}%
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                        <AnimBar pct={rate} color={cc} />
                        <Ionicons
                          name={
                            rate >= 90
                              ? "checkmark-circle-outline"
                              : rate >= 70
                                ? "alert-circle-outline"
                                : "close-circle-outline"
                          }
                          size={16}
                          color={cc}
                        />
                      </View>
                    </View>
                  );
                })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Line Selector Modal - Simplified style matching dashboard */}
      <Modal visible={lineSelectorVisible} transparent animationType="fade" onRequestClose={() => setLineSelectorVisible(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setLineSelectorVisible(false)}>
          <View style={s.pickerModalContent}>
            <Text style={s.pickerModalTitle}>Select Line</Text>
            <ScrollView style={s.lineList} showsVerticalScrollIndicator={false}>
              <Pressable
                style={[s.lineItem, currentLineId === null && s.lineItemActive]}
                onPress={() => {
                  setCurrentLineId(null);
                  setLineSelectorVisible(false);
                }}
              >
                <Text style={[s.lineItemText, currentLineId === null && s.lineItemTextActive]}>Plant-wide (All Lines)</Text>
                {currentLineId === null && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </Pressable>
              {lineWiseDataRaw.map((l: any) => (
                <Pressable
                  key={l.lineId}
                  style={[s.lineItem, currentLineId === l.lineId && s.lineItemActive]}
                  onPress={() => {
                    setCurrentLineId(l.lineId);
                    setLineSelectorVisible(false);
                  }}
                >
                  <Text style={[s.lineItemText, currentLineId === l.lineId && s.lineItemTextActive]}>{l.lineName}</Text>
                  {currentLineId === l.lineId && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  headerTitle: { fontFamily: "Jost_500Medium", fontSize: 19, lineHeight: 24, color: "#111" },
  content: { padding: 18, paddingBottom: 48, gap: 20 },

  // Hero card
  heroCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EBEBF5",
    borderLeftWidth: 5,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroLeft: { gap: 4 },
  heroValue: { fontFamily: "Jost_500Medium", fontSize: 44, lineHeight: 50 },
  heroLabel: { fontFamily: "Jost_400Regular", fontSize: 12, color: colors.textMuted },
  heroBadge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  heroBadgeText: { fontFamily: "Jost_500Medium", fontSize: 13 },

  // Legend
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontFamily: "Jost_400Regular", fontSize: 11, color: colors.textMuted },

  // Sections
  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { fontFamily: "Jost_500Medium", fontSize: 16, lineHeight: 22, color: "#111" },

  // Charts
  chartCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EBEBF5",
    overflow: "hidden",
  },
  refLegend: { flexDirection: "row", gap: 16, marginTop: 10, justifyContent: "center" },
  refItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  refLine: { width: 20, height: 2, borderRadius: 1 },
  refText: { fontFamily: "Jost_400Regular", fontSize: 10, color: colors.textMuted },

  // Empty state
  emptyCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#EBEBF5",
  },
  emptyText: { fontFamily: "Jost_500Medium", fontSize: 14, color: colors.textMuted, marginTop: 4 },
  emptySubText: { fontFamily: "Jost_400Regular", fontSize: 12, color: colors.textMuted, textAlign: "center" },

  // List card
  listCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EBEBF5",
  },
  listRow: { paddingVertical: 12, gap: 4 },
  listRowBorder: { borderTopWidth: 1, borderTopColor: "#EBEBF5" },
  listTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  listLineName: { fontFamily: "Jost_500Medium", fontSize: 14, color: "#111", flex: 1 },
  listRate: { fontFamily: "Jost_500Medium", fontSize: 14, flexShrink: 0 },

  center: { padding: 32, alignItems: "center", gap: 8 },
  loadingText: { fontFamily: "Jost_400Regular", fontSize: 13, color: colors.textMuted },
  errorText: { fontSize: 13, color: "#C0392B", textAlign: "center" },
  toggleContainer: {
    flexDirection: "row",
    padding: 4,
    backgroundColor: colors.primaryMuted,
    borderRadius: 16,
    gap: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "transparent",
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  toggleBtnTextActive: {
    color: "#fff",
  },
  // Selector Styles
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "80%",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerModalContent: {
    width: "85%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  pickerModalTitle: {
    fontFamily: "Jost_500Medium",
    fontSize: 20,
    color: "#111111",
    marginBottom: 20,
    textAlign: "center",
  },
  lineList: {
    maxHeight: 300,
  },
  lineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 4,
  },
  lineItemActive: {
    backgroundColor: colors.primaryMuted,
  },
  lineItemText: {
    fontFamily: "Jost_400Regular",
    fontSize: 17,
    color: colors.text,
  },
  lineItemTextActive: {
    fontFamily: "Jost_500Medium",
    color: colors.primary,
  },
});
