import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PieChart } from "react-native-gifted-charts";

import { acknowledgeLineManagerInsight, fetchMaintenanceManagerDashboard } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import type { ActionInsight, MaintenanceManagerDashboardResponse } from "../types/api";
import type { RootStackParamList } from "../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList>;

function complianceColor(rate: number | null | undefined) {
  if (rate == null) return "#626781";
  if (rate >= 85) return "#2E8B57";
  if (rate >= 65) return "#AD531A";
  return "#7D0000";
}
function rejectionColor(rate: number | null | undefined) {
  if (rate == null) return "#626781";
  if (rate <= 5) return "#2E8B57";
  if (rate <= 15) return "#AD531A";
  return "#7D0000";
}
function turnaroundColor(hours: number | null | undefined) {
  if (hours == null) return "#626781";
  if (hours <= 24) return "#2E8B57";
  if (hours <= 48) return "#AD531A";
  return "#7D0000";
}
function evidenceColor(rate: number | null | undefined) {
  if (rate == null) return "#626781";
  if (rate >= 90) return "#2E8B57";
  if (rate >= 70) return "#AD531A";
  return "#7D0000";
}

function formatGreeting() {
  const hour = new Date().getHours();
  if (hour >= 17) return "Good Evening";
  if (hour >= 12) return "Good Afternoon";
  return "Good Morning";
}

// ─── Animated bar ─────────────────────────────────────────────────────────────

function AnimBar({ pct, color }: { pct: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: Math.min(pct, 100), duration: 300, useNativeDriver: false }).start();
  }, [pct]);
  return (
    <View style={barS.track}>
      <Animated.View
        style={[
          barS.fill,
          {
            backgroundColor: color,
            width: anim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }),
          },
        ]}
      />
    </View>
  );
}
const barS = StyleSheet.create({
  track: { height: 8, borderRadius: 4, backgroundColor: "#E0E0EF", overflow: "hidden", flex: 1, marginRight: 6 },
  fill: { height: "100%", borderRadius: 4 },
});

type Slice = { color: string; label: string; value: number; statusGroup: string };

// ─── Legend row ───────────────────────────────────────────────────────────────

function LegendRow({
  sl,
  total,
  isActive,
  onPress,
}: {
  sl: Slice;
  total: number;
  isActive: boolean;
  onPress: () => void;
}) {
  const pct = total > 0 ? Math.round((sl.value / total) * 100) : 0;
  return (
    <Pressable
      style={[leg.row, isActive && leg.rowActive]}
      onPress={onPress}
    >
      <View style={[leg.dot, { backgroundColor: sl.color }]} />
      <Text style={leg.label}>{sl.label}</Text>
      <AnimBar pct={pct} color={sl.color} />
      <Text style={[leg.count, { color: sl.color }]}>{sl.value}</Text>
      <Text style={leg.pct}>{pct}%</Text>
      <Ionicons name="chevron-forward-outline" size={14} color={sl.color} style={{ marginLeft: 2 }} />
    </Pressable>
  );
}
const leg = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10,
  },
  rowActive: { backgroundColor: "#E8E8F5" },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  label: { fontSize: 11, color: colors.textMuted, width: 82, flexShrink: 0 },
  count: { fontSize: 13, fontWeight: "700", width: 30, textAlign: "right", flexShrink: 0 },
  pct: { fontSize: 11, color: colors.textMuted, width: 34, textAlign: "right", flexShrink: 0 },
});

// ─── Small metric card ────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  unit,
  color,
  icon,
}: {
  label: string;
  value: number | null | undefined;
  unit: string;
  color: string;
  icon: string;
}) {
  return (
    <View style={mc.card}>
      <Ionicons name={icon as any} size={20} color={color} style={mc.icon} />
      <Text style={[mc.value, { color }]}>{value != null ? value.toFixed(1) : "—"}</Text>
      <Text style={mc.unit}>{unit}</Text>
      <Text style={mc.label}>{label}</Text>
    </View>
  );
}
const mc = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: "#F7F6FC", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#EBEBF5", alignItems: "center", gap: 3,
  },
  cardTappable: {
    borderColor: colors.primary + "33", // subtle primary tint border
  },
  icon: { marginBottom: 2 },
  value: { fontSize: 22, fontWeight: "800" },
  unit: { fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  label: { fontSize: 11, color: colors.textMuted, textAlign: "center", marginTop: 2 },
  tapHint: {
    flexDirection: "row", alignItems: "center", gap: 2,
    marginTop: 4, paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: colors.primaryMuted, borderRadius: 8,
  },
  tapHintText: { fontSize: 9, color: colors.primary, fontWeight: "600" },
});


// ─── Formatting helpers (from Line Manager Dashboard) ────────────────────────

function formatPercent(value?: number | null) {
  if (value === undefined || value === null) return "N/A";
  return `${Math.round(value)}%`;
}

