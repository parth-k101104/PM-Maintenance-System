import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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
import { LineChart } from "react-native-gifted-charts";

import {
  acknowledgeLineManagerInsight,
  fetchLineManagerAnalyticsDashboard,
  runAnalyticsSyncJob,
} from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import type { ActionInsight, AnalyticsDashboardResponse, HealthScore, PartPrediction } from "../types/api";
import { RootStackParamList } from "../types/navigation";

const SCREEN_WIDTH = Dimensions.get("window").width;
const HEALTH_CHART_WIDTH = SCREEN_WIDTH - 32 - 36;

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

type HealthGroup = {
  key: string;
  latest: HealthScore;
  history: HealthScore[];
};

type EquipmentHealthNode = {
  equipmentId?: number;
  equipmentName: string;
  health?: HealthGroup;
  parts: PartPrediction[];
};

function healthKey(score: HealthScore) {
  return `${score.entityType}:${score.entityId}`;
}

function compactDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(5);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function buildHealthGroups(scores: HealthScore[] = []) {
  const groups = new Map<string, HealthGroup>();
  scores.forEach((score) => {
    const key = healthKey(score);
    const current = groups.get(key);
    groups.set(key, {
      key,
      latest: current?.latest ?? score,
      history: [...(current?.history ?? []), score],
    });
  });

  return Array.from(groups.values()).map((group) => {
    const history = group.history
      .filter((score) => score.healthScore !== undefined && score.healthScore !== null)
      .sort((a, b) => new Date(a.evaluationDate).getTime() - new Date(b.evaluationDate).getTime());
    const latest = [...history].sort(
      (a, b) => new Date(b.evaluationDate).getTime() - new Date(a.evaluationDate).getTime(),
    )[0] ?? group.latest;
    return { ...group, latest, history };
  });
}

