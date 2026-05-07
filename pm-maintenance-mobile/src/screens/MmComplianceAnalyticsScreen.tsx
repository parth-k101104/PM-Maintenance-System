import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { LineChart, BarChart } from "react-native-gifted-charts";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { fetchComplianceTrend } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, "MmComplianceAnalytics">;

export function MmComplianceAnalyticsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { rollingWindows } = route.params;
  const [windowDays, setWindowDays] = useState(route.params.windowDays);
  const { authState } = useAuth();

  const currentData = rollingWindows?.[String(windowDays)];
  // Operational PM compliance: approved / (approved + rejected) × 100 — PRIMARY metric
  const pmComplianceRate = currentData?.overallPmComplianceRate;
  // PHM prediction coverage: % of tasks the analytics engine could evaluate — secondary
  const phmCoverageRate = currentData?.overallPhmCoverageRate;
  const lineWiseData = currentData?.lineWiseCompliance || [];

  const [trendData, setTrendData] = useState<{ value: number; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!authState.session?.token) return;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchComplianceTrend(authState.session.token, windowDays);
        const formatted = data.map((d) => ({
          value: d.complianceRate,
          label: new Date(d.evaluationDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        }));
        setTrendData(formatted);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load trend data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [authState.session?.token, windowDays]);

  const barData = lineWiseData.map((l: any) => {
    const rate = l.pmComplianceRate;
    return {
      value: rate ?? 0,
      label: l.lineName.length > 8 ? l.lineName.substring(0, 8) + "..." : l.lineName,
      frontColor:
        rate == null ? "#626781" : rate >= 85 ? "#2E8B57" : rate >= 65 ? "#AD531A" : "#7D0000",
    };
  });
  const pmcColor = pmComplianceRate == null ? "#626781" : pmComplianceRate >= 85 ? "#2E8B57" : pmComplianceRate >= 65 ? "#AD531A" : "#7D0000";
  const phmColor = phmCoverageRate == null ? "#626781" : phmCoverageRate >= 85 ? "#2E8B57" : phmCoverageRate >= 65 ? "#AD531A" : "#7D0000";

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Pressable hitSlop={12} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={26} color="#111" />
        </Pressable>
        <Text style={s.headerTitle}>PM Compliance ({windowDays}d)</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* PM Compliance summary — operational on-time completion rate — PRIMARY */}
        <View style={[s.heroCard, { borderLeftColor: pmcColor }]}>
          <View style={s.heroLeft}>
            <Ionicons name="checkmark-circle-outline" size={26} color={pmcColor} style={{ marginBottom: 4 }} />
            <Text style={[s.heroValue, { color: pmcColor }]}>
              {pmComplianceRate != null ? `${pmComplianceRate.toFixed(1)}%` : "N/A"}
            </Text>
            <Text style={s.heroLabel}>Plant-wide PM Compliance</Text>
            <Text style={[s.heroLabel, { fontSize: 11, marginTop: 2, color: "#626781" }]}>
              approved / (approved + rejected)
            </Text>
          </View>
          <View style={s.heroBadge}>
            <Text style={[s.heroBadgeText, { color: pmcColor }]}>
              {pmComplianceRate == null ? "N/A" : pmComplianceRate >= 85 ? "Good" : pmComplianceRate >= 65 ? "Warn" : "Critical"}
            </Text>
          </View>
        </View>

        <View style={[s.heroCard, { borderLeftColor: phmColor, marginTop: 10 }]}>
          <View style={s.heroLeft}>
            <Ionicons name="checkmark-done-circle-outline" size={26} color={phmColor} style={{ marginBottom: 4 }} />
            <Text style={[s.heroValue, { color: phmColor }]}>
              {phmCoverageRate != null ? `${phmCoverageRate.toFixed(1)}%` : "N/A"}
            </Text>
            <Text style={s.heroLabel}>Plant-wide PHM Coverage</Text>
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
                color={pmcColor}
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
                dataPointsColor={pmcColor}
                dataPointsRadius={5}
                referenceLine1Config={{ color: "#2E8B57", dashWidth: 4, dashGap: 4, thickness: 1 }}
                referenceLine1Position={85}
                referenceLine2Config={{ color: "#AD531A", dashWidth: 4, dashGap: 4, thickness: 1 }}
                referenceLine2Position={65}
                areaChart
                startFillColor={pmcColor}
                startOpacity={0.18}
                endFillColor={pmcColor}
                endOpacity={0.01}
                showValuesAsDataPointsText
                textShiftY={-10}
                textShiftX={-4}
                textColor={pmcColor}
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

        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="bar-chart-outline" size={18} color={colors.primary} />
            <Text style={s.sectionTitle}>Line-wise PM Compliance</Text>
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
      </ScrollView>
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
  headerTitle: { fontFamily: "Jost_600SemiBold", fontSize: 19, lineHeight: 24, color: "#111" },
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
  heroValue: { fontFamily: "Jost_600SemiBold", fontSize: 44, lineHeight: 50 },
  heroLabel: { fontFamily: "Jost_400Regular", fontSize: 12, color: colors.textMuted },
  heroBadge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  heroBadgeText: { fontFamily: "Jost_600SemiBold", fontSize: 13 },
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
  sectionTitle: { fontFamily: "Jost_600SemiBold", fontSize: 16, lineHeight: 22, color: "#111" },
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
});
