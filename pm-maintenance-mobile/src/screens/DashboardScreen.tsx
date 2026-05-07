import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import {
  acknowledgeLineManagerInsight,
  fetchLineManagerAnalyticsDashboard,
  runAnalyticsSyncJob,
} from "../api/client";
import { AppMessageModal } from "../components/AppMessageModal";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { RootStackParamList } from "../types/navigation";
import type {
  ActionInsight,
  DashboardItem,
  LineManagerDashboardResponse,
  OperatorDashboardResponse,
  SupervisorDashboardResponse,
} from "../types/api";

function formatGreeting(shift?: string) {
  const normalized = shift?.toLowerCase() ?? "";

  if (normalized.includes("night")) {
    return "Good Evening";
  }

  if (normalized.includes("afternoon")) {
    return "Good Afternoon";
  }

  return "Good Morning";
}

function formatItems(items?: { itemName: string; quantity: number }[]) {
  if (!items?.length) {
    return ["No items assigned yet"];
  }

  return items.map((item) => (item.quantity > 1 ? `${item.itemName} x${item.quantity}` : item.itemName));
}

type DashboardCard = {
  title: string;
  value: number | string;
  footnote?: string;
  variant: "today" | "backlog" | "status" | "other" | "health";
  size: "large" | "small";
  navigateTo?: DashboardRouteTarget;
  statusLines?: {
    label: string;
    value: number | string;
    tone: StatusTone;
  }[];
  healthValue?: number;
};

type StatusTone = "approved" | "pending" | "denied";
type DashboardRouteTarget =
  | "TaskList"
  | "SupervisorDueApprovals"
  | "SupervisorFlags"
  | "LineManagerTodayApprovals"
  | "LineManagerBacklogApprovals"
  | "LineManagerFlags"
  | "LineManagerEquipments"
  | "BacklogTasks"
  | "TaskApproval"
  | "UpcomingTasks"
  | "FlagsRaised"
  | "LineManagerActiveTasks"
  | "EmployeeApprovalChart"
  | "LineManagerAnalyticsDashboard"
  | "ConfigParams"
  | "MmComplianceAnalytics"
  | "MmPhmCoverageAnalytics"
  | "MmEmployeeEfficiencyAnalytics";

type DashboardViewModel = {
  greetingShift?: string;
  userName: string;
  cards: DashboardCard[];
  summaryTitle?: string;
  summaryValue?: string;
  itemsHeading?: string;
  items?: string[];
  ctaLabel: string;
  ctaTarget?: DashboardRouteTarget;
  lineBreakdown?: {
    lineId: number;
    lineName: string;
    healthScore?: number;
    phmCoverageRate?: number;
    pmComplianceRate?: number;
  }[];
};

function isOperatorDashboard(dashboard: unknown): dashboard is OperatorDashboardResponse {
  return Boolean(
    dashboard &&
      typeof dashboard === "object" &&
      "taskSummary" in dashboard &&
      "taskStatus" in dashboard &&
      "timeEstimate" in dashboard,
  );
}

function isSupervisorDashboard(dashboard: unknown): dashboard is SupervisorDashboardResponse {
  return Boolean(
    dashboard &&
      typeof dashboard === "object" &&
      "todaysDueApprovals" in dashboard &&
      "openDeviations" in dashboard,
  );
}

function isLineManagerDashboard(dashboard: unknown): dashboard is LineManagerDashboardResponse {
  return Boolean(
    dashboard &&
      typeof dashboard === "object" &&
      "totalApprovalsToday" in dashboard &&
      "backlogApprovals" in dashboard &&
      "lineHealth" in dashboard,
  );
}

function formatDashboardItems(items?: DashboardItem[]) {
  return formatItems(items);
}

function buildOperatorDashboardViewModel(
  dashboard: OperatorDashboardResponse | undefined,
  fallbackName: string,
): DashboardViewModel {
  return {
    greetingShift: dashboard?.userContext.shift,
    userName: dashboard?.userContext.name || fallbackName,
    cards: [
      {
        title: "Tasks for today-",
        value: dashboard?.taskSummary.tasksToday ?? 0,
        footnote: "remaining",
        variant: "today",
        size: "large",
        navigateTo: "TaskList",
      },
      {
        title: "Tasks on\nbacklog-",
        value: dashboard?.taskSummary.backlogTasks ?? 0,
        variant: "backlog",
        size: "small",
        navigateTo: "BacklogTasks",
      },
      {
        title: "Tasks status-",
        value: "",
        variant: "status",
        size: "small",
        navigateTo: "TaskApproval",
        statusLines: [
          { label: "Approved - ", value: dashboard?.taskStatus.approved ?? 0, tone: "approved" },
          { label: "Pending - ", value: dashboard?.taskStatus.pending ?? 0, tone: "pending" },
          { label: "Denied - ", value: dashboard?.taskStatus.denied ?? 0, tone: "denied" },
        ],
      },
      {
        title: "Other tasks-",
        value: dashboard?.taskSummary.remainingTasks ?? 0,
        footnote: "Till month end",
        variant: "other",
        size: "large",
        navigateTo: "UpcomingTasks",
      },
      {
        title: "Flags\nraised-",
        value: dashboard?.flagsRaised ?? 0,
        variant: "backlog",
        size: "small",
        navigateTo: "FlagsRaised",
      },
    ],
    summaryTitle: "Total time required to finish today's tasks-",
    summaryValue: dashboard?.timeEstimate.formattedEstimate ?? "0 mins",
    itemsHeading: "Items require to attend today's tasks-",
    items: formatDashboardItems(dashboard?.requiredItems),
    ctaLabel: "Let's Start!",
    ctaTarget: "TaskList",
  };
}

