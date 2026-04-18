import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { fetchCompletedTasks } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { CompletedTask } from "../types/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const UNDER_REVIEW_STATUSES = new Set([
  "UNDER_SUPERVISOR_REVIEW",
  "UNDER_LINE_MANAGER_REVIEW",
  "UNDER_MAINT_MANAGER_REVIEW",
]);

function getCriticalityColor(level: string | undefined) {
  switch (level?.toUpperCase()) {
    case "HIGH":   return "#8B0000";
    case "MEDIUM": return "#B35900";
    case "LOW":    return "#1E6545";
    default:       return "#7B1005";
  }
}

/** Color of the review-type pill */
function getReviewPillColor(reviewType?: string) {
  if (!reviewType) return "#888";
  if (reviewType.includes("Supervisor"))  return "#4B6FA8";
  if (reviewType.includes("Line"))        return "#7B5EA7";
  if (reviewType.includes("Maintenance")) return "#A0550E";
  return "#555";
}

const TABS = [
  { id: "Under Review", label: "Under Review", activeColor: "#EAB308" },
  { id: "Approved",     label: "Approved",     activeColor: "#16A34A" },
  { id: "Denied",       label: "Denied",       activeColor: "#DC2626", hasDot: true },
];

export function TaskApprovalScreen() {
  const navigation = useNavigation();
  const { authState } = useAuth();
  const [tasks, setTasks] = useState<CompletedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<string>("Under Review");
  const horizontalListRef = useRef<FlatList>(null);

  async function loadTasks() {
    if (!authState.session) return;
    try {
      const data = await fetchCompletedTasks(authState.session.token);
      setTasks(data);
    } catch (e) {
      console.error("Failed to fetch completed tasks", e);
    } finally {
      setLoading(false);
    }
  }

  // Re-fetch every time screen comes into focus so it stays fresh
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadTasks();
    }, [authState.session])
  );

  const handleTabPress = (tabId: string, index: number) => {
    setSelectedTab(tabId);
    horizontalListRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleMomentumScrollEnd = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (TABS[index]) setSelectedTab(TABS[index].id);
  };

  const getFilteredTasks = (tabId: string) => {
    return tasks.filter((t) => {
      const status = t.status.toUpperCase();
      if (tabId === "Under Review") return UNDER_REVIEW_STATUSES.has(status);
      if (tabId === "Approved")     return ["COMPLETED", "APPROVED"].includes(status);
      if (tabId === "Denied")       return status === "REJECTED";
      return false;
    });
  };

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
        <Text style={styles.headerTitle}>Task approval status</Text>
        <Pressable hitSlop={12}>
          <Ionicons name="search-outline" size={28} color="#111111" />
        </Pressable>
      </View>

      <View style={styles.tabsContainer}>
        {TABS.map((tab, idx) => {
          const isSelected = selectedTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[styles.tab, isSelected && { borderBottomColor: tab.activeColor }]}
              onPress={() => handleTabPress(tab.id, idx)}
            >
              <View style={styles.tabTextRow}>
                <Text style={[styles.tabText, isSelected && { color: tab.activeColor }]}>
                  {tab.label}
                </Text>
                {tab.hasDot && <View style={styles.redDot} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        ref={horizontalListRef}
        data={TABS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        renderItem={({ item: tab }) => {
          const tabTasks = getFilteredTasks(tab.id);

          return (
            <View style={{ width: SCREEN_WIDTH }}>
              <FlatList
                data={tabTasks}
                keyExtractor={(item) => String(item.scheduleExecutionId)}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No tasks found for this status.</Text>
                }
                renderItem={({ item }) => {
                  const path = [item.machineName, item.machineElementName, item.machinePartName]
                    .filter(Boolean)
                    .join(" > ");
                  const lineDisplay = item.lineCode || item.lineName || (item.lineId ? `PL${item.lineId}` : "LINE");
                  const stripeColor = getCriticalityColor(item.taskCriticality);
                  const isApproved = tab.id === "Approved";
                  const isDenied   = tab.id === "Denied";
                  const isUnderReview = tab.id === "Under Review";

                  return (
                    <View style={styles.card}>
                      <View style={[styles.leftStrip, { backgroundColor: stripeColor }]}>
                        <View style={styles.stripTextContainer}>
                          <Text style={styles.stripText}>{lineDisplay}</Text>
                        </View>
                      </View>

                      <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                          <Text style={styles.taskName}>{item.taskName}</Text>
                          {!!item.block && (
                            <View style={styles.blockBadge}>
                              <Text style={styles.blockTextLarge}>{item.block}</Text>
                            </View>
                          )}
                        </View>

                        <Text style={styles.taskPath}>{path}</Text>

                        {/* Review type pill — only in Under Review tab */}
                        {isUnderReview && !!item.reviewType && (
                          <View style={[styles.reviewPill, { backgroundColor: getReviewPillColor(item.reviewType) + "22" }]}>
                            <Ionicons
                              name="hourglass-outline"
                              size={12}
                              color={getReviewPillColor(item.reviewType)}
                            />
                            <Text style={[styles.reviewPillText, { color: getReviewPillColor(item.reviewType) }]}>
                              {item.reviewType}
                            </Text>
                          </View>
                        )}

                        <View style={styles.infoRow}>
                          <Text style={styles.supervisorLabel}>
                            {isUnderReview
                              ? `Reviewer: ${item.reviewerName ?? "Unassigned"}`
                              : `Approver: ${item.supervisorName ?? "Unassigned"}`}
                          </Text>
                          <Text style={[styles.timeRequired, isApproved && { color: "#16A34A" }]}>
                            Time taken: {item.timeTaken ?? 0} mins
                          </Text>
                        </View>

                        <View style={styles.bottomRow}>
                          <View style={{ flex: 1 }} />
                          {isDenied && (
                            <Pressable style={styles.redoButton}>
                              <Text style={styles.redoText}>REDO NOW</Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                }}
              />
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    fontFamily: "Jost_500Medium",
    fontSize: 22,
    flex: 1,
    marginLeft: 16,
    color: "#111111",
  },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginBottom: 8,
  },
  tab: {
    paddingBottom: 8,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    paddingHorizontal: 4,
    marginBottom: -1,
  },
  tabTextRow: { flexDirection: "row", alignItems: "center" },
  tabText: { fontFamily: "Jost_500Medium", fontSize: 16, color: "#9CA3AF" },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#DC2626",
    marginLeft: 4,
    marginTop: -8,
  },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 50 },
  card: {
    flexDirection: "row",
    backgroundColor: "#D6D6DF",
    borderRadius: 16,
    marginBottom: 16,
    minHeight: 110,
    position: "relative",
  },
  leftStrip: {
    width: 28,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  stripTextContainer: {
    width: 100,
    transform: [{ rotate: "-90deg" }],
    alignItems: "center",
    justifyContent: "center",
  },
  stripText: {
    fontFamily: "Jost_600SemiBold",
    color: "#FFFFFF",
    fontSize: 12,
    letterSpacing: 1.5,
    textAlign: "center",
  },
  cardContent: { flex: 1, padding: 14, paddingRight: 8 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  taskName: {
    fontFamily: "Jost_500Medium",
    fontSize: 18,
    color: "#111111",
    flex: 1,
    paddingRight: 10,
  },
  blockBadge: {
    backgroundColor: "#111111",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    right: 0,
    top: -6,
  },
  blockTextLarge: {
    fontFamily: "Jost_500Medium",
    color: "#FFFFFF",
    fontSize: 11,
    lineHeight: 14,
  },
  taskPath: {
    fontFamily: "Jost_400Regular",
    fontSize: 11,
    color: "#5E1E1E",
    marginBottom: 6,
    lineHeight: 15,
    paddingRight: 36,
  },
  reviewPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  reviewPillText: {
    fontFamily: "Jost_500Medium",
    fontSize: 11,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  supervisorLabel: {
    fontFamily: "Jost_500Medium",
    fontSize: 12,
    color: "#4A4A5A",
    flex: 1,
    paddingRight: 8,
  },
  timeRequired: {
    fontFamily: "Jost_400Regular",
    fontSize: 12,
    color: "#7A7A8D",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  redoButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#111111",
  },
  redoText: {
    fontFamily: "Jost_500Medium",
    fontSize: 13,
    color: "#111111",
  },
  emptyText: {
    fontFamily: "Jost_400Regular",
    textAlign: "center",
    marginTop: 36,
    fontSize: 15,
    color: "#666",
  },
});
