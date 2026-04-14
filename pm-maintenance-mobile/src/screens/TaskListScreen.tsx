import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { useNavigation } from "@react-navigation/native";

import { fetchTasksForToday } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { TaskDetails } from "../types/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function getCriticalityColor(level: string | undefined) {
  switch (level?.toUpperCase()) {
    case "HIGH":
      return "#8B0000"; // Deep Red for High criticality
    case "MEDIUM":
      return "#B35900"; // Dark Orange/Copper for Medium criticality
    case "LOW":
      return "#1E6545"; // Dark Green for Low criticality
    default:
      return "#7B1005"; // Fallback
  }
}

export function TaskListScreen() {
  const navigation = useNavigation();
  const { authState } = useAuth();
  const [tasks, setTasks] = useState<TaskDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const horizontalListRef = useRef<FlatList>(null);

  useEffect(() => {
    async function loadTasks() {
      if (!authState.session) return;
      try {
        const data = await fetchTasksForToday(authState.session.token);
        setTasks(data);
        if (data.length > 0) {
          const uniqueZones = Array.from(new Set(data.map((t) => t.zone))).sort();
          setSelectedZone(uniqueZones[0] ?? null);
        }
      } catch (e) {
        console.error("Failed to fetch tasks", e);
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, [authState.session]);

  const zones = useMemo(() => {
    return Array.from(new Set(tasks.map((t) => t.zone))).sort();
  }, [tasks]);

  const handleTabPress = (zone: string, index: number) => {
    setSelectedZone(zone);
    horizontalListRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleMomentumScrollEnd = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (zones[index]) {
      setSelectedZone(zones[index]);
    }
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
        <Text style={styles.headerTitle}>Today&apos;s Tasks</Text>
        <Pressable hitSlop={12}>
          <Ionicons name="search-outline" size={28} color="#111111" />
        </Pressable>
      </View>

      <View style={styles.tabsContainer}>
        {zones.map((zone, idx) => {
          const isSelected = selectedZone === zone;
          return (
            <Pressable
              key={zone}
              style={[styles.tab, isSelected && styles.tabSelected]}
              onPress={() => handleTabPress(zone, idx)}
            >
              <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
                {zone}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        ref={horizontalListRef}
        data={zones}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        // This stops FlatList from failing the scrollToIndex on mount
        getItemLayout={(data, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        renderItem={({ item: zone }) => {
          const zoneTasks = tasks.filter((t) => t.zone === zone);

          return (
            <View style={{ width: SCREEN_WIDTH }}>
              <FlatList
                data={zoneTasks}
                keyExtractor={(item) => String(item.scheduleExecutionId)}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No tasks found for this zone.</Text>
                }
                renderItem={({ item }) => {
                  const path = [item.machinePartName, item.machineElementName, item.machineName]
                    .filter(Boolean)
                    .join(" > ");
                  
                  const lineDisplay = item.lineCode || item.lineName || (item.lineId ? `PL${item.lineId}` : "LINE");
                  const stripeColor = getCriticalityColor(item.taskCriticality);
                  const displayBlock = item.block?.replace(/^Block\s+/i, "");

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
                          {!!displayBlock && (
                            <View style={styles.blockBadge}>
                              <Text style={styles.blockTextSmall}>Block</Text>
                              <Text style={styles.blockTextLarge}>{displayBlock}</Text>
                            </View>
                          )}
                        </View>
                        
                        <Text style={styles.taskPath}>{path}</Text>
                        <Text style={styles.timeRequired}>
                          Time required- {item.timeRequired} mins
                        </Text>
                      </View>
                    </View>
                  );
                }}
              />
            </View>
          );
        }}
      />

      <Pressable style={styles.fab}>
        <Text style={styles.fabText}>Help?</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
    fontSize: 24,
    flex: 1,
    marginLeft: 16,
    color: "#111111",
  },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  tab: {
    paddingBottom: 8,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    paddingHorizontal: 4,
  },
  tabSelected: {
    borderBottomColor: "#111111",
  },
  tabText: {
    fontFamily: "Jost_500Medium",
    fontSize: 20,
    color: "#9CA3AF",
  },
  tabTextSelected: {
    color: "#111111",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#E2E2E8",
    borderRadius: 24,
    marginBottom: 16,
    minHeight: 120,
    position: "relative",
  },
  leftStrip: {
    width: 32,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  stripTextContainer: {
    width: 120,
    transform: [{ rotate: "-90deg" }],
    alignItems: "center",
    justifyContent: "center",
  },
  stripText: {
    fontFamily: "Jost_600SemiBold",
    color: "#FFFFFF",
    fontSize: 14,
    letterSpacing: 2,
    textAlign: "center",
  },
  cardContent: {
    flex: 1,
    padding: 16,
    paddingRight: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  taskName: {
    fontFamily: "Jost_500Medium",
    fontSize: 20,
    color: "#111111",
    flex: 1,
    paddingRight: 12,
  },
  blockBadge: {
    backgroundColor: "#111111",
    borderRadius: 10,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    right: 0,
    top: -8,
  },
  blockTextSmall: {
    fontFamily: "Jost_400Regular",
    color: "#FFFFFF",
    fontSize: 9,
    lineHeight: 11,
  },
  blockTextLarge: {
    fontFamily: "Jost_500Medium",
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 22,
  },
  taskPath: {
    fontFamily: "Jost_400Regular",
    fontSize: 13,
    color: "#5E1E1E",
    marginBottom: 8,
    lineHeight: 18,
    paddingRight: 40,
  },
  timeRequired: {
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    color: "#7A7A8D",
  },
  emptyText: {
    fontFamily: "Jost_400Regular",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
    color: "#666",
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 24,
    backgroundColor: "#2C346F",
    borderRadius: 36,
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontFamily: "Jost_500Medium",
    color: "#FFFFFF",
    fontSize: 16,
  },
});
