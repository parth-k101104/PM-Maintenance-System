import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PieChart } from "react-native-gifted-charts";

import { fetchMaintenanceManagerDashboard } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import type { MaintenanceManagerDashboardResponse } from "../types/api";
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
    Animated.timing(anim, { toValue: Math.min(pct, 100), duration: 700, useNativeDriver: false }).start();
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
  const translateX = useRef(new Animated.Value(-300)).current;

  const [windowDays, setWindowDays] = useState<number>(30);
  const isTablet = width >= 768;
  const horizontalPadding = isTablet ? 40 : 18;
  const contentMaxWidth = isTablet ? 920 : 560;
  const drawerWidth = Math.min(width * 0.78, 360);

  async function load(isRefresh = false) {
    if (!session?.token) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const resp = await fetchMaintenanceManagerDashboard(session.token, windowDays);
      setData(resp);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => { loadRef.current(); }, []);
  const onRefresh = useCallback(() => load(true), [session?.token, windowDays]);

  const currentData = data?.rollingWindows?.[String(windowDays)];
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

  const compliance = currentData?.overallPmComplianceRate;
  const cColor = complianceColor(compliance);
  const evidenceRate = currentData?.plantEvidenceComplianceRate;
  const rejectionRate = currentData?.plantRejectionRate;
  const turnaroundHours = currentData?.plantApprovalTurnaroundTimeHours;
  const greeting = formatGreeting();

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
                <Ionicons name="person-circle-outline" size={isTablet ? 64 : 56} color="#676767" />
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
                <View style={s.cardsRow}>
                  <Pressable
                    style={[s.dashboardCard, s.complianceDashboardCard, s.flexLarge]}
                    onPress={() =>
                      navigation.push("MmComplianceAnalytics", {
                        currentRate: compliance,
                        lineWiseData: currentData?.lineWiseCompliance || [],
                        windowDays,
                        rollingWindows: data?.rollingWindows,
                      })
                    }
                  >
                    <Text style={s.cardTitle}>Overall PM compliance-</Text>
                    <Text style={[s.bigNumber, { color: cColor }]}>
                      {compliance != null ? `${compliance.toFixed(1)}%` : "N/A"}
                    </Text>
                    <Text style={s.cardFootnote}>On-Time Execution Rate</Text>
                    <View style={s.cardProgressRow}>
                      <AnimBar pct={compliance ?? 0} color={cColor} />
                      <Text style={[s.barPct, { color: cColor }]}>
                        {compliance != null ? `${compliance.toFixed(1)}%` : "N/A"}
                      </Text>
                    </View>
                    <View style={s.compactLegend}>
                      {[["#2E8B57", "Good"], ["#AD531A", "Warn"], ["#7D0000", "Critical"]].map(([c, l]) => (
                        <View key={l} style={s.legendItem}>
                          <View style={[s.legendDot, { backgroundColor: c }]} />
                          <Text style={s.legendText}>{l}</Text>
                        </View>
                      ))}
                    </View>
                    <Ionicons name="arrow-forward-outline" size={32} color="#111111" style={s.cardArrow} />
                  </Pressable>

                  <Pressable
                    style={[s.dashboardCard, s.evidenceDashboardCard, s.flexSmall]}
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
                    <Text style={s.cardTitleSmall}>Evidence compliance-</Text>
                    <Text style={[s.mediumNumber, { color: evidenceColor(evidenceRate) }]}>
                      {evidenceRate != null ? `${evidenceRate.toFixed(1)}%` : "N/A"}
                    </Text>
                    <Text style={s.cardFootnoteSmall}>plant-wide</Text>
                    <Ionicons name="arrow-forward-outline" size={30} color="#111111" style={s.smallCardArrow} />
                  </Pressable>
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
                    style={[s.dashboardCard, s.qualityDashboardCard, s.flexSmall]}
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
                    <Text style={s.cardTitleSmall}>Rejection rate-</Text>
                    <Text style={[s.mediumNumber, { color: rejectionColor(rejectionRate) }]}>
                      {rejectionRate != null ? `${rejectionRate.toFixed(1)}%` : "N/A"}
                    </Text>
                    <Ionicons name="arrow-forward-outline" size={30} color="#111111" style={s.smallCardArrow} />
                  </Pressable>

                  <Pressable
                    style={[s.dashboardCard, s.turnaroundDashboardCard, s.flexLarge]}
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
                    <Text style={s.cardTitle}>Average approval time-</Text>
                    <Text style={[s.bigNumber, { color: turnaroundColor(turnaroundHours) }]}>
                      {turnaroundHours != null ? turnaroundHours.toFixed(1) : "N/A"}
                    </Text>
                    <Text style={s.cardFootnote}>hours</Text>
                    <Ionicons name="arrow-forward-outline" size={32} color="#111111" style={s.cardArrow} />
                  </Pressable>
                </View>

                <View style={s.dashboardPanel}>
                  <Text style={s.sectionTitle}>Line-wise Analytics</Text>
                  {(currentData?.lineWiseCompliance ?? []).length === 0 ? (
                    <View style={s.emptyCard}><Text style={s.emptyText}>No line data available</Text></View>
                  ) : (
                    <View style={s.lineList}>
                      {(currentData?.lineWiseCompliance ?? [])
                        .sort((a, b) => (b.complianceRate ?? -1) - (a.complianceRate ?? -1))
                        .map((line, idx) => {
                          const cc = complianceColor(line.complianceRate);
                          return (
                            <View key={line.lineId} style={[s.lineRow, idx > 0 && s.lineRowBorder]}>
                              <View style={s.lineTop}>
                                <Text style={s.lineName}>{line.lineName}</Text>
                                <Text style={[s.lineRate, { color: cc }]}>
                                  {line.complianceRate != null ? `${line.complianceRate.toFixed(1)}%` : "N/A"}
                                </Text>
                              </View>
                              <View style={s.barRow}>
                                <AnimBar pct={line.complianceRate ?? 0} color={cc} />
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
                              </View>
                            </View>
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
            <Pressable onPress={() => setMenuOpen(false)}>
              <Text style={[s.drawerItemText, s.drawerItemMuted]}>Dashboard</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                navigation.push("MmComplianceAnalytics", {
                  currentRate: compliance,
                  lineWiseData: currentData?.lineWiseCompliance || [],
                  windowDays,
                  rollingWindows: data?.rollingWindows,
                });
              }}
            >
              <Text style={s.drawerItemText}>Compliance analytics</Text>
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
  flexLarge: {
    flex: 1.6,
  },
  flexSmall: {
    flex: 1,
  },
  dashboardCard: {
    borderRadius: 30,
    height: 180,
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 24,
    overflow: "hidden",
    position: "relative",
  },
  complianceDashboardCard: {
    backgroundColor: "#CFD1E0",
  },
  evidenceDashboardCard: {
    backgroundColor: "#D2E0D1",
  },
  statusDashboardCard: {
    backgroundColor: "#FDE3C5",
  },
  qualityDashboardCard: {
    backgroundColor: "#FBF794",
  },
  turnaroundDashboardCard: {
    backgroundColor: "#FDE3C5",
  },
  cardTitle: {
    fontFamily: "Jost_500Medium",
    fontSize: 22,
    lineHeight: 22,
    color: "#111111",
    marginBottom: 6,
    paddingTop: 4,
  },
  cardTitleSmall: {
    fontFamily: "Jost_500Medium",
    fontSize: 18,
    lineHeight: 22,
    color: "#111111",
    marginBottom: 8,
  },
  bigNumber: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 48,
    lineHeight: 52,
    paddingTop: 6,
    color: "#000000",
  },
  mediumNumber: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 38,
    lineHeight: 44,
    color: "#000000",
    paddingTop: 8,
  },
  cardFootnote: {
    fontFamily: "Jost_400Regular",
    fontSize: 16,
    lineHeight: 18,
    color: "#111111",
    marginTop: 2,
  },
  cardFootnoteSmall: {
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    lineHeight: 16,
    color: "#111111",
    marginTop: 2,
  },
  cardProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "88%",
    marginTop: 10,
  },
  compactLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    paddingRight: 28,
  },
  cardArrow: {
    position: "absolute",
    right: 12,
    bottom: 16,
  },
  smallCardArrow: {
    position: "absolute",
    right: 8,
    bottom: 16,
  },
  timeCard: {
    width: "100%",
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 14,
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
  lineRate: { fontSize: 14, fontWeight: "700", flexShrink: 0 },
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
});
