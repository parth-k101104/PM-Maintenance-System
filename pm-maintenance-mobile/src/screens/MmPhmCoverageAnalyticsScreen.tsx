import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable, ScrollView, useWindowDimensions, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { LineChart, BarChart } from "react-native-gifted-charts";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { fetchPhmCoverageTrend, fetchLmPhmCoverageTrend } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, "MmPhmCoverageAnalytics">;

export function MmPhmCoverageAnalyticsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { rollingWindows, isLineManager, lineId } = route.params;
  const [windowDays, setWindowDays] = useState(route.params.windowDays);
  const { authState } = useAuth();
  const { width } = useWindowDimensions();

  const currentData = rollingWindows?.[String(windowDays)];
  const lineWiseData = currentData?.lineWiseCompliance || currentData?.lineMetrics || [];

  const [lineSelectorVisible, setLineSelectorVisible] = useState(false);
  const [currentLineId, setCurrentLineId] = useState<number | null>(lineId ?? null);

  useEffect(() => {
    setCurrentLineId(lineId ?? null);
  }, [lineId]);

  const activeLine = currentLineId != null ? lineWiseData.find((l: any) => l.lineId === currentLineId) : null;
  const phmCoverageRate = activeLine ? activeLine.phmCoverageRate : (currentData?.overallPhmCoverageRate ?? currentData?.phmCoverageRate);
  const activeTitle = activeLine ? activeLine.lineName : "Plant-wide";

  const [trendData, setTrendData] = useState<{ value: number; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!authState.session?.token) return;
      setLoading(true);
      setError(null);
      try {
        const data = isLineManager
          ? await fetchLmPhmCoverageTrend(authState.session.token, windowDays, currentLineId)
          : await fetchPhmCoverageTrend(authState.session.token, windowDays);
        
        if (!data || data.length === 0) {
          setTrendData([]);
        } else {
          const formatted = data.map((d: any) => ({
            value: d.phmCoverageRate,
            label: new Date(d.evaluationDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
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
  }, [authState.session?.token, windowDays, isLineManager, currentLineId]);

  const barData = lineWiseData.map((l: any) => {
    const rate = l.phmCoverageRate;
    return {
      value: rate ?? 0,
      label: l.lineName.length > 8 ? l.lineName.substring(0, 8) + "..." : l.lineName,
      frontColor:
        rate == null ? "#626781" : rate >= 85 ? "#2E8B57" : rate >= 65 ? "#AD531A" : "#7D0000",
    };
  });

  const phmColor = phmCoverageRate == null ? "#626781" : phmCoverageRate >= 85 ? "#2E8B57" : phmCoverageRate >= 65 ? "#AD531A" : "#7D0000";

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
          <Text style={s.headerTitle}>{activeTitle} PHM Coverage ({windowDays}d)</Text>
          {isLineManager && <Ionicons name="chevron-down" size={18} color="#111" style={{ marginLeft: 4 }} />}
        </Pressable>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* PHM Prediction Coverage Hero */}
        <View style={[s.heroCard, { borderLeftColor: phmColor }]}>
          <View style={s.heroLeft}>
            <Ionicons name="analytics-outline" size={26} color={phmColor} style={{ marginBottom: 4 }} />
            <Text style={[s.heroValue, { color: phmColor }, width < 380 && { fontSize: 36 }]}>
              {phmCoverageRate != null ? `${phmCoverageRate.toFixed(1)}%` : "N/A"}
            </Text>
            <Text style={s.heroLabel}>{activeTitle} PHM Coverage</Text>
            <Text style={[s.heroLabel, { fontSize: 11, marginTop: 2, color: "#626781" }]}>
              Prediction coverage rate
            </Text>
          </View>
          <View style={s.heroBadge}>
            <Text style={[s.heroBadgeText, { color: phmColor }]}>
              {phmCoverageRate == null ? "N/A" : phmCoverageRate >= 85 ? "Good" : phmCoverageRate >= 65 ? "Warn" : "Critical"}
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

        <View style={s.legendRow}>
          {([["#2E8B57", ">=85% Good"], ["#AD531A", "65-85% Warn"], ["#7D0000", "<65% Critical"]] as [string, string][]).map(
            ([c, l]) => (
              <View key={l} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: c }]} />
                <Text style={s.legendText}>{l}</Text>
              </View>
            ),
          )}
        </View>

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
                color={phmColor}
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
                dataPointsColor={phmColor}
                dataPointsRadius={5}
                areaChart
                startFillColor={phmColor}
                startOpacity={0.18}
                endFillColor={phmColor}
                endOpacity={0.01}
                showValuesAsDataPointsText
                textShiftY={-10}
                textShiftX={-4}
                textColor={phmColor}
                textFontSize={9}
                curved
              />
            </View>
          ) : (
            <View style={s.emptyCard}>
              <Ionicons name="analytics-outline" size={36} color={colors.textMuted} />
              <Text style={s.emptyText}>No trend data available.</Text>
              <Text style={s.emptySubText}>Run the analytics sync job to populate trend data.</Text>
            </View>
          )}
        </View>

        {lineWiseData.length > 1 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Ionicons name="bar-chart-outline" size={18} color={colors.primary} />
              <Text style={s.sectionTitle}>Line-wise PHM Coverage</Text>
            </View>
            {barData.length > 0 ? (
              <View style={s.chartCard}>
                <BarChart
                  data={barData}
                  height={220}
                  barWidth={40}
                  spacing={24}
                  roundedTop
                  roundedBottom
                  yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10, textAlign: 'center' }}
                  yAxisSuffix="%"
                  maxValue={100}
                  noOfSections={5}
                  showValuesAsTopLabel
                  topLabelTextStyle={{ color: colors.text, fontSize: 10, fontWeight: "bold" }}
                />
              </View>
            ) : (
              <Text style={s.emptyText}>No line-wise data available.</Text>
            )}
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
              {lineWiseData.map((l: any) => (
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
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  headerTitle: { fontFamily: "Jost_500Medium", fontSize: 19, lineHeight: 24, color: "#111" },
  content: { padding: 18, paddingBottom: 48, gap: 20 },
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
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontFamily: "Jost_400Regular", fontSize: 11, color: colors.textMuted },
  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { fontFamily: "Jost_500Medium", fontSize: 16, lineHeight: 22, color: "#111" },
  chartCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EBEBF5",
    overflow: "hidden",
  },
  center: { padding: 24, alignItems: "center", justifyContent: "center" },
  loadingText: { fontFamily: "Jost_400Regular", fontSize: 13, color: colors.textMuted },
  errorText: { color: colors.danger, fontSize: 14 },
  emptyText: { fontFamily: "Jost_400Regular", color: colors.textMuted, fontSize: 14, marginTop: 8 },
  emptySubText: { fontFamily: "Jost_400Regular", fontSize: 12, color: colors.textMuted, textAlign: "center" },
  emptyCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#EBEBF5",
  },
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