function buildSupervisorDashboardViewModel(
  dashboard: SupervisorDashboardResponse | undefined,
  fallbackName: string,
): DashboardViewModel {
  return {
    userName: fallbackName,
    cards: [
      {
        title: "Today's due approvals-",
        value: dashboard?.todaysDueApprovals ?? 0,
        footnote: "due today",
        variant: "today",
        size: "large",
        navigateTo: "SupervisorDueApprovals",
      },
      {
        title: "Flags\nraised-",
        value: dashboard?.activeFlags ?? 0,
        variant: "backlog",
        size: "small",
        navigateTo: "SupervisorFlags",
      },
      {
        title: "Team status-",
        variant: "status",
        size: "small",
        navigateTo: "EmployeeApprovalChart",
        value: dashboard?.supervisedEmployeeCount ?? 0,
        footnote: "Employees",
      },
      {
        title: "Upcoming approvals-",
        value: dashboard?.upcomingApprovalsThisMonth ?? 0,
        footnote: "coming month",
        variant: "other",
        size: "large",
        navigateTo: "TaskApproval",
      },
    ],
    ctaLabel: "Let's Start!",
    ctaTarget: "TaskApproval",
  };
}

function buildLineManagerDashboardViewModel(
  dashboard: LineManagerDashboardResponse | undefined,
  fallbackName: string,
  windowDays: 30 | 365,
  selectedLineId: number | null,
): DashboardViewModel {
  const metrics = dashboard?.rollingWindows?.[String(windowDays)];
  
  let lineHealth = metrics?.lineHealth;
  let phmCoverageRate = metrics?.phmCoverageRate;
  let pmComplianceRate = metrics?.pmComplianceRate;
  let employeeEfficiency = metrics?.employeeEfficiency;
  
  // Use specific line metrics if selected. If no line is selected yet, 
  // we'll default to the first one in the component state, but if 
  // this is called with null, it will show the aggregate (which we want to avoid via state).
  if (selectedLineId != null && metrics?.lineMetrics) {
    const line = metrics.lineMetrics.find(l => l.lineId === selectedLineId);
    if (line) {
      lineHealth = line.healthScore;
      phmCoverageRate = line.phmCoverageRate;
      pmComplianceRate = line.pmComplianceRate;
      employeeEfficiency = line.employeeEfficiency;
    }
  }

  return {
    userName: fallbackName,
    cards: [
      {
        title: "PM compliance-",
        value: pmComplianceRate != null ? `${Math.round(pmComplianceRate)}%` : "N/A",
        footnote: "line quality",
        variant: "today",
        size: "large",
        navigateTo: "MmComplianceAnalytics",
      },
      {
        title: "PHM coverage-",
        value: phmCoverageRate != null ? `${Math.round(phmCoverageRate)}%` : "N/A",
        footnote: "prediction coverage",
        variant: "status",
        size: "small",
        navigateTo: "MmPhmCoverageAnalytics",
      },
      {
        title: "Line health-",
        value: lineHealth != null ? `${Math.round(lineHealth)}%` : "N/A",
        footnote: "equipment health",
        variant: "health",
        size: "small",
        navigateTo: "LineManagerAnalyticsDashboard",
        healthValue: lineHealth,
      },
      {
        title: "Employee efficiency-",
        value: employeeEfficiency != null ? `${Math.round(employeeEfficiency)}%` : "N/A",
        footnote: "rolling window",
        variant: "other",
        size: "small",
        navigateTo: "MmEmployeeEfficiencyAnalytics",
      },
      {
        title: "Flags\nraised-",
        value: dashboard?.totalFlagsRaised ?? 0,
        variant: "backlog",
        size: "small",
        navigateTo: "LineManagerFlags",
      },
      {
        title: "Active line tasks\nfor today-",
        value: dashboard?.activeTasksToday ?? 0,
        variant: "backlog",
        size: "small",
        navigateTo: "LineManagerActiveTasks",
      },
      {
        title: "Today's approvals-",
        value: dashboard?.totalApprovalsToday ?? 0,
        footnote: "due today",
        variant: "today",
        size: "large",
        navigateTo: "LineManagerTodayApprovals",
      },
      {
        title: "Backlog\napprovals-",
        value: dashboard?.backlogApprovals ?? 0,
        variant: "other",
        size: "small",
        navigateTo: "LineManagerBacklogApprovals",
      },
    ],
    lineBreakdown: metrics?.lineMetrics,
    ctaLabel: "Review Tasks",
    ctaTarget: "LineManagerTodayApprovals",
  };
}

function getCardStyle(variant: DashboardCard["variant"]) {
  switch (variant) {
    case "today":
      return styles.todayCard;
    case "backlog":
      return styles.backlogCard;
    case "status":
      return styles.statusCard;
    case "other":
      return styles.otherTasksCard;
    case "health":
      return styles.statusCard;
    default:
      return styles.todayCard;
  }
}

function getHealthCardStyle(value?: number) {
  if (value == null) return styles.statusCard;
  const health = value ?? 0;
  if (health >= 90) return styles.healthGoodCard;
  if (health >= 70) return styles.healthWarningCard;
  return styles.healthBadCard;
}

