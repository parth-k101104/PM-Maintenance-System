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
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { fetchBacklogTasks } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { TaskLegendModal } from "../components/TaskLegendModal";
import { colors } from "../theme/colors";
import { TaskDetails } from "../types/api";
import { RootStackParamList } from "../types/navigation";

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

export function BacklogTasksScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { authState } = useAuth();
  const [tasks, setTasks] = useState<TaskDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [legendVisible, setLegendVisible] = useState(false);
  const horizontalListRef = useRef<FlatList>(null);

  useEffect(() => {
    async function loadTasks() {
      if (!authState.session) return;
      try {
        const data = await fetchBacklogTasks(authState.session.token);
        setTasks(data);
        if (data.length > 0) {
          const uniqueZones = Array.from(new Set(data.map((t) => t.zone))).sort();
          setSelectedZone(uniqueZones[0] ?? null);
        }
      } catch (e) {
        console.error("Failed to fetch backlog tasks", e);
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
        <Text style={styles.headerTitle}>Tasks on Backlog</Text>
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
        ListEmptyComponent={
          <Text style={styles.emptyText}>No tasks on backlog.</Text>
        }
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
                  const path = [item.machineName, item.machineElementName, item.machinePartName]
                    .filter(Boolean)
                    .join(" > ");
                  
                  const lineDisplay = item.lineCode || item.lineName || (item.lineId ? `PL${item.lineId}` : "LINE");
                  const stripeColor = getCriticalityColor(item.taskCriticality);
                  const displayBlock = item.block;

                  return (
                    <Pressable
                      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                      onPress={() => navigation.push("TaskDocuments", { task: item })}
                    >
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
                              <Text style={styles.blockTextLarge}>{displayBlock}</Text>
                            </View>
                          )}
                        </View>
                        
                        <Text style={styles.taskPath}>{path}</Text>
                        <Text style={styles.timeRequired}>
                          Due: {item.dueDate}
                        </Text>
                      </View>
                    </Pressable>
                  );
                }}
              />
            </View>
          );
        }}
      />

      <Pressable style={styles.fab} onPress={() => setLegendVisible(true)}>
        <Text style={styles.fabText}>Help?</Text>
      </Pressable>

      <TaskLegendModal
        visible={legendVisible}
        onClose={() => setLegendVisible(false)}
      />
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
    fontSize: 22,
    flex: 1,
    marginLeft: 16,
    color: "#111111",
  },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  tab: {
    paddingBottom: 6,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    paddingHorizontal: 4,
  },
  tabSelected: {
    borderBottomColor: "#111111",
  },
  tabText: {
    fontFamily: "Jost_500Medium",
    fontSize: 18,
    color: "#9CA3AF",
  },
  tabTextSelected: {
    color: "#111111",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#E2E2E8",
    borderRadius: 20,
    marginBottom: 14,
    minHeight: 100,
    position: "relative",
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  leftStrip: {
    width: 28,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
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
  cardContent: {
    flex: 1,
    padding: 14,
    paddingRight: 8,
  },
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
    fontSize: 12,
    color: "#5E1E1E",
    marginBottom: 6,
    lineHeight: 16,
    paddingRight: 36,
  },
  timeRequired: {
    fontFamily: "Jost_400Regular",
    fontSize: 13,
    color: "#7A7A8D",
  },
  emptyText: {
    fontFamily: "Jost_400Regular",
    textAlign: "center",
    marginTop: 36,
    fontSize: 15,
    color: "#666",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#2C346F",
    borderRadius: 25,
    width: 50,
    height: 50,
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
    fontSize: 13,
  },
});