function getRiskTone(value?: number | null) {
  const risk = value ?? 0;
  if (risk >= 75) return mmS.riskCritical;
  if (risk >= 45) return mmS.riskWarning;
  return mmS.riskStable;
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export function MaintenanceManagerDashboardScreen() {
  const { authState, signOut } = useAuth();
  const session = authState.session;
  const navigation = useNavigation<Nav>();
  const { width } = useWindowDimensions();

  const [data, setData] = useState<MaintenanceManagerDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSlice, setActiveSlice] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<ActionInsight | null>(null);
  const [acknowledgingInsightId, setAcknowledgingInsightId] = useState<number | null>(null);
  const translateX = useRef(new Animated.Value(-300)).current;

  const [windowDays, setWindowDays] = useState<number>(30);

  const currentData = data?.rollingWindows?.[String(windowDays)];

  const pmCompliance = currentData?.overallPmComplianceRate;
  const compliance = currentData?.overallPhmCoverageRate;
  const rejectionRate = currentData?.plantRejectionRate;
  const turnaroundHours = currentData?.plantApprovalTurnaroundTimeHours;
  const evidenceRate = currentData?.plantEvidenceComplianceRate;
  const efficiency = currentData?.plantEmployeeEfficiency;
  const isTablet = width >= 768;
  const horizontalPadding = isTablet ? 40 : 18;
  const contentMaxWidth = isTablet ? 920 : 560;
  const drawerWidth = Math.min(width * 0.78, 360);

  async function load(isRefresh = false) {
    if (!session?.token) return;
    
    // Only show full-screen spinner if we have no data at all
    if (!data && !isRefresh) {
      setLoading(true);
    } else if (isRefresh) {
      setRefreshing(true);
    }
    
    setError(null);
    try {
      const resp = await fetchMaintenanceManagerDashboard(session.token, windowDays);
      setData(resp);
    } catch (e) {
      if (!data) setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const loadRef = useRef(load);
  loadRef.current = load;
  
  useFocusEffect(
    useCallback(() => {
      load();
    }, [windowDays, session?.token])
  );

  const onRefresh = useCallback(() => load(true), [session?.token, windowDays]);

  const counts = currentData?.taskStatusCounts;
  const totalTasks =
    (counts?.inProgress ?? 0) + (counts?.underReview ?? 0) +
    (counts?.overdue ?? 0) + (counts?.rejected ?? 0) + (counts?.approved ?? 0);

  const slices: Slice[] = [
    { color: "#2E8B57", label: "Approved", value: counts?.approved ?? 0, statusGroup: "APPROVED" },
    { color: "#2D3268", label: "In Progress", value: counts?.inProgress ?? 0, statusGroup: "IN_PROGRESS" },
    { color: "#7048C1", label: "Under Review", value: counts?.underReview ?? 0, statusGroup: "UNDER_REVIEW" },
    { color: "#AD531A", label: "Overdue", value: counts?.overdue ?? 0, statusGroup: "OVERDUE" },
    { color: "#7D0000", label: "Rejected", value: counts?.rejected ?? 0, statusGroup: "REJECTED" },
  ];

  const cColor = complianceColor(compliance);
  const pmcColor = complianceColor(pmCompliance);
  const greeting = formatGreeting();
  const insights = data?.actionInsights || [];

  function getSeverityColor(severity?: string) {
    switch (severity) {
      case "CRITICAL": return "#EF4444";
      case "WARNING": return "#F59E0B";
      default: return "#3B82F6";
    }
  }

  const handleAcknowledge = async (insightId: number) => {
    if (!session?.token) return;
    setAcknowledgingInsightId(insightId);
    try {
      await acknowledgeLineManagerInsight(session.token, insightId);
      // Remove from local state
      if (data) {
        setData({
          ...data,
          actionInsights: data.actionInsights?.filter(i => i.insightId !== insightId)
        });
      }
      setSelectedInsight(null);
    } catch (e) {
      console.warn("Failed to acknowledge insight:", e);
    } finally {
      setAcknowledgingInsightId(null);
    }
  };

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: menuOpen ? 0 : -(drawerWidth + 20),
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [menuOpen, drawerWidth, translateX]);

  function handleSlicePress(index: number) {
    if (activeSlice === index) {
      // Tap again → navigate to drill-down
      const sl = slices[index];
      navigation.push("MmTaskStatusList", {
        statusGroup: sl.statusGroup,
        label: sl.label,
        color: sl.color,
        windowDays,
        rollingWindows: data?.rollingWindows,
      });
    } else {
      setActiveSlice(index);
    }
  }

  function handleLegendPress(index: number) {
    const sl = slices[index];
    navigation.push("MmTaskStatusList", {
      statusGroup: sl.statusGroup,
      label: sl.label,
      color: sl.color,
      windowDays,
      rollingWindows: data?.rollingWindows,
    });
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.screen}>
        <ScrollView
          contentContainerStyle={[s.contentShell, { paddingHorizontal: horizontalPadding }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => setActiveSlice(null)}
        >
          <View style={[s.contentInner, { maxWidth: contentMaxWidth }]}>
            <View style={s.headerRow}>
              <Pressable onPress={() => setMenuOpen(true)} hitSlop={8} style={s.headerIcon}>
                <Ionicons name="menu-outline" size={isTablet ? 40 : 34} color="#525252" />
              </Pressable>
              <View style={s.profileIcon}>
                <Ionicons name="person-circle-outline" size={isTablet ? 56 : 48} color="#525252" />
              </View>
            </View>

            <Text style={[s.greetingText, isTablet && s.greetingTextTablet]}>
              {greeting} {session?.fullName ?? "user"}
            </Text>

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

            {insights.length > 0 && (
              <View style={[s.dashboardPanel, { backgroundColor: "#FFF7ED", borderColor: "#FFEDD5" }]}>
                <View style={s.sectionRow}>
                  <Text style={s.sectionTitle}>Actionable Insights</Text>
                  <View style={[s.badge, { backgroundColor: "#FFEDD5" }]}>
                    <Text style={[s.badgeText, { color: "#9A3412" }]}>{insights.length} Alerts</Text>
                  </View>
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={{ marginHorizontal: -16, marginTop: 4 }} 
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 4 }}
                >
                  {insights.map(insight => (
                    <Pressable 
                      key={insight.insightId} 
                      style={s.insightCardMini}
                      onPress={() => setSelectedInsight(insight)}
                    >
                      <View style={[s.insightSeverityDot, { backgroundColor: getSeverityColor(insight.severity) }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.insightTitle} numberOfLines={2}>{insight.message || insight.insightCode.replace(/_/g, ' ')}</Text>
                        <Text style={s.insightTarget} numberOfLines={1}>
                          {insight.equipmentName} • {insight.partName}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {loading ? (
              <View style={s.center}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={s.loadingText}>Loading dashboard...</Text>
              </View>
            ) : error ? (
              <View style={s.center}>
                <Ionicons name="warning-outline" size={40} color={colors.danger} />
                <Text style={s.errorText}>{error}</Text>
                <Pressable style={s.retryBtn} onPress={() => load()}>
                  <Text style={s.retryBtnText}>Retry</Text>
                </Pressable>
              </View>
            ) : (
              <View style={s.dashboardBody}>

                <View style={s.heroRow}>
                  {/* PM Compliance — PRIMARY Hero card */}
                  <Pressable
                    style={[s.dashboardCard, s.complianceDashboardCard, s.fullWidthCard]}
                    onPress={() =>
                      navigation.push("MmComplianceAnalytics", {
                        currentRate: pmCompliance,
                        lineWiseData: currentData?.lineWiseCompliance || [],
                        windowDays,
                        rollingWindows: data?.rollingWindows,
                      })
                    }
                  >
                    <View style={s.cardHeader}>
                      <Text style={s.cardTitle}>PM Compliance</Text>
                      <Ionicons name="shield-checkmark" size={24} color="#165A15" />
                    </View>
                    <View style={s.heroContent}>
                      <Text style={[s.heroNumber, { color: pmcColor }]}>
                        {pmCompliance != null ? `${pmCompliance.toFixed(1)}%` : "N/A"}
                      </Text>
                      <View style={s.heroStats}>
                        <Text style={s.cardFootnote}>Approved / terminal tasks</Text>
                        <View style={s.heroBarContainer}>
                           <AnimBar pct={pmCompliance ?? 0} color={pmcColor} />
                        </View>
                      </View>
                    </View>
                    <View style={s.compactLegend}>
                      {[["#2E8B57", "Good"], ["#AD531A", "Warn"], ["#7D0000", "Critical"]].map(([c, l]) => (
                        <View key={l} style={s.legendItem}>
                          <View style={[s.legendDot, { backgroundColor: c }]} />
                          <Text style={s.legendText}>{l}</Text>
                        </View>
                      ))}
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#111111" style={s.cardArrow} />
                  </Pressable>
                </View>

                <View style={s.cardsRow}>
                  <Pressable
                    style={[s.dashboardCard, s.evidenceDashboardCard, s.flexHalf]}
                    onPress={() =>
                      navigation.push("MmEvidenceComplianceAnalytics", {
                        currentRate: evidenceRate,
                        lineWiseData: (currentData?.lineWiseCompliance ?? []).map((l) => ({
                          lineName: l.lineName,
                          evidenceComplianceRate: l.evidenceComplianceRate,
                        })),
                        windowDays,
                        rollingWindows: data?.rollingWindows,
                      })
                    }
                  >
                    <View style={s.cardIconBadge}>
                       <Ionicons name="document-attach-outline" size={20} color={evidenceColor(evidenceRate)} />
                    </View>
                    <Text style={s.cardTitleSmall}>Evidence Compliance</Text>
                    <Text style={[s.mediumNumber, { color: evidenceColor(evidenceRate) }]}>
                      {evidenceRate != null ? `${evidenceRate.toFixed(1)}%` : "N/A"}
                    </Text>
                    <Text style={s.cardFootnoteSmall}>plant-wide</Text>
                  </Pressable>

                  <View style={[s.dashboardCard, s.phmDashboardCard, s.flexHalf]}>
                    <View style={s.cardIconBadge}>
                       <Ionicons name="analytics-outline" size={20} color={cColor} />
                    </View>
                    <Text style={s.cardTitleSmall}>PHM Coverage</Text>
                    <Text style={[s.mediumNumber, { color: cColor }]}>
                      {compliance != null ? `${compliance.toFixed(1)}%` : "N/A"}
                    </Text>
                    <Text style={s.cardFootnoteSmall}>Prediction coverage</Text>
                  </View>
                </View>

                <View style={[s.dashboardPanel, s.statusPanel]}>
                  <View style={s.sectionRow}>
                    <Text style={s.sectionTitle}>Overall Task Status</Text>
                    <View style={s.badge}><Text style={s.badgeText}>{totalTasks} Total</Text></View>
                  </View>
                  <View style={s.statusPanelBody}>
                    <View style={s.pieWrap}>
                      {totalTasks > 0 ? (
                        <PieChart
                          data={slices.map((sl, i) => ({
                            value: sl.value,
                            color: sl.color,
                            text: String(sl.value),
                            shiftTextX: 2,
                            shiftTextY: 0,
                            onPress: () => handleSlicePress(i),
                          }))}
                          donut
                          radius={96}
                          innerRadius={58}
                          innerCircleColor="#F7F6FC"
                          centerLabelComponent={() => (
                            <View style={{ justifyContent: "center", alignItems: "center" }}>
                              <Text style={s.pieTotal}>{totalTasks}</Text>
                              <Text style={s.pieTotalLabel}>Total</Text>
                            </View>
                          )}
                          focusOnPress
                          toggleFocusOnPress
                          showText
                          textColor="#fff"
                          textSize={12}
                          fontWeight="bold"
                        />
                      ) : (
                        <Text style={s.emptyText}>No tasks available</Text>
                      )}
                    </View>
                    <View style={s.legendWrap}>
                      {slices.map((sl, i) => (
                        <LegendRow
                          key={sl.label}
                          sl={sl}
                          total={totalTasks}
                          isActive={activeSlice === i}
                          onPress={() => handleLegendPress(i)}
                        />
                      ))}
                    </View>
                  </View>
                </View>

                <View style={s.cardsRow}>
                  <Pressable
                    style={[s.dashboardCard, s.qualityDashboardCard, s.flexHalf]}
                    onPress={() =>
                      navigation.push("MmMetricTrend", {
                        metric: "rejection",
                        title: "Rejection Rate",
                        currentValue: rejectionRate,
                        unit: "%",
                        windowDays,
                        rollingWindows: data?.rollingWindows,
                      })
                    }
                  >
                    <View style={s.cardIconBadge}>
                       <Ionicons name="close-circle-outline" size={20} color={rejectionColor(rejectionRate)} />
                    </View>
                    <Text style={s.cardTitleSmall}>Rejection Rate</Text>
                    <Text style={[s.mediumNumber, { color: rejectionColor(rejectionRate) }]}>
                      {rejectionRate != null ? `${rejectionRate.toFixed(1)}%` : "N/A"}
                    </Text>
                  </Pressable>

                  <View style={[s.dashboardCard, s.efficiencyDashboardCard, s.flexHalf]}>
                    <View style={s.cardIconBadge}>
                       <Ionicons name="speedometer-outline" size={20} color={evidenceColor(efficiency)} />
                    </View>
                    <Text style={s.cardTitleSmall}>Employee Efficiency</Text>
                    <Text style={[s.mediumNumber, { color: evidenceColor(efficiency) }]}>
                      {efficiency != null ? `${efficiency.toFixed(1)}%` : "N/A"}
                    </Text>
                  </View>
                </View>

                <View style={s.heroRow}>
                  <Pressable
                    style={[s.dashboardCard, s.turnaroundDashboardCard, s.fullWidthCard]}
                    onPress={() =>
                      navigation.push("MmMetricTrend", {
                        metric: "approvalTurnaround",
                        title: "Average Approval Time",
                        currentValue: turnaroundHours,
                        unit: "h",
                        windowDays,
                        rollingWindows: data?.rollingWindows,
                      })
                    }
                  >
                    <View style={s.cardHeader}>
                      <Text style={s.cardTitle}>Average Approval Time</Text>
                      <Ionicons name="time" size={24} color="#A25D00" />
                    </View>
                    <View style={s.heroContent}>
                      <Text style={[s.heroNumber, { color: turnaroundColor(turnaroundHours) }]}>
                        {turnaroundHours != null ? turnaroundHours.toFixed(1) : "N/A"}
                      </Text>
                      <Text style={s.cardFootnote}>hours avg response</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#111111" style={s.cardArrow} />
                  </Pressable>
                </View>

                <View style={s.dashboardPanel}>
                  <Text style={s.sectionTitle}>Line-wise Analytics</Text>
                  {(currentData?.lineWiseCompliance ?? []).length === 0 ? (
                    <View style={s.emptyCard}><Text style={s.emptyText}>No line data available</Text></View>
                  ) : (
                    <View style={s.lineList}>
                      {(currentData?.lineWiseCompliance ?? [])
                        .sort((a, b) => (b.pmComplianceRate ?? -1) - (a.pmComplianceRate ?? -1))
                        .map((line, idx) => {
                          const pc = complianceColor(line.pmComplianceRate);
                          const hc = complianceColor(line.lineHealthScore);
                          return (
                            <Pressable 
                              key={line.lineId} 
                              style={[s.lineRow, idx > 0 && s.lineRowBorder]}
                              onPress={() => navigation.navigate("LineManagerAnalyticsDashboard", { lineId: line.lineId })}
                            >
                              <View style={s.lineTop}>
                                <Text style={s.lineName}>{line.lineName}</Text>
                                <View style={{ alignItems: "flex-end" }}>
                                  <Text style={[s.lineRate, { color: pc }]}>
                                    {line.pmComplianceRate != null ? `${line.pmComplianceRate.toFixed(1)}%` : "N/A"}
                                  </Text>
                                  <Text style={[s.lineMetricLabel, { color: colors.textMuted, textTransform: "none", letterSpacing: 0 }]}>
                                    PM Compliance
                                  </Text>
                                </View>
                              </View>
                              <View style={s.barRow}>
                                <AnimBar pct={line.pmComplianceRate ?? 0} color={pc} />
                              </View>
                              {/* Health score pill */}
                              <View style={s.healthScoreRow}>
                                <Ionicons name="heart-outline" size={13} color={hc} />
                                <Text style={[s.healthScoreLabel]}>Line Health Score: </Text>
                                <Text style={[s.healthScoreVal, { color: hc }]}>
                                  {line.lineHealthScore != null ? `${line.lineHealthScore.toFixed(1)}%` : "N/A"}
                                </Text>
                              </View>
                              <View style={s.lineMetrics}>
                                <View style={s.lineMetricItem}>
                                  <Ionicons name="close-circle-outline" size={13}
                                    color={line.rejectionRate != null ? rejectionColor(line.rejectionRate) : colors.textSoft} />
                                  <Text style={[s.lineMetricVal,
                                  { color: line.rejectionRate != null ? rejectionColor(line.rejectionRate) : colors.textSoft }]}>
                                    {line.rejectionRate != null ? `${line.rejectionRate.toFixed(1)}%` : "N/A"}
                                  </Text>
                                  <Text style={s.lineMetricLabel}>Rejection</Text>
                                </View>
                                <View style={s.lineMetricItem}>
                                  <Ionicons name="time-outline" size={13}
                                    color={line.approvalTurnaroundTimeHours != null ? turnaroundColor(line.approvalTurnaroundTimeHours) : colors.textSoft} />
                                  <Text style={[s.lineMetricVal,
                                  { color: line.approvalTurnaroundTimeHours != null ? turnaroundColor(line.approvalTurnaroundTimeHours) : colors.textSoft }]}>
                                    {line.approvalTurnaroundTimeHours != null ? `${line.approvalTurnaroundTimeHours.toFixed(1)}h` : "N/A"}
                                  </Text>
                                  <Text style={s.lineMetricLabel}>Turnaround</Text>
                                </View>
                                <View style={s.lineMetricItem}>
                                  <Ionicons name="document-attach-outline" size={13}
                                    color={line.evidenceComplianceRate != null ? evidenceColor(line.evidenceComplianceRate) : colors.textSoft} />
                                  <Text style={[s.lineMetricVal,
                                  { color: line.evidenceComplianceRate != null ? evidenceColor(line.evidenceComplianceRate) : colors.textSoft }]}>
                                    {line.evidenceComplianceRate != null ? `${line.evidenceComplianceRate.toFixed(1)}%` : "N/A"}
                                  </Text>
                                  <Text style={s.lineMetricLabel}>Evidence</Text>
                                </View>
                                <View style={s.lineMetricItem}>
                                  <Ionicons name="speedometer-outline" size={13}
                                    color={line.employeeEfficiency != null ? evidenceColor(line.employeeEfficiency) : colors.textSoft} />
                                  <Text style={[s.lineMetricVal,
                                  { color: line.employeeEfficiency != null ? evidenceColor(line.employeeEfficiency) : colors.textSoft }]}>
                                    {line.employeeEfficiency != null ? `${line.employeeEfficiency.toFixed(1)}%` : "N/A"}
                                  </Text>
                                  <Text style={s.lineMetricLabel}>Efficiency</Text>
                                </View>
                              </View>
                            </Pressable>
                          );
                        })}
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {menuOpen && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMenuOpen(false)}
            pointerEvents={menuOpen ? "auto" : "none"}
          />
        )}
        <Animated.View style={[s.drawer, { width: drawerWidth, transform: [{ translateX }] }]}>
          <Pressable style={s.drawerHeader} onPress={() => setMenuOpen(false)}>
            <Ionicons style={s.drawerHeaderArrow} name="arrow-back-outline" size={34} color="#111111" />
            <Text style={s.drawerHeaderText}>Menu</Text>
          </Pressable>

          <View style={s.drawerItems}>
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                navigation.navigate("LineManagerAnalyticsDashboard", {});
              }}
            >
              <Text style={s.drawerItemText}>Analytics dashboard</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                navigation.push("MmComplianceAnalytics", {
                  currentRate: pmCompliance,
                  lineWiseData: currentData?.lineWiseCompliance || [],
                  windowDays,
                  rollingWindows: data?.rollingWindows,
                });
              }}
            >
              <Text style={s.drawerItemText}>PM compliance</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                navigation.push("MmEvidenceComplianceAnalytics", {
                  currentRate: evidenceRate,
                  lineWiseData: (currentData?.lineWiseCompliance ?? []).map((l) => ({
                    lineName: l.lineName,
                    evidenceComplianceRate: l.evidenceComplianceRate,
                  })),
                  windowDays,
                  rollingWindows: data?.rollingWindows,
                });
              }}
            >
              <Text style={s.drawerItemText}>Evidence analytics</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                navigation.push("ConfigParams");
              }}
            >
              <Text style={s.drawerItemText}>Config parameters</Text>
            </Pressable>
          </View>

          <View style={s.drawerFooter}>
            <Pressable
              onPress={signOut}
              style={({ pressed }) => [s.logoutButton, pressed && s.logoutButtonPressed]}
            >
              <Text style={s.logoutText}>Log out</Text>
            </Pressable>
          </View>
        </Animated.View>
        {/* ─── Insight Detail Modal ────────────────────────────────────────────── */}
        <Modal
          visible={!!selectedInsight}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedInsight(null)}
        >
          <View style={mmS.modalOverlay}>
            <View style={mmS.modalContent}>
              <View style={mmS.modalHeader}>
                <Text style={mmS.modalTitle}>Insight Detail</Text>
                <Pressable onPress={() => setSelectedInsight(null)} hitSlop={12}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </Pressable>
              </View>

              {selectedInsight && (
                <View style={[mmS.insightCard, selectedInsight.severity === "CRITICAL" ? mmS.insightCritical : mmS.insightWarning]}>
                  <View style={mmS.insightCardHeader}>
                    <View style={mmS.insightTitleWrap}>
                      <Text style={mmS.insightSeverity}>{selectedInsight.severity || "INFO"}</Text>
                      <Text style={mmS.insightPart}>{selectedInsight.partName || "Monitored part"}</Text>
                    </View>
                    <Pressable
                      style={mmS.closeInsightButton}
                      onPress={() => handleAcknowledge(selectedInsight.insightId)}
                      disabled={acknowledgingInsightId === selectedInsight.insightId}
                    >
                      {acknowledgingInsightId === selectedInsight.insightId ? (
                        <ActivityIndicator size="small" color="#111111" />
                      ) : (
                        <Ionicons name="checkmark-outline" size={22} color="#111111" />
                      )}
                    </Pressable>
                  </View>
                  <Text style={mmS.insightMessage}>{selectedInsight.message}</Text>
                  <View style={mmS.metricRow}>
                    <View style={mmS.metricPill}>
                      <Text style={mmS.metricLabel}>Risk</Text>
                      <Text style={[mmS.metricValue, getRiskTone(selectedInsight.riskScore)]}>
                        {formatPercent(selectedInsight.riskScore)}
                      </Text>
                    </View>
                    <View style={mmS.metricPill}>
                      <Text style={mmS.metricLabel}>Confidence</Text>
                      <Text style={mmS.metricValue}>{formatPercent(selectedInsight.confidenceScore)}</Text>
                    </View>
                    <View style={mmS.metricPill}>
                      <Text style={mmS.metricLabel}>Life left</Text>
                      <Text style={mmS.metricValue}>{selectedInsight.daysRemaining ?? "N/A"}d</Text>
                    </View>
                  </View>
                  
                  <View style={mmS.modalActions}>
                    <Pressable 
                      style={mmS.viewAnalyticsBtn}
                      onPress={() => {
                        const lineId = selectedInsight.lineId;
                        setSelectedInsight(null);
                        navigation.navigate("LineManagerAnalyticsDashboard", { lineId });
                      }}
                    >
                      <Text style={mmS.viewAnalyticsBtnText}>View Analytics Dashboard</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  contentShell: {
    paddingTop: 0,
    paddingBottom: 48,
    alignItems: "center",
  },
  contentInner: {
    width: "100%",
    gap: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  headerIcon: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  profileIcon: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  greetingText: {
    fontFamily: "Jost_500Medium",
    fontSize: 26,
    lineHeight: 30,
    color: "#111111",
    marginTop: -18,
    marginBottom: 2,
    paddingHorizontal: 6,
  },
  greetingTextTablet: {
    fontSize: 34,
    lineHeight: 38,
  },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "#EBEBF5",
  },
  headerRole: { fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8 },
  headerName: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 2 },
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  loadingText: { color: colors.textMuted, fontSize: 14, marginTop: 8 },
  errorText: { color: colors.danger, fontSize: 14, textAlign: "center" },
  retryBtn: { marginTop: 8, paddingHorizontal: 28, paddingVertical: 12, backgroundColor: colors.primary, borderRadius: 10 },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  scroll: { padding: 20, gap: 24, paddingBottom: 48 },
  dashboardBody: {
    gap: 16,
    width: "100%",
  },
  cardsWrapper: {
    gap: 16,
    width: "100%",
  },
  cardsRow: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
  },
  heroRow: {
    width: "100%",
    marginBottom: 16,
  },
  flexHalf: {
    flex: 1,
  },
  fullWidthCard: {
    width: "100%",
    height: 220,
  },
  dashboardCard: {
    borderRadius: 32,
    height: 160,
    padding: 24,
    overflow: "hidden",
    position: "relative",
    justifyContent: "space-between",
  },
  complianceDashboardCard: {
    backgroundColor: "#D9EBD8", // Soft Green
  },
  evidenceDashboardCard: {
    backgroundColor: "#E1EAF4", // Soft Blue
  },
  phmDashboardCard: {
    backgroundColor: "#E8E1F4", // Soft Purple
  },
  statusDashboardCard: {
    backgroundColor: "#F4EBD8", // Soft Orange
  },
  qualityDashboardCard: {
    backgroundColor: "#F4F2D8", // Soft Yellow
  },
  efficiencyDashboardCard: {
    backgroundColor: "#E1F4F1", // Soft Teal
  },
  turnaroundDashboardCard: {
    backgroundColor: "#F4EBD8", // Soft Orange
  },
  cardTitle: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 20,
    lineHeight: 24,
    color: "#111111",
    flex: 1,
  },
  cardTitleSmall: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 14,
    lineHeight: 18,
    color: "#111111",
    paddingRight: 40, // space for icon
  },
  bigNumber: {
    fontFamily: "Jost_700Bold",
    fontSize: 48,
    lineHeight: 52,
    color: "#000000",
  },
  mediumNumber: {
    fontFamily: "Jost_700Bold",
    fontSize: 32,
    lineHeight: 36,
    color: "#000000",
    marginTop: 8,
  },
  cardFootnote: {
    fontFamily: "Jost_400Regular",
    fontSize: 15,
    lineHeight: 18,
    color: "#333333",
    marginTop: 2,
  },
  cardFootnoteSmall: {
    fontFamily: "Jost_400Regular",
    fontSize: 13,
    lineHeight: 16,
    color: "#333333",
    marginTop: 2,
  },
  cardProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: 12,
    gap: 10,
  },
  compactLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
  },
  cardIconBadge: {
    position: "absolute",
    right: 20,
    top: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardArrow: {
    position: "absolute",
    right: 20,
    bottom: 24,
  },
  smallCardArrow: {
    position: "absolute",
    right: 12,
    bottom: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 16,
    marginTop: 4,
  },
  heroNumber: {
    fontFamily: "Jost_700Bold",
    fontSize: 56,
    lineHeight: 62,
    color: "#000000",
  },
  heroStats: {
    flex: 1,
    paddingBottom: 6,
  },
  heroBarContainer: {
    marginTop: 8,
    width: "100%",
  },
  timeCard: {
    width: "100%",
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  timeCardTitle: {
    fontFamily: "Jost_500Medium",
    fontSize: 18,
    lineHeight: 26,
    color: "#111111",
    textAlign: "center",
    marginBottom: 8,
  },
  timeCardValue: {
    fontFamily: "Jost_500Medium",
    fontSize: 40,
    lineHeight: 44,
    color: "#167C16",
    textAlign: "center",
  },
  section: { gap: 10 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontFamily: "Jost_600SemiBold", fontSize: 17, lineHeight: 22, color: colors.text },
  badge: { backgroundColor: colors.primaryMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  dashboardPanel: {
    width: "100%",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#EBEBF5",
    padding: 16,
    gap: 12,
  },
  statusPanel: {
    backgroundColor: "#F7F6FC",
  },
  statusPanelBody: {
    gap: 10,
  },
  pieWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 214,
  },
  pieTotal: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 24,
    lineHeight: 28,
    color: "#111111",
  },
  pieTotalLabel: {
    fontFamily: "Jost_400Regular",
    fontSize: 12,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: "#F7F6FC", borderRadius: 14, padding: 16, gap: 10,
    borderWidth: 1, borderColor: "#EBEBF5",
  },
  emptyCard: {
    backgroundColor: "#F7F6FC", borderRadius: 14, padding: 24, alignItems: "center",
    borderWidth: 1, borderColor: "#EBEBF5",
  },
  emptyText: { color: colors.textMuted, fontSize: 13 },

  // Pie section
  pieHint: { fontSize: 11, color: colors.textMuted, textAlign: "center", fontStyle: "italic" },
  legendWrap: { gap: 4, marginTop: 4 },

  // Compliance card
  complianceCard: {
    backgroundColor: "#F7F6FC", borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: "#EBEBF5", alignItems: "center", gap: 6,
  },
  sectionBigValue: { fontSize: 52, fontWeight: "800", lineHeight: 58 },
  bigLabel: { fontSize: 13, color: colors.textMuted, marginBottom: 10 },
  barRow: { flexDirection: "row", alignItems: "center", width: "100%" },
  barPct: { fontSize: 13, fontWeight: "700", width: 42, textAlign: "right", flexShrink: 0 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, justifyContent: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: colors.textMuted },

  // Orange metrics row
  triRow: { flexDirection: "row", gap: 10 },

  // Line rows
  lineList: {
    gap: 0,
  },
  lineRow: { paddingVertical: 12, gap: 6 },
  lineRowBorder: { borderTopWidth: 1, borderTopColor: "#EBEBF5" },
  lineTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  lineName: { fontSize: 14, fontWeight: "600", color: colors.text, flex: 1 },
  lineRate: { fontSize: 15, fontWeight: "700", flexShrink: 0 },
  healthScoreRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  healthScoreLabel: { fontSize: 11, color: colors.textMuted },
  healthScoreVal: { fontSize: 12, fontWeight: "700" },
  lineMetrics: { flexDirection: "row", gap: 0, marginTop: 6 },
  lineMetricItem: { flex: 1, alignItems: "center", gap: 2 },
  lineMetricVal: { fontSize: 13, fontWeight: "700" },
  lineMetricLabel: { fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.4 },
  drawer: {
    position: "absolute",
    left: 0,
    top: -60,
    bottom: -40,
    width: "100%",
    backgroundColor: "#C7C9E8",
    borderTopRightRadius: 80,
    borderBottomRightRadius: 80,
    overflow: "hidden",
    paddingTop: 100,
    paddingBottom: 40,
    paddingHorizontal: 28,
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 4, height: 0 },
    elevation: 10,
    zIndex: 100,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 60,
  },
  drawerHeaderText: {
    marginLeft: 18,
    fontFamily: "Jost_500Medium",
    fontSize: 28,
    lineHeight: 30,
    color: "#111111",
  },
  drawerHeaderArrow: {
    marginBottom: 6,
  },
  drawerItems: {
    paddingLeft: 20,
    gap: 36,
  },
  drawerItemText: {
    fontFamily: "Jost_400Regular",
    fontSize: 20,
    lineHeight: 22,
    paddingTop: 2,
    color: "#2F2F2F",
  },
  drawerItemMuted: {
    color: "#565656",
  },
  drawerFooter: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 140,
    width: "100%",
  },
  logoutButton: {
    width: "90%",
    maxWidth: 260,
    height: 68,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  logoutButtonPressed: {
    opacity: 0.88,
  },
  logoutText: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 22,
    lineHeight: 26,
    color: "#A12E2E",
  },
  insightCardMini: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    width: 260,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderColor: "#FFEDD5",
    shadowColor: "#9A3412",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  insightSeverityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    textTransform: "capitalize",
  },
  insightTarget: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
const mmS = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  insightCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  insightCritical: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  insightWarning: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FEF3C7",
  },
  insightCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  insightTitleWrap: {
    flex: 1,
  },
  insightSeverity: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  insightPart: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  closeInsightButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  insightMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: "#374151",
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  metricPill: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.6)",
    padding: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  riskCritical: { color: "#B91C1C" },
  riskWarning: { color: "#B45309" },
  riskStable: { color: "#047857" },
  modalActions: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 16,
    marginTop: 8,
  },
  viewAnalyticsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 4,
  },
  viewAnalyticsBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
});