function getStatusToneStyle(tone: StatusTone) {
  switch (tone) {
    case "approved":
      return styles.approvedText;
    case "pending":
      return styles.pendingText;
    case "denied":
      return styles.deniedText;
    default:
      return styles.pendingText;
  }
}

export function DashboardScreen() {
  const { width } = useWindowDimensions();
  const { authState, signOut, refreshDashboard } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [syncingAnalytics, setSyncingAnalytics] = useState(false);
  const [syncModal, setSyncModal] = useState<{
    visible: boolean;
    type: "success" | "failure";
    title: string;
    message: string;
  }>({ visible: false, type: "success", title: "", message: "" });
  const [lineInsights, setLineInsights] = useState<ActionInsight[]>([]);
  const [closingInsightId, setClosingInsightId] = useState<number | null>(null);
  const [windowDays, setWindowDays] = useState<30 | 365>(30);
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const [lineSelectorVisible, setLineSelectorVisible] = useState(false);
  const [insightsModalVisible, setInsightsModalVisible] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<ActionInsight | null>(null);
  const [showInsightModal, setShowInsightModal] = useState(false);
  const translateX = useRef(new Animated.Value(-400)).current;
  const session = authState.session;
  const dashboard = session?.dashboard;

  // Stable ref so the useFocusEffect callback always calls the latest
  // refreshDashboard without it being a reactive dependency.
  const refreshRef = useRef(refreshDashboard);
  refreshRef.current = refreshDashboard;

  // Empty dependency array → runs exactly ONCE per screen focus event.
  // No infinite loop because we never depend on the refreshDashboard identity.
  useFocusEffect(
    useCallback(() => {
      refreshRef.current();
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
  );
  const fallbackName = session?.fullName || "user";
  const dashboardView = useMemo(() => {
    if (session?.dashboardKind === "supervisor" || isSupervisorDashboard(dashboard)) {
      return buildSupervisorDashboardViewModel(
        isSupervisorDashboard(dashboard) ? dashboard : undefined,
        fallbackName,
      );
    }

    if (session?.dashboardKind === "lineManager" || isLineManagerDashboard(dashboard)) {
      const lmDashboard = isLineManagerDashboard(dashboard) ? dashboard : undefined;
      return buildLineManagerDashboardViewModel(
        lmDashboard,
        fallbackName,
        windowDays,
        selectedLineId
      );
    }

    return buildOperatorDashboardViewModel(isOperatorDashboard(dashboard) ? dashboard : undefined, fallbackName);
  }, [dashboard, fallbackName, session?.dashboardKind, windowDays, selectedLineId]);
  const greeting = formatGreeting(dashboardView.greetingShift);
  const userName = dashboardView.userName;
  const isTablet = width >= 768;
  const horizontalPadding = isTablet ? 40 : 18;
  const contentMaxWidth = isTablet ? 920 : 560;
  const drawerWidth = Math.min(width * 0.78, 360);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isLineManager = session?.dashboardKind === "lineManager" || isLineManagerDashboard(dashboard);

  const loadLineInsights = useCallback(async () => {
    if (!session?.token || !isLineManager) {
      setLineInsights([]);
      return;
    }
    try {
      const analytics = await fetchLineManagerAnalyticsDashboard(session.token);
      setLineInsights(analytics.actionInsights ?? []);
    } catch {
      setLineInsights([]);
    }
  }, [isLineManager, session?.token]);

  const drawerItems = useMemo(
    () =>
      isLineManager
        ? [
            { label: "Dashboard", target: undefined },
            { label: "Analytics dashboard", target: "LineManagerAnalyticsDashboard" as DashboardRouteTarget },
            { label: "Line equipments", target: "LineManagerEquipments" as DashboardRouteTarget },
            { label: "Flags raised", target: "LineManagerFlags" as DashboardRouteTarget },
            { label: "Backlogs", target: "LineManagerBacklogApprovals" as DashboardRouteTarget },
            { label: "Active tasks", target: "LineManagerActiveTasks" as DashboardRouteTarget },
            { label: "Config parameters", target: "ConfigParams" as DashboardRouteTarget },
          ]
        : [
            { label: "Dashboard", target: undefined },
            { label: "Plant layout", target: undefined },
            { label: "Machine manuals", target: undefined },
            { label: "Backlogs", target: "BacklogTasks" as DashboardRouteTarget },
            { label: "Flags raised", target: "FlagsRaised" as DashboardRouteTarget },
            { label: "Profile", target: undefined },
          ],
    [isLineManager],
  );

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: menuOpen ? 0 : -(drawerWidth + 50),
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [menuOpen, drawerWidth]);

  useEffect(() => {
    loadLineInsights();
  }, [loadLineInsights]);

  // Set first line as default if none selected
  useEffect(() => {
    if (selectedLineId === null && dashboardView.lineBreakdown?.length) {
      setSelectedLineId(dashboardView.lineBreakdown[0].lineId);
    }
  }, [dashboardView.lineBreakdown, selectedLineId]);

  // Refresh data in background when window changes
  useEffect(() => {
    refreshDashboard();
  }, [windowDays]);

  useFocusEffect(
    useCallback(() => {
      loadLineInsights();
    }, [loadLineInsights]),
  );

  function navigateToDashboardTarget(target?: DashboardRouteTarget) {
    if (!target) {
      return;
    }

    switch (target) {
      case "TaskList":
        navigation.navigate("TaskList");
        break;
      case "SupervisorDueApprovals":
        navigation.navigate("SupervisorDueApprovals");
        break;
      case "SupervisorFlags":
        navigation.navigate("SupervisorFlags");
        break;
      case "LineManagerTodayApprovals":
        navigation.navigate("LineManagerTodayApprovals");
        break;
      case "LineManagerBacklogApprovals":
        navigation.navigate("LineManagerBacklogApprovals");
        break;
      case "LineManagerFlags":
        navigation.navigate("LineManagerFlags");
        break;
      case "LineManagerEquipments":
        navigation.navigate("LineManagerEquipments");
        break;
      case "BacklogTasks":
        navigation.navigate("BacklogTasks");
        break;
      case "TaskApproval":
        navigation.navigate("TaskApproval");
        break;
      case "UpcomingTasks":
        navigation.navigate("UpcomingTasks");
        break;
      case "EmployeeApprovalChart":
        navigation.navigate("EmployeeApprovalChart");
        break;
      case "FlagsRaised":
        navigation.navigate("FlagsRaised");
        break;
      case "LineManagerActiveTasks":
        navigation.navigate("LineManagerActiveTasks");
        break;
      case "LineManagerAnalyticsDashboard":
        navigation.navigate("LineManagerAnalyticsDashboard", { lineId: selectedLineId || undefined });
        break;
      case "ConfigParams":
        navigation.navigate("ConfigParams");
        break;
      case "MmComplianceAnalytics":
        navigation.navigate("MmComplianceAnalytics", {
          windowDays,
          rollingWindows: (dashboard as LineManagerDashboardResponse)?.rollingWindows,
          isLineManager: true,
          lineId: selectedLineId,
        });
        break;
      case "MmPhmCoverageAnalytics":
        navigation.navigate("MmPhmCoverageAnalytics", {
          windowDays,
          rollingWindows: (dashboard as LineManagerDashboardResponse)?.rollingWindows,
          isLineManager: true,
          lineId: selectedLineId,
        });
        break;
      case "MmEmployeeEfficiencyAnalytics":
        navigation.navigate("MmEmployeeEfficiencyAnalytics", {
          windowDays,
          rollingWindows: (dashboard as LineManagerDashboardResponse)?.rollingWindows,
          isLineManager: true,
          lineId: selectedLineId,
        });
        break;
      default:
        break;
    }
  }

  async function handleAnalyticsSync() {
    if (!session?.token || syncingAnalytics) return;
    setSyncingAnalytics(true);
    try {
      await runAnalyticsSyncJob(session.token);
      await refreshDashboard();
      await loadLineInsights();
      setSyncModal({
        visible: true,
        type: "success",
        title: "Analytics sync done",
        message: "Predictive maintenance analytics were refreshed. Check results in the analytics dashboard.",
      });
    } catch (error) {
      setSyncModal({
        visible: true,
        type: "failure",
        title: "Sync failed",
        message: error instanceof Error ? error.message : "Analytics sync could not be completed.",
      });
    } finally {
      setSyncingAnalytics(false);
    }
  }

  async function handleCloseInsight(insightId: number) {
    if (!session?.token) return;
    setClosingInsightId(insightId);
    try {
      await acknowledgeLineManagerInsight(session.token, insightId);
      setLineInsights((current) => current.filter((insight) => insight.insightId !== insightId));
    } finally {
      setClosingInsightId(null);
    }
  }

  async function handleAcknowledgeInsight() {
    if (!session?.token || !selectedInsight || closingInsightId) return;
    setClosingInsightId(selectedInsight.insightId);
    try {
      await acknowledgeLineManagerInsight(session.token, selectedInsight.insightId);
      setLineInsights((current) => current.filter((i) => i.insightId !== selectedInsight.insightId));
      setShowInsightModal(false);
      setSelectedInsight(null);
    } catch (error) {
      console.error("Acknowledge failed:", error);
    } finally {
      setClosingInsightId(null);
    }
  }

  function getRiskTone(score?: number) {
    if (score == null) return "Stable";
    if (score >= 80) return "Critical";
    if (score >= 60) return "Warning";
    return "Stable";
  }

  function formatPercent(val?: number) {
    if (val == null) return "N/A";
    return `${Math.round(val)}%`;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.contentInner, { maxWidth: contentMaxWidth }]}>
            <View style={styles.headerRow}>
              <Pressable onPress={() => setMenuOpen(true)} hitSlop={8} style={styles.headerIcon}>
                <Ionicons name="menu-outline" size={isTablet ? 40 : 34} color="#525252" />
              </Pressable>

              <View style={styles.headerActions}>
                {isLineManager ? (
                  <Pressable
                    style={[styles.syncButton, syncingAnalytics && styles.syncButtonDisabled]}
                    onPress={handleAnalyticsSync}
                    disabled={syncingAnalytics}
                  >
                    {syncingAnalytics ? (
                      <ActivityIndicator size="small" color="#111111" />
                    ) : (
                      <Ionicons name="sync-outline" size={20} color="#111111" />
                    )}
                  </Pressable>
                ) : null}
                <View style={styles.profileIcon}>
                  <Ionicons name="person-circle-outline" size={isTablet ? 64 : 56} color="#676767" />
                </View>
              </View>
            </View>

            <Text style={[styles.greetingText, isTablet && styles.greetingTextTablet]}>
              {greeting} {userName}
            </Text>

            {isLineManager && lineInsights.length > 0 && (
              <View style={[styles.dashboardPanel, { marginBottom: 24, backgroundColor: "#FFF7ED" }]}>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitleNoMargin}>Actionable Insights</Text>
                  <View style={[styles.badge, { backgroundColor: "#FFEDD5" }]}>
                    <Text style={[styles.badgeText, { color: "#9A3412" }]}>{lineInsights.length}</Text>
                  </View>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12, paddingRight: 20 }}
                >
                  {lineInsights.map((insight) => (
                    <Pressable
                      key={insight.insightId}
                      style={styles.insightCardMini}
                      onPress={() => {
                        setSelectedInsight(insight);
                        setShowInsightModal(true);
                      }}
                    >
                      <View
                        style={[
                          styles.insightSeverityDot,
                          { backgroundColor: insight.severity === "CRITICAL" ? "#EF4444" : "#F59E0B" },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.insightTitleMini} numberOfLines={2}>
                          {insight.message}
                        </Text>
                        <Text style={styles.insightTargetMini}>
                          {insight.partName || insight.equipmentName || "Unknown Part"}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {isLineManager ? (
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
            ) : null}

            {dashboardView.lineBreakdown?.length ? (
              <View style={styles.lineBreakdownSection}>
                <Text style={styles.lineBreakdownTitle}>Line Performance breakdown</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lineBreakdownScroll}>
                  {dashboardView.lineBreakdown.map((line) => {
                    const health = line.healthScore ?? 0;
                    const healthColor = health >= 90 ? "#165A15" : health >= 70 ? "#A29200" : "#9B1B1B";
                    return (
                      <View key={line.lineId} style={styles.lineBreakdownCard}>
                        <View style={styles.lineBreakdownHeader}>
                          <Text style={styles.lineBreakdownName} numberOfLines={1}>{line.lineName}</Text>
                          <View style={[styles.lineHealthPill, { backgroundColor: healthColor + "15" }]}>
                            <Text style={[styles.lineHealthPillText, { color: healthColor }]}>
                              {Math.round(health)}% Health
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.lineBreakdownMetrics}>
                          <View style={styles.lineBreakdownMetric}>
                            <Text style={styles.lineBreakdownMetricVal}>{line.pmComplianceRate != null ? `${Math.round(line.pmComplianceRate)}%` : "N/A"}</Text>
                            <Text style={styles.lineBreakdownMetricLabel}>PM Compliance</Text>
                          </View>
                          <View style={styles.lineBreakdownDivider} />
                          <View style={styles.lineBreakdownMetric}>
                            <Text style={styles.lineBreakdownMetricVal}>{line.phmCoverageRate != null ? `${Math.round(line.phmCoverageRate)}%` : "N/A"}</Text>
                            <Text style={styles.lineBreakdownMetricLabel}>PHM Coverage</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {isLineManager && (dashboardView.lineBreakdown?.length ?? 0) > 0 && (
              <View style={styles.lineSelectorContainer}>
                <Text style={styles.lineSelectorTitle}>Select Line</Text>
                <Pressable 
                  style={styles.lineSelectorBtn} 
                  onPress={() => setLineSelectorVisible(true)}
                  hitSlop={20}
                >
                  <Ionicons name="location-outline" size={18} color={colors.primary} />
                  <Text style={styles.lineSelectorBtnText}>
                    {dashboardView.lineBreakdown?.find(l => l.lineId === selectedLineId)?.lineName || "Select a line"}
                  </Text>
                  <Ionicons name="chevron-down-outline" size={18} color="#626781" />
                </Pressable>
              </View>
            )}

            <View style={styles.cardsWrapper}>
              {Array.from({ length: Math.ceil(dashboardView.cards.length / 2) }).map((_, rowIndex) => {
                const startIndex = rowIndex * 2;
                return (
                  <View key={startIndex} style={styles.cardsRow}>
                    {dashboardView.cards.slice(startIndex, startIndex + 2).map((card) => (
                      <Pressable
                        key={card.title}
                        style={[
                          styles.card,
                          card.variant === "health" ? getHealthCardStyle(card.healthValue) : getCardStyle(card.variant),
                          card.size === "large" ? styles.flexLarge : styles.flexSmall,
                        ]}
                        onPress={() => navigateToDashboardTarget(card.navigateTo)}
                      >
                        {card.statusLines ? (
                          <>
                            <Text style={styles.statusTitle}>{card.title}</Text>
                            {card.statusLines.map((line) => (
                              <Text key={line.label} style={styles.statusLine}>
                                {line.label}
                                <Text style={getStatusToneStyle(line.tone)}>{line.value}</Text>
                              </Text>
                            ))}
                            <Ionicons name="arrow-forward-outline" size={28} color="#111111" style={styles.statusArrow} />
                          </>
                        ) : (
                          <>
                            <Text style={card.size === "large" ? styles.cardTitle : styles.cardTitleSmall}>
                              {card.title}
                            </Text>
                            <Text style={[
                              card.size === "large" ? styles.bigNumber : styles.mediumNumber,
                              width < 380 && { fontSize: card.size === "large" ? 40 : 36 }
                            ]}>
                              {card.value}
                            </Text>
                            {card.footnote ? (
                              <Text style={card.variant === "other" ? styles.cardFootnoteAlt : styles.cardFootnote}>
                                {card.footnote}
                              </Text>
                            ) : null}
                            <Ionicons
                              name="arrow-forward-outline"
                              size={card.size === "large" ? 32 : 30}
                              color="#111111"
                              style={card.size === "large" ? styles.cardArrow : styles.smallCardArrow}
                            />
                          </>
                        )}
                      </Pressable>
                    ))}
                  </View>
                );
              })}
            </View>

            {dashboardView.summaryTitle && dashboardView.summaryValue ? (
              <View style={styles.timeCard}>
                <Text style={styles.timeCardTitle}>{dashboardView.summaryTitle}</Text>
                <Text style={styles.timeCardValue}>{dashboardView.summaryValue}</Text>
              </View>
            ) : null}

            {dashboardView.itemsHeading && dashboardView.items?.length ? (
              <View style={styles.itemsSection}>
                <Text style={styles.itemsHeading}>{dashboardView.itemsHeading}</Text>
                {dashboardView.items.map((item) => (
                  <View key={item} style={styles.itemRow}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.itemText}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Pressable
              style={[styles.primaryButton, isTablet && styles.primaryButtonTablet]}
              onPress={() => navigateToDashboardTarget(dashboardView.ctaTarget)}
            >
              <Text style={styles.primaryButtonText}>{dashboardView.ctaLabel}</Text>
            </Pressable>
          </View>
        </ScrollView>

        {menuOpen && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMenuOpen(false)}
            pointerEvents={menuOpen ? "auto" : "none"}
          />
        )}
        <Animated.View 
          style={[styles.drawer, { width: drawerWidth, transform: [{ translateX }] }]}
          pointerEvents={menuOpen ? "auto" : "none"}
        >
          <Pressable style={styles.drawerHeader} onPress={() => setMenuOpen(false)}>
            <Ionicons style={styles.drawerHeaderArrow} name="arrow-back-outline" size={34} color="#111111" />
            <Text style={styles.drawerHeaderText}>Menu</Text>
          </Pressable>

          <View style={styles.drawerItems}>
            {drawerItems.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => {
                  setMenuOpen(false);
                  navigateToDashboardTarget(item.target);
                }}
                disabled={!item.target}
              >
                <Text style={[styles.drawerItemText, !item.target && styles.drawerItemMuted]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.drawerFooter}>
            <Pressable
              onPress={signOut}
              style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
            >
              <Text style={styles.logoutText}>Log out</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
      <AppMessageModal
        visible={syncModal.visible}
        type={syncModal.type}
        title={syncModal.title}
        message={syncModal.message}
        primaryActionLabel={syncModal.type === "success" ? "Open analytics" : "OK"}
        onPrimaryAction={() => {
          const shouldOpenAnalytics = syncModal.type === "success";
          setSyncModal((current) => ({ ...current, visible: false }));
          if (shouldOpenAnalytics) {
            navigation.navigate("LineManagerAnalyticsDashboard", {});
          }
        }}
      />

      <Modal visible={showInsightModal} transparent animationType="fade" onRequestClose={() => setShowInsightModal(false)}>
        <View style={styles.modalOverlayFull}>
          <View style={styles.modalContentFull}>
            <View style={styles.modalHeaderFull}>
              <Text style={styles.modalTitleFull}>Insight Details</Text>
              <Pressable onPress={() => setShowInsightModal(false)} hitSlop={15}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            {selectedInsight && (
              <View
                style={[
                  styles.insightCardModal,
                  selectedInsight.severity === "CRITICAL" ? styles.insightCriticalModal : styles.insightWarningModal,
                ]}
              >
                <View style={styles.insightCardHeaderModal}>
                  <View style={styles.insightTitleWrapModal}>
                    <Text style={styles.insightSeverityModal}>{selectedInsight.severity || "INFO"}</Text>
                    <Text style={styles.insightPartModal}>
                      {selectedInsight.partName || selectedInsight.equipmentName || "Monitored Component"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.insightMessageModal}>{selectedInsight.message}</Text>

                <View style={styles.metricRowModal}>
                  <View style={styles.metricPillModal}>
                    <Text style={styles.metricLabelModal}>Risk</Text>
                    <Text style={[styles.metricValueModal, { color: getRiskTone(selectedInsight.riskScore) === "Critical" ? "#B42318" : "#111111" }]}>
                      {formatPercent(selectedInsight.riskScore)}
                    </Text>
                  </View>
                  <View style={styles.metricPillModal}>
                    <Text style={styles.metricLabelModal}>Confidence</Text>
                    <Text style={styles.metricValueModal}>{formatPercent(selectedInsight.confidenceScore)}</Text>
                  </View>
                  <View style={styles.metricPillModal}>
                    <Text style={styles.metricLabelModal}>Life Left</Text>
                    <Text style={styles.metricValueModal}>{selectedInsight.daysRemaining ?? "N/A"}d</Text>
                  </View>
                </View>
              </View>
            )}

            <Pressable
              style={[styles.primaryButton, { marginTop: 24 }]}
              onPress={handleAcknowledgeInsight}
              disabled={closingInsightId != null}
            >
              {closingInsightId != null ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Acknowledge Alert</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={lineSelectorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLineSelectorVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setLineSelectorVisible(false)}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Select Line</Text>
            <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
              {dashboardView.lineBreakdown?.map((line) => (
                <Pressable 
                  key={line.lineId}
                  style={[styles.pickerOption, selectedLineId === line.lineId && styles.pickerOptionSelected]}
                  onPress={() => { setSelectedLineId(line.lineId); setLineSelectorVisible(false); }}
                >
                  <Text style={[styles.pickerOptionText, selectedLineId === line.lineId && styles.pickerOptionTextSelected]}>
                    {line.lineName}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 0,
    paddingBottom: 0,
    alignItems: "center",
  },
  contentInner: {
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
    paddingHorizontal: 0,
  },
  toggleContainer: {
    flexDirection: "row",
    padding: 4,
    backgroundColor: colors.primaryMuted,
    borderRadius: 16,
    gap: 12,
    marginBottom: 16,
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  syncButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#F5E4C9",
    alignItems: "center",
    justifyContent: "center",
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
  greetingText: {
    fontFamily: "Jost_500Medium",
    fontSize: 26,
    lineHeight: 30,
    color: "#111111",
    marginBottom: 28,
    paddingHorizontal: 6,
  },
  greetingTextTablet: {
    fontSize: 34,
    lineHeight: 38,
  },
  cardsWrapper: {
    gap: 16,
    marginBottom: 24,
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
  card: {
    borderRadius: 30,
    position: "relative",
    overflow: "hidden",
  },
  todayCard: {
    backgroundColor: "#CFD1E0",
    height: 170,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  backlogCard: {
    backgroundColor: "#FDE3C5",
    height: 170,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  statusCard: {
    backgroundColor: "#D2E0D1",
    height: 170,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  healthGoodCard: {
    backgroundColor: "#D8EAD7",
    height: 170,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  healthWarningCard: {
    backgroundColor: "#F5E4C9",
    height: 170,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  healthBadCard: {
    backgroundColor: "#FDE8E7",
    height: 170,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  otherTasksCard: {
    backgroundColor: "#FBF794",
    height: 170,
    paddingTop: 20,
    paddingHorizontal: 26,
    paddingBottom: 24,
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
    fontFamily: "Jost_500Medium",
    fontSize: 48,
    lineHeight: 52,
    paddingTop: 6,
    color: "#000000",
  },
  mediumNumber: {
    fontFamily: "Jost_500Medium",
    fontSize: 48,
    lineHeight: 52,
    color: "#000000",
    marginTop: 0,
    paddingTop: 8,
  },
  cardFootnote: {
    fontFamily: "Jost_400Regular",
    fontSize: 16,
    lineHeight: 18,
    color: "#111111",
    marginTop: 2,
  },
  cardFootnoteAlt: {
    fontFamily: "Jost_400Regular",
    fontSize: 16,
    lineHeight: 18,
    color: "#111111",
    marginTop: 4,
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
  otherCardArrow: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
  statusTitle: {
    fontFamily: "Jost_500Medium",
    fontSize: 18,
    lineHeight: 18,
    color: "#111111",
    marginBottom: 12,
    paddingTop: 4,
  },
  statusLine: {
    fontFamily: "Jost_400Regular",
    fontSize: 15,
    lineHeight: 20,
    color: "#111111",
    marginBottom: 6,
  },
  approvedText: {
    color: "#165A15",
    fontFamily: "Jost_600SemiBold",
  },
  pendingText: {
    color: "#A29200",
    fontFamily: "Jost_600SemiBold",
  },
  deniedText: {
    color: "#9B1B1B",
    fontFamily: "Jost_600SemiBold",
  },
  statusArrow: {
    position: "absolute",
    right: 12,
    bottom: 16,
  },
  timeCard: {
    width: "100%",
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 10,
    marginBottom: 36,
  },
  timeCardTitle: {
    fontFamily: "Jost_500Medium",
    fontSize: 18,
    lineHeight: 26,
    color: "#111111",
    textAlign: "center",
    marginBottom: 16,
  },
  timeCardValue: {
    fontFamily: "Jost_500Medium",
    fontSize: 50,
    lineHeight: 54,
    color: "#167C16",
    textAlign: "center",
  },
  itemsSection: {
    width: "90%",
    paddingHorizontal: 6,
    marginBottom: 40,
    marginLeft: 8,
  },
  itemsHeading: {
    fontFamily: "Jost_500Medium",
    fontSize: 21,
    lineHeight: 26,
    color: "#111111",
    marginBottom: 20,
  },
  itemBullet: {
    fontFamily: "Jost_400Regular",
    fontSize: 18,
    lineHeight: 28,
    color: "#111111",
    marginBottom: 2,
    marginLeft: 12,
  },
  primaryButton: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 340,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#131010",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonTablet: {
    maxWidth: 420,
  },
  primaryButtonText: {
    fontFamily: "Jost_500Medium",
    fontSize: 24,
    lineHeight: 28,
    color: "#FFFFFF",
    paddingTop: 4,
  },
  modalRoot: {
    flex: 1,
    flexDirection: "row",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
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
    lineHeight: 20,
    paddingTop: 2,
    color: "#2F2F2F",
  },
  dashboardInsights: {
    gap: 10,
    marginBottom: 22,
    paddingHorizontal: 2,
  },
  dashboardInsightsTitle: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 17,
    color: "#111111",
  },
  dashboardInsightCard: {
    borderRadius: 18,
    backgroundColor: "#FDE8E7",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dashboardInsightTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  dashboardInsightTextWrap: {
    flex: 1,
  },
  dashboardInsightSeverity: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 11,
    color: "#B42318",
    marginBottom: 2,
  },
  dashboardInsightMessage: {
    fontFamily: "Jost_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: "#333747",
  },
  dashboardInsightClose: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  dashboardInsightMeta: {
    fontFamily: "Jost_500Medium",
    fontSize: 12,
    color: "#6B3440",
    marginTop: 8,
  },
  dashboardInsightEmpty: {
    borderRadius: 16,
    backgroundColor: "#F5F6FA",
    padding: 14,
  },
  dashboardInsightEmptyText: {
    fontFamily: "Jost_400Regular",
    fontSize: 13,
    color: "#626781",
  },
  dashboardInsightsCard: {
    borderRadius: 20,
    backgroundColor: "#F5F6FA",
    overflow: "hidden",
  },
  dashboardInsightsScroll: {
    maxHeight: 280,
  },
  dashboardInsightsScrollContent: {
    padding: 10,
    gap: 10,
  },
  dashboardInsightsHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  dashboardInsightsHintText: {
    fontFamily: "Jost_400Regular",
    fontSize: 11,
    color: "#626781",
  },
  dashboardInsightCritical: {
    backgroundColor: "#FDE8E7",
  },
  dashboardInsightWarning: {
    backgroundColor: "#F5E4C9",
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
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },

  bullet: {
    fontFamily: "Jost_400Regular",
    fontSize: 20,
    lineHeight: 28,
    color: "#111111",
  },

  itemText: {
    fontFamily: "Jost_400Regular",
    fontSize: 18,
    lineHeight: 26,
    color: "#111111",
    marginLeft: 8,
  },
  lineBreakdownSection: {
    marginBottom: 28,
    width: "100%",
  },
  lineBreakdownTitle: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 20,
    color: "#111111",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  lineBreakdownScroll: {
    paddingRight: 20,
    gap: 16,
  },
  lineBreakdownCard: {
    width: 260,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EBEBF5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  lineBreakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  lineBreakdownName: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 18,
    color: "#111111",
    flex: 1,
    marginRight: 8,
  },
  lineHealthPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lineHealthPillText: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 12,
  },
  lineBreakdownMetrics: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    backgroundColor: "#F8F9FE",
    borderRadius: 16,
    padding: 12,
  },
  lineBreakdownMetric: {
    alignItems: "center",
    flex: 1,
  },
  lineBreakdownMetricVal: {
    fontFamily: "Jost_500Medium",
    fontSize: 18,
    color: "#111111",
    marginBottom: 2,
  },
  lineBreakdownMetricLabel: {
    fontFamily: "Jost_400Regular",
    fontSize: 10,
    color: "#626781",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  lineBreakdownDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 4,
  },
  lineSelectorContainer: {
    width: "100%",
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  lineSelectorTitle: {
    fontFamily: "Jost_500Medium",
    fontSize: 14,
    color: "#626781",
    marginBottom: 8,
  },
  lineSelectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F6FA",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 10,
  },
  lineSelectorBtnText: {
    flex: 1,
    fontFamily: "Jost_600SemiBold",
    fontSize: 15,
    color: "#111111",
  },
  cardSelectorIcon: {
    position: "absolute",
    right: 18,
    top: 18,
    zIndex: 10,
    padding: 4,
  },
  pickerModalContent: {
    width: "85%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    maxHeight: "70%",
    alignSelf: "center",
    marginTop: "auto",
    marginBottom: "auto",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  pickerModalTitle: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 20,
    color: "#111111",
    marginBottom: 20,
    textAlign: "center",
  },
  pickerScroll: {
    maxHeight: 300,
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: "#F9FAFB",
  },
  pickerOptionSelected: {
    backgroundColor: "#CFD1E0",
  },
  pickerOptionText: {
    fontFamily: "Jost_400Regular",
    fontSize: 17,
    color: "#111111",
  },
  pickerOptionTextSelected: {
    fontFamily: "Jost_600SemiBold",
    color: colors.primary,
  },
  topActionsContainer: {
    width: "100%",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  orangeInsightsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FF8C00", // Solid Orange
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#FF8C00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  orangeInsightsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  orangeInsightsText: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  insightCountBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  insightCountText: {
    fontFamily: "Jost_700Bold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  emptyInsightsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F5F6FA",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#EBEBF5",
  },
  emptyInsightsText: {
    fontFamily: "Jost_500Medium",
    fontSize: 14,
    color: "#626781",
  },
  insightsModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: "auto",
    height: "80%",
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 22,
    color: "#111111",
  },
  modalScroll: {
    maxHeight: 400,
  },
  sectionTitleNoMargin: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
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
  insightTitleMini: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
    lineHeight: 18,
    marginBottom: 4,
  },
  insightTargetMini: {
    fontSize: 12,
    color: colors.textMuted,
  },
  modalOverlayFull: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContentFull: {
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
  modalHeaderFull: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitleFull: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  insightCardModal: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  insightCriticalModal: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  insightWarningModal: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FEF3C7",
  },
  insightCardHeaderModal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  insightTitleWrapModal: {
    flex: 1,
  },
  insightSeverityModal: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  insightPartModal: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  insightMessageModal: {
    fontSize: 14,
    lineHeight: 20,
    color: "#374151",
    marginBottom: 16,
  },
  metricRowModal: {
    flexDirection: "row",
    gap: 8,
  },
  metricPillModal: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.6)",
    padding: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  metricLabelModal: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricValueModal: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  dashboardPanel: {
    width: "100%",
    backgroundColor: "#FFF7ED",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#FFEDD5",
    padding: 16,
    gap: 12,
  },
});
