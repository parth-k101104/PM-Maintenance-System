import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import {
  acknowledgeLineManagerInsight,
  fetchLineManagerAnalyticsDashboard,
  runAnalyticsSyncJob,
} from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import type { ActionInsight, AnalyticsDashboardResponse, PartPrediction } from "../types/api";
import { RootStackParamList } from "../types/navigation";

function formatPercent(value?: number | null) {
  if (value === undefined || value === null) return "N/A";
  return `${Math.round(value)}%`;
}

function formatNumber(value?: number | null, digits = 2) {
  if (value === undefined || value === null) return "N/A";
  return Number(value).toFixed(digits);
}

function getRiskTone(value?: number | null) {
  const risk = value ?? 0;
  if (risk >= 75) return styles.riskCritical;
  if (risk >= 45) return styles.riskWarning;
  return styles.riskStable;
}

function InsightCard({
  insight,
  onAcknowledge,
  closing,
}: {
  insight: ActionInsight;
  onAcknowledge: (insightId: number) => void;
  closing: boolean;
}) {
  const isCritical = insight.severity === "CRITICAL";

  return (
    <View style={[styles.insightCard, isCritical ? styles.insightCritical : styles.insightWarning]}>
      <View style={styles.insightHeader}>
        <View style={styles.insightTitleWrap}>
          <Text style={styles.insightSeverity}>{insight.severity || "INFO"}</Text>
          <Text style={styles.insightPart}>{insight.partName || "Monitored part"}</Text>
        </View>
        <Pressable
          style={styles.closeInsightButton}
          onPress={() => onAcknowledge(insight.insightId)}
          disabled={closing}
        >
          {closing ? (
            <ActivityIndicator size="small" color="#111111" />
          ) : (
            <Ionicons name="checkmark-outline" size={18} color="#111111" />
          )}
        </Pressable>
      </View>
      <Text style={styles.insightMessage}>{insight.message}</Text>
      <View style={styles.metricRow}>
        <View style={styles.metricPill}>
          <Text style={styles.metricLabel}>Risk</Text>
          <Text style={[styles.metricValue, getRiskTone(insight.riskScore)]}>{formatPercent(insight.riskScore)}</Text>
        </View>
        <View style={styles.metricPill}>
          <Text style={styles.metricLabel}>Confidence</Text>
          <Text style={styles.metricValue}>{formatPercent(insight.confidenceScore)}</Text>
        </View>
        <View style={styles.metricPill}>
          <Text style={styles.metricLabel}>Life left</Text>
          <Text style={styles.metricValue}>{insight.daysRemaining ?? "N/A"}d</Text>
        </View>
      </View>
    </View>
  );
}

function PredictionCard({ prediction }: { prediction: PartPrediction }) {
  const lifecycle = prediction.lifecycleRatio !== undefined ? prediction.lifecycleRatio * 100 : undefined;

  return (
    <View style={styles.predictionCard}>
      <View style={styles.predictionHeader}>
        <View>
          <Text style={styles.predictionTitle}>{prediction.partName}</Text>
          <Text style={styles.predictionMeta}>{prediction.equipmentName || "Equipment unavailable"}</Text>
        </View>
        <Text style={[styles.predictionRisk, getRiskTone(prediction.riskScore)]}>
          {formatPercent(prediction.riskScore)}
        </Text>
      </View>

      <View style={styles.lifecycleTrack}>
        <View style={[styles.lifecycleFill, { width: `${Math.min(100, Math.max(0, lifecycle ?? 0))}%` }]} />
      </View>

      <View style={styles.predictionGrid}>
        <View style={styles.predictionMetric}>
          <Text style={styles.metricLabel}>Current</Text>
          <Text style={styles.metricValue}>{formatNumber(prediction.currentValue)}</Text>
        </View>
        <View style={styles.predictionMetric}>
          <Text style={styles.metricLabel}>Velocity</Text>
          <Text style={styles.metricValue}>{formatNumber(prediction.degradationVelocity, 4)}</Text>
        </View>
        <View style={styles.predictionMetric}>
          <Text style={styles.metricLabel}>Confidence</Text>
          <Text style={styles.metricValue}>{formatPercent(prediction.confidenceScore)}</Text>
        </View>
      </View>

      <Text style={styles.predictionFootnote}>
        Failure estimate: {prediction.predictedFailureDate || "Not enough data"} | Remaining:{" "}
        {prediction.daysRemaining ?? "N/A"} days
      </Text>
    </View>
  );
}

export function LineManagerAnalyticsDashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { authState } = useAuth();
  const [data, setData] = useState<AnalyticsDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [closingInsightId, setClosingInsightId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  const loadDashboard = useCallback(
    async (asRefresh = false) => {
      if (!authState.session?.token) return;
      if (asRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        setData(await fetchLineManagerAnalyticsDashboard(authState.session.token));
      } finally {
        setRefreshing(false);
        setLoading(false);
      }
    },
    [authState.session?.token],
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard(true);
    }, [loadDashboard]),
  );

  const latestLineHealth = useMemo(() => {
    const lineScores = data?.healthScores.filter((score) => score.entityType === "LINE") ?? [];
    return lineScores[0];
  }, [data?.healthScores]);

  async function acknowledgeInsight(insightId: number) {
    if (!authState.session?.token) return;
    setClosingInsightId(insightId);
    try {
      await acknowledgeLineManagerInsight(authState.session.token, insightId);
      setData((current) =>
        current
          ? {
              ...current,
              actionInsights: current.actionInsights.filter((insight) => insight.insightId !== insightId),
            }
          : current,
      );
    } finally {
      setClosingInsightId(null);
    }
  }

  async function handleSync() {
    if (!authState.session?.token || syncing) return;
    setSyncing(true);
    try {
      await runAnalyticsSyncJob(authState.session.token);
      await loadDashboard(true);
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={28} color="#111111" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Analytics dashboard</Text>
          <Text style={styles.headerSubtitle}>Line health, part risk, and PHM insights</Text>
        </View>
        <Pressable
          style={[styles.syncBtn, syncing && styles.syncBtnDisabled]}
          onPress={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#111111" />
          ) : (
            <Ionicons name="sync-outline" size={20} color="#111111" />
          )}
        </Pressable>
      </View>

      <FlatList
        data={data?.predictions ?? []}
        keyExtractor={(item) => String(item.predictionId)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.topContent}>
            <View style={styles.healthBand}>
              <View>
                <Text style={styles.healthLabel}>Line health score</Text>
                <Text style={styles.healthValue}>{formatPercent(latestLineHealth?.healthScore)}</Text>
              </View>
              <View style={styles.healthMetaBox}>
                <Text style={styles.healthMetaLabel}>Trend</Text>
                <Text style={styles.healthMetaValue}>{latestLineHealth?.trend || "N/A"}</Text>
              </View>
            </View>

            {/* ── Actionable insights inside scrollable card ── */}
            <Text style={styles.sectionTitle}>Actionable insights</Text>
            <View style={styles.insightsCard}>
              {(data?.actionInsights ?? []).length ? (
                <>
                  <ScrollView
                    style={styles.insightsScroll}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.insightsScrollContent}
                  >
                    {data?.actionInsights.map((insight) => (
                      <InsightCard
                        key={insight.insightId}
                        insight={insight}
                        closing={closingInsightId === insight.insightId}
                        onAcknowledge={acknowledgeInsight}
                      />
                    ))}
                  </ScrollView>
                  {(data?.actionInsights.length ?? 0) > 2 && (
                    <View style={styles.scrollHint}>
                      <Ionicons name="chevron-down-outline" size={14} color="#626781" />
                      <Text style={styles.scrollHintText}>Scroll for more</Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.emptyInsights}>
                  <Ionicons name="sparkles-outline" size={22} color="#626781" />
                  <Text style={styles.emptyInsightsText}>No actionable insights. Sync to get fresh insights.</Text>
                </View>
              )}
            </View>

            <Text style={styles.sectionTitle}>Equipment and part predictions</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No predictions are available for your line yet.</Text>
        }
        renderItem={({ item }) => <PredictionCard prediction={item} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  loaderContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontFamily: "Jost_600SemiBold", fontSize: 22, color: "#111111" },
  headerSubtitle: { fontFamily: "Jost_400Regular", fontSize: 13, color: "#626781", marginTop: 2 },
  syncBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#F5E4C9",
    alignItems: "center",
    justifyContent: "center",
  },
  syncBtnDisabled: { opacity: 0.7 },
  content: { paddingHorizontal: 16, paddingBottom: 44 },
  topContent: { paddingTop: 16 },
  healthBand: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#D8EAD7",
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },
  healthLabel: { fontFamily: "Jost_500Medium", fontSize: 14, color: "#36503A" },
  healthValue: { fontFamily: "Jost_600SemiBold", fontSize: 42, color: "#111111", marginTop: 2 },
  healthMetaBox: { alignItems: "flex-end" },
  healthMetaLabel: { fontFamily: "Jost_400Regular", fontSize: 12, color: "#36503A" },
  healthMetaValue: { fontFamily: "Jost_600SemiBold", fontSize: 16, color: "#111111", marginTop: 2 },
  sectionTitle: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 18,
    color: "#111111",
    marginBottom: 12,
  },
  // Insights inside a scrollable card
  insightsCard: {
    borderRadius: 20,
    backgroundColor: "#F5F6FA",
    marginBottom: 22,
    overflow: "hidden",
  },
  insightsScroll: {
    maxHeight: 320,
  },
  insightsScrollContent: {
    padding: 12,
    gap: 12,
  },
  scrollHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#F5F6FA",
  },
  scrollHintText: { fontFamily: "Jost_400Regular", fontSize: 12, color: "#626781" },
  insightCard: { borderRadius: 18, padding: 16 },
  insightCritical: { backgroundColor: "#FDE8E7" },
  insightWarning: { backgroundColor: "#F5E4C9" },
  insightHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  insightTitleWrap: { flex: 1 },
  insightSeverity: { fontFamily: "Jost_600SemiBold", fontSize: 12, color: "#B42318" },
  insightPart: { fontFamily: "Jost_600SemiBold", fontSize: 17, color: "#111111", marginTop: 2 },
  closeInsightButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  insightMessage: { fontFamily: "Jost_400Regular", fontSize: 14, lineHeight: 20, color: "#383C4D", marginTop: 10 },
  metricRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  metricPill: { flex: 1, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.72)", padding: 10 },
  metricLabel: { fontFamily: "Jost_400Regular", fontSize: 11, color: "#626781" },
  metricValue: { fontFamily: "Jost_600SemiBold", fontSize: 15, color: "#111111", marginTop: 2 },
  riskCritical: { color: "#B42318" },
  riskWarning: { color: "#A0550E" },
  riskStable: { color: "#167C16" },
  emptyInsights: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
  },
  emptyInsightsText: { flex: 1, fontFamily: "Jost_400Regular", fontSize: 14, color: "#626781" },
  predictionCard: {
    borderRadius: 18,
    backgroundColor: "#F5F6FA",
    padding: 16,
    marginBottom: 14,
  },
  predictionHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  predictionTitle: { fontFamily: "Jost_600SemiBold", fontSize: 17, color: "#111111" },
  predictionMeta: { fontFamily: "Jost_400Regular", fontSize: 12, color: "#626781", marginTop: 2 },
  predictionRisk: { fontFamily: "Jost_600SemiBold", fontSize: 20 },
  lifecycleTrack: { height: 9, borderRadius: 999, backgroundColor: "#E0E2EA", overflow: "hidden", marginTop: 14 },
  lifecycleFill: { height: "100%", borderRadius: 999, backgroundColor: "#4B6FA8" },
  predictionGrid: { flexDirection: "row", gap: 8, marginTop: 12 },
  predictionMetric: { flex: 1, borderRadius: 14, backgroundColor: "#FFFFFF", padding: 10 },
  predictionFootnote: { fontFamily: "Jost_400Regular", fontSize: 12, color: "#626781", marginTop: 12 },
  emptyText: { fontFamily: "Jost_400Regular", textAlign: "center", marginTop: 14, fontSize: 14, color: "#626781" },
});
