import React, { useMemo, useRef, useState } from "react";
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { TaskDetails } from "../types/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function getCriticalityColor(level: string | undefined) {
  switch (level?.toUpperCase()) {
    case "HIGH":
      return "#8B0000";
    case "MEDIUM":
      return "#B35900";
    case "LOW":
      return "#1E6545";
    default:
      return "#7B1005";
  }
}

type Props = {
  tasks: TaskDetails[];
  emptyMessage: string;
  onTaskPress?: (task: TaskDetails) => void;
  showTabs?: boolean;
};

export function TaskListView({ tasks, emptyMessage, onTaskPress, showTabs = true }: Props) {
  const zones = useMemo(() => Array.from(new Set(tasks.map((task) => task.zone || "All"))).sort(), [tasks]);
  const [selectedZone, setSelectedZone] = useState<string | null>(zones[0] ?? null);
  const horizontalListRef = useRef<FlatList>(null);

  const visibleZones = showTabs ? zones : ["All"];

  const handleTabPress = (zone: string, index: number) => {
    setSelectedZone(zone);
    horizontalListRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleMomentumScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (visibleZones[index]) {
      setSelectedZone(visibleZones[index]);
    }
  };

  if (!tasks.length) {
    return <Text style={styles.emptyText}>{emptyMessage}</Text>;
  }

  return (
    <>
      {showTabs ? (
        <View style={styles.tabsContainer}>
          {visibleZones.map((zone, index) => {
            const isSelected = selectedZone === zone;
            return (
              <Pressable
                key={zone}
                style={[styles.tab, isSelected && styles.tabSelected]}
                onPress={() => handleTabPress(zone, index)}
              >
                <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>{zone}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <FlatList
        ref={horizontalListRef}
        data={visibleZones}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        renderItem={({ item: zone }) => {
          const zoneTasks = showTabs ? tasks.filter((task) => (task.zone || "All") === zone) : tasks;

          return (
            <View style={{ width: SCREEN_WIDTH }}>
              <FlatList
                data={zoneTasks}
                keyExtractor={(item) => String(item.scheduleExecutionId)}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<Text style={styles.emptyText}>No tasks found for this zone.</Text>}
                renderItem={({ item }) => {
                  const path = [item.machineName, item.machineElementName, item.machinePartName]
                    .filter(Boolean)
                    .join(" > ");
                  const lineDisplay = item.lineCode || item.lineName || (item.lineId ? `PL${item.lineId}` : "LINE");
                  const stripeColor = getCriticalityColor(item.taskCriticality);
                  const displayBlock = item.block;

                  return (
                    <Pressable
                      disabled={!onTaskPress}
                      style={({ pressed }) => [styles.card, pressed && onTaskPress && styles.cardPressed]}
                      onPress={() => onTaskPress?.(item)}
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
                        <View style={styles.timeRow}>
                          {item.timeTaken != null ? (
                            <Text style={styles.timeRequired}>
                              Time taken — {item.timeTaken} mins
                            </Text>
                          ) : (
                            <Text style={styles.timeRequired}>Time required — {item.timeRequired} mins</Text>
                          )}
                          {!onTaskPress ? (
                            <View style={styles.reviewBadge}>
                              <Ionicons name="checkmark-done-outline" size={13} color="#2C346F" />
                              <Text style={styles.reviewBadgeText}>Due approval</Text>
                            </View>
                          ) : null}
                        </View>
                        {!!item.employeeName && (
                          <View style={styles.employeeRow}>
                            <Ionicons name="person-outline" size={13} color="#5A5F75" />
                            <Text style={styles.employeeName}>{item.employeeName}</Text>
                          </View>
                        )}
                      </View>
                    </Pressable>
                  );
                }}
              />
            </View>
          );
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
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
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  timeRequired: {
    fontFamily: "Jost_400Regular",
    fontSize: 13,
    color: "#7A7A8D",
    flex: 1,
  },
  employeeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
  },
  employeeName: {
    fontFamily: "Jost_500Medium",
    fontSize: 12,
    color: "#4A4F68",
  },
  reviewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: "rgba(44,52,111,0.1)",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  reviewBadgeText: {
    fontFamily: "Jost_500Medium",
    fontSize: 11,
    color: "#2C346F",
  },
  emptyText: {
    fontFamily: "Jost_400Regular",
    textAlign: "center",
    marginTop: 36,
    fontSize: 15,
    color: "#666",
  },
});
