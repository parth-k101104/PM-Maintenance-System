import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LineChart } from "react-native-gifted-charts";

import { fetchApprovalTurnaroundTrend, fetchRejectionTrend } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, "MmMetricTrend">;

function metricColor(metric: Route["params"]["metric"], value?: number | null) {
  if (value == null) return colors.primary;
  if (metric === "approvalTurnaround") {
    if (value <= 24) return "#2E8B57";
    if (value <= 48) return "#AD531A";
    return "#7D0000";
  }

  if (value <= 5) return "#2E8B57";
  if (value <= 15) return "#AD531A";
  return "#7D0000";
}

export function MmMetricTrendScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { rollingWindows, metric, title, unit } = route.params;
  const [windowDays, setWindowDays] = useState(route.params.windowDays);
  const { authState } = useAuth();

  const [trendData, setTrendData] = useState<{ value: number; label: string; dataPointText: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentData = rollingWindows?.[String(windowDays)];
  const currentValue = metric === "approvalTurnaround"
    ? currentData?.plantApprovalTurnaroundTimeHours
    : currentData?.plantRejectionRate;
  const tone = metricColor(metric, currentValue);

  useEffect(() => {
    async function load() {
      if (!authState.session?.token) return;
      setLoading(true);
      setError(null);
      try {
        if (metric === "approvalTurnaround") {
          const rows = await fetchApprovalTurnaroundTrend(authState.session.token, windowDays);
          setTrendData(
            rows.map((row) => {
              const value = Number(row.approvalTurnaroundTimeHours);
              return {
                value,
                label: new Date(row.evaluationDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                dataPointText: `${value.toFixed(1)}${unit}`,
              };
            }),
          );
        } else {
          const rows = await fetchRejectionTrend(authState.session.token, windowDays);
          setTrendData(
            rows.map((row) => {
              const value = Number(row.rejectionRate);
              return {
                value,
                label: new Date(row.evaluationDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                dataPointText: `${value.toFixed(1)}${unit}`,
              };
            }),
          );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load trend data");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [authState.session?.token, metric, unit, windowDays]);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable hitSlop={12} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={26} color="#111" />
        </Pressable>
        <Text style={s.headerTitle}>{title} ({windowDays}d)</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={[s.heroCard, { borderLeftColor: tone }]}>
          <View style={s.heroLeft}>
            <Ionicons
              name={metric === "approvalTurnaround" ? "time-outline" : "close-circle-outline"}
              size={26}
              color={tone}
            />
            <Text style={[s.heroValue, { color: tone }]}>
              {currentValue != null ? `${currentValue.toFixed(1)}${unit}` : "N/A"}
            </Text>
            <Text style={s.heroLabel}>Plant-wide {title}</Text>
          </View>
          <View style={s.heroBadge}>
            <Text style={[s.heroBadgeText, { color: tone }]}>
              {tone === "#2E8B57" ? "Good" : tone === "#AD531A" ? "Warn" : "Critical"}
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
                color={tone}
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
                yAxisSuffix={unit}
                noOfSections={5}
                dataPointsColor={tone}
                dataPointsRadius={5}
                areaChart
                startFillColor={tone}
                startOpacity={0.18}
                endFillColor={tone}
                endOpacity={0.01}
                showValuesAsDataPointsText
                textShiftY={-10}
                textShiftX={-4}
                textColor={tone}
                textFontSize={9}
                curved
              />
            </View>
          ) : (
            <View style={s.emptyCard}>
              <Ionicons name="analytics-outline" size={36} color={colors.textMuted} />
              <Text style={s.emptyText}>No historical data yet.</Text>
              <Text style={s.emptySubText}>Run the analytics sync job to populate trend data.</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
  emptyCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#EBEBF5",
  },
  emptyText: { fontFamily: "Jost_600SemiBold", fontSize: 14, color: colors.textMuted, marginTop: 4 },
  emptySubText: { fontFamily: "Jost_400Regular", fontSize: 12, color: colors.textMuted, textAlign: "center" },
  center: { padding: 32, alignItems: "center", gap: 8 },
  loadingText: { fontFamily: "Jost_400Regular", fontSize: 13, color: colors.textMuted },
  errorText: { fontSize: 13, color: colors.danger, textAlign: "center" },
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