function HealthTrendChart({ group }: { group?: HealthGroup }) {
  const points = group?.history ?? [];
  const chartData = points.map((score, index) => ({
    value: Number(score.healthScore ?? 0),
    label: index === 0 || index === points.length - 1 ? compactDate(score.evaluationDate) : "",
    dataPointText: index === points.length - 1 ? `${Math.round(score.healthScore ?? 0)}` : undefined,
  }));

  return (
    <View style={styles.healthTrendCard}>
      <View style={styles.healthTrendHeader}>
        <View>
          <Text style={styles.healthTrendTitle}>{group?.latest.entityName || "Select equipment"}</Text>
          <Text style={styles.healthTrendMeta}>
            {group?.latest.entityType || "Health"} trend | {group?.latest.trend || "N/A"}
          </Text>
        </View>
        <Text style={styles.healthTrendValue}>{formatPercent(group?.latest.healthScore)}</Text>
      </View>

      {chartData.length >= 2 ? (
        <LineChart
          data={chartData}
          height={170}
          width={HEALTH_CHART_WIDTH}
          initialSpacing={8}
          endSpacing={8}
          spacing={Math.max(38, HEALTH_CHART_WIDTH / Math.max(chartData.length - 1, 1))}
          color="#6366F1"
          thickness={3}
          dataPointsColor="#6366F1"
          dataPointsRadius={4}
          curved={false}
          maxValue={100}
          noOfSections={4}
          stepValue={25}
          yAxisTextStyle={styles.axisLabel}
          xAxisLabelTextStyle={styles.axisLabel}
          xAxisColor="#E5E7EB"
          yAxisColor="#E5E7EB"
          rulesColor="#F3F4F6"
          disableScroll
          hideRules={false}
        />
      ) : (
        <View style={styles.healthTrendEmpty}>
          <Text style={styles.emptyText}>More health snapshots are needed for a trend graph.</Text>
        </View>
      )}
    </View>
  );
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

function PredictionCard({ prediction, onPress }: { prediction: PartPrediction; onPress?: () => void }) {
  const lifecycle = prediction.lifecycleRatio !== undefined ? prediction.lifecycleRatio * 100 : undefined;

  return (
    <Pressable style={styles.predictionCard} onPress={onPress}>
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
    </Pressable>
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
  const [selectedHealthKey, setSelectedHealthKey] = useState<string | null>(null);
  const [windowDays, setWindowDays] = useState<number>(30);

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

  const currentHealthScores = data?.rollingHealthScores?.[String(windowDays)] ?? [];

  const healthGroups = useMemo(() => buildHealthGroups(currentHealthScores), [currentHealthScores]);

  const latestLineHealth = useMemo(() => {
    const latestLineGroups = healthGroups.filter((group) => group.latest.entityType === "LINE");
    const scores = latestLineGroups
      .map((group) => group.latest.healthScore)
      .filter((score): score is number => score !== undefined && score !== null);
    const healthScore = scores.length
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : undefined;

    return {
      healthScore,
      trend: latestLineGroups[0]?.latest.trend,
    };
  }, [healthGroups]);

  const selectedHealthGroup = useMemo(() => {
    if (!healthGroups.length) return undefined;
    return healthGroups.find((group) => group.key === selectedHealthKey) ?? healthGroups[0];
  }, [healthGroups, selectedHealthKey]);

  const equipmentHierarchy = useMemo<EquipmentHealthNode[]>(() => {
    const equipmentGroups = healthGroups.filter((group) => group.latest.entityType === "EQUIPMENT");
    const predictionsByEquipment = new Map<number, PartPrediction[]>();
    (data?.predictions ?? []).forEach((prediction) => {
      if (prediction.equipmentId === undefined || prediction.equipmentId === null) return;
      predictionsByEquipment.set(prediction.equipmentId, [
        ...(predictionsByEquipment.get(prediction.equipmentId) ?? []),
        prediction,
      ]);
    });

    const ids = new Set<number>([
      ...equipmentGroups.map((group) => group.latest.entityId),
      ...Array.from(predictionsByEquipment.keys()),
    ]);

    return Array.from(ids).map((equipmentId) => {
      const health = equipmentGroups.find((group) => group.latest.entityId === equipmentId);
      const parts = predictionsByEquipment.get(equipmentId) ?? [];
      return {
        equipmentId,
        equipmentName: health?.latest.entityName || parts[0]?.equipmentName || `Equipment #${equipmentId}`,
        health,
        parts,
      };
    });
  }, [data?.predictions, healthGroups]);

  function openPartAnalytics(part: PartPrediction) {
    navigation.navigate("LineManagerPartAnalytics", {
      part: {
        partId: part.partId,
        partName: part.partName,
        equipmentId: part.equipmentId ?? 0,
        equipmentName: part.equipmentName ?? "Equipment unavailable",
      },
    });
  }

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

            <View style={styles.toggleContainer}>
              <Pressable
                style={[styles.toggleBtn, windowDays === 365 && styles.toggleBtnActive]}
                onPress={() => setWindowDays(365)}
              >
                <Text style={[styles.toggleBtnText, windowDays === 365 && styles.toggleBtnTextActive]}>365 Days</Text>
              </Pressable>
              <Pressable
                style={[styles.toggleBtn, windowDays === 30 && styles.toggleBtnActive]}
                onPress={() => setWindowDays(30)}
              >
                <Text style={[styles.toggleBtnText, windowDays === 30 && styles.toggleBtnTextActive]}>30 Days</Text>
              </Pressable>
            </View>

            {/* ── Actionable insights inside scrollable card ── */}
            <Text style={styles.sectionTitle}>Health score trends</Text>
            <HealthTrendChart group={selectedHealthGroup} />

            <View style={styles.hierarchyCard}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.healthSelectorRow}
              >
                {healthGroups.map((group) => {
                  const selected = group.key === selectedHealthGroup?.key;
                  return (
                    <Pressable
                      key={group.key}
                      style={[styles.healthChip, selected && styles.healthChipSelected]}
                      onPress={() => setSelectedHealthKey(group.key)}
                    >
                      <Text style={[styles.healthChipLabel, selected && styles.healthChipLabelSelected]}>
                        {group.latest.entityType}
                      </Text>
                      <Text
                        style={[styles.healthChipName, selected && styles.healthChipNameSelected]}
                        numberOfLines={1}
                      >
                        {group.latest.entityName || `#${group.latest.entityId}`}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {equipmentHierarchy.length ? (
                equipmentHierarchy.map((equipment) => (
                  <View key={equipment.equipmentId ?? equipment.equipmentName} style={styles.equipmentNode}>
                    <Pressable
                      style={styles.equipmentNodeHeader}
                      onPress={() => equipment.health && setSelectedHealthKey(equipment.health.key)}
                      disabled={!equipment.health}
                    >
                      <View style={styles.equipmentTitleWrap}>
                        <Ionicons name="hardware-chip-outline" size={18} color="#4B5563" />
                        <Text style={styles.equipmentNodeTitle}>{equipment.equipmentName}</Text>
                      </View>
                      <View style={styles.equipmentScorePill}>
                        <Text style={styles.equipmentScoreText}>
                          {formatPercent(equipment.health?.latest.healthScore)}
                        </Text>
                      </View>
                    </Pressable>
                    {equipment.parts.length ? (
                      <View style={styles.partNodeList}>
                        {equipment.parts.map((part) => (
                          <Pressable
                            key={part.partId}
                            style={styles.partNode}
                            onPress={() => openPartAnalytics(part)}
                          >
                            <View style={styles.partNodeTextWrap}>
                              <Text style={styles.partNodeTitle}>{part.partName}</Text>
                              <Text style={styles.partNodeMeta}>
                                Risk {formatPercent(part.riskScore)} | Remaining {part.daysRemaining ?? "N/A"}d
                              </Text>
                            </View>
                            <Ionicons name="analytics-outline" size={18} color="#6366F1" />
                          </Pressable>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.partNodeEmpty}>No part predictions for this equipment yet.</Text>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No equipment health scores are available yet.</Text>
              )}
            </View>

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
        renderItem={({ item }) => <PredictionCard prediction={item} onPress={() => openPartAnalytics(item)} />}
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
  toggleContainer: {
    flexDirection: "row",
    padding: 4,
    backgroundColor: colors.primaryMuted,
    borderRadius: 16,
    gap: 12,
    marginBottom: 20,
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
  healthValue: { fontFamily: "Jost_600SemiBold", fontSize: 42, color: "#111111", marginTop: 2 },
  healthMetaBox: { alignItems: "flex-end" },
  healthMetaLabel: { fontFamily: "Jost_400Regular", fontSize: 12, color: "#36503A" },
  healthMetaValue: { fontFamily: "Jost_600SemiBold", fontSize: 16, color: "#111111", marginTop: 2 },
  healthTrendCard: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEF0F5",
  },
  healthTrendHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  healthTrendTitle: { fontFamily: "Jost_600SemiBold", fontSize: 16, color: "#111111" },
  healthTrendMeta: { fontFamily: "Jost_400Regular", fontSize: 12, color: "#626781", marginTop: 2 },
  healthTrendValue: { fontFamily: "Jost_600SemiBold", fontSize: 24, color: "#111111" },
  healthTrendEmpty: { height: 170, alignItems: "center", justifyContent: "center" },
  axisLabel: { color: "#9CA3AF", fontSize: 9, fontFamily: "Jost_400Regular" },
  hierarchyCard: {
    borderRadius: 18,
    backgroundColor: "#F5F6FA",
    padding: 12,
    marginBottom: 22,
  },
  healthSelectorRow: { gap: 8, paddingBottom: 12 },
  healthChip: {
    width: 138,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  healthChipSelected: { borderColor: "#6366F1", backgroundColor: "#EEF2FF" },
  healthChipLabel: { fontFamily: "Jost_600SemiBold", fontSize: 10, color: "#626781" },
  healthChipLabelSelected: { color: "#4F46E5" },
  healthChipName: { fontFamily: "Jost_500Medium", fontSize: 13, color: "#111111", marginTop: 2 },
  healthChipNameSelected: { color: "#312E81" },
  equipmentNode: {
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    padding: 12,
    marginBottom: 10,
  },
  equipmentNodeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  equipmentTitleWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  equipmentNodeTitle: { flex: 1, fontFamily: "Jost_600SemiBold", fontSize: 15, color: "#111111" },
  equipmentScorePill: { borderRadius: 999, backgroundColor: "#D8EAD7", paddingHorizontal: 10, paddingVertical: 4 },
  equipmentScoreText: { fontFamily: "Jost_600SemiBold", fontSize: 12, color: "#36503A" },
  partNodeList: { marginTop: 10, gap: 8, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: "#E5E7EB" },
  partNode: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
    padding: 10,
  },
  partNodeTextWrap: { flex: 1 },
  partNodeTitle: { fontFamily: "Jost_600SemiBold", fontSize: 14, color: "#111111" },
  partNodeMeta: { fontFamily: "Jost_400Regular", fontSize: 12, color: "#626781", marginTop: 2 },
  partNodeEmpty: { fontFamily: "Jost_400Regular", fontSize: 12, color: "#626781", marginTop: 8 },
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
