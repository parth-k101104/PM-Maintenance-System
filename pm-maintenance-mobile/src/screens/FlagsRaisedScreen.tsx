import React, { useCallback, useRef, useState } from "react";
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
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { fetchMyFlags } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { IssueFlag } from "../types/api";
import { RootStackParamList } from "../types/navigation";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Sort order for the list (highest priority first)
const STATUS_ORDER: Record<string, number> = {
  REPLACEMENT_INITIATED: 1,
  REPLACEMENT_REQUIRED: 2,
  POTENTIAL_REPLACEMENT: 3,
};

const STATUS_TABS = [
  { id: "REPLACEMENT_INITIATED", label: "Initiated" },
  { id: "REPLACEMENT_REQUIRED", label: "Required" },
  { id: "POTENTIAL_REPLACEMENT", label: "Potential" },
];

function getStatusColor(status: string) {
  switch (status) {
    case "REPLACEMENT_INITIATED": return "#DC2626"; // Red
    case "REPLACEMENT_REQUIRED": return "#EAB308"; // Yellow/Orange
    case "POTENTIAL_REPLACEMENT": return "#3B82F6"; // Blue
    default: return "#6B7280"; // Gray
  }
}

export function FlagsRaisedScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { authState } = useAuth();
  const [flags, setFlags] = useState<IssueFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState(STATUS_TABS[0].id);
  const horizontalListRef = useRef<FlatList>(null);

  const handleTabPress = (status: string, index: number) => {
    setSelectedStatus(status);
    horizontalListRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleMomentumScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (STATUS_TABS[index]) {
      setSelectedStatus(STATUS_TABS[index].id);
    }
  };

  async function loadFlags() {
    if (!authState.session) return;
    try {
      const data = await fetchMyFlags(authState.session.token);
      
      // Sort flags: Active/Actionable first, then by date
      const sorted = data.sort((a, b) => {
        const orderA = STATUS_ORDER[a.status] || 99;
        const orderB = STATUS_ORDER[b.status] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.raisedDttm).getTime() - new Date(a.raisedDttm).getTime();
      });

      setFlags(sorted);
    } catch (e) {
      console.error("Failed to fetch flags", e);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadFlags();
    }, [authState.session])
  );

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
        <Text style={styles.headerTitle}>Flags raised</Text>
      </View>

      <View style={styles.tabsContainer}>
        {STATUS_TABS.map((tab, index) => {
          const isSelected = selectedStatus === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[styles.tab, isSelected && { borderBottomColor: getStatusColor(tab.id) }]}
              onPress={() => handleTabPress(tab.id, index)}
            >
              <Text style={[styles.tabText, isSelected && { color: getStatusColor(tab.id) }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        ref={horizontalListRef}
        data={STATUS_TABS}
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
          const tabFlags = flags.filter((flag) => flag.status === tab.id);

          return (
            <View style={{ width: SCREEN_WIDTH }}>
              <FlatList
                data={tabFlags}
                keyExtractor={(item) => String(item.flagId)}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No flags found for this status.</Text>
                }
                renderItem={({ item }) => {
                  const path = [item.equipmentName, item.location, item.partName]
                    .filter(Boolean)
                    .join(" > ");
                  const isActionable = item.status === "REPLACEMENT_INITIATED";

                  return (
                    <Pressable
                      style={styles.card}
                      onPress={() => {
                        if (isActionable) {
                          navigation.navigate("FlagDetail", { flag: item });
                        }
                      }}
                    >
                      <View style={[styles.leftStrip, { backgroundColor: getStatusColor(item.status) }]} />

                      <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                          <Text style={styles.taskName}>{item.partName || "Unknown Part"}</Text>
                          {isActionable && <Ionicons name="chevron-forward" size={20} color="#111111" />}
                        </View>

                        <Text style={styles.taskPath}>{path}</Text>

                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "22" }]}>
                          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {item.status.replace(/_/g, " ")}
                          </Text>
                        </View>

                        <View style={styles.infoRow}>
                          <Text style={styles.dueDate}>
                            Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "N/A"}
                          </Text>
                          <Text style={styles.criticality}>
                            Priority: {item.criticality}
                          </Text>
                        </View>

                        <Text style={styles.linkedText}>Linked to Exec ID: {item.scheduleExecutionId}</Text>
                      </View>
                    </Pressable>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
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
    gap: 18,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    paddingBottom: 8,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    paddingHorizontal: 4,
    marginBottom: -1,
  },
  tabText: {
    fontFamily: "Jost_500Medium",
    fontSize: 16,
    color: "#9CA3AF",
  },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 50 },
  card: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    marginBottom: 16,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  leftStrip: {
    width: 12,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  cardContent: { flex: 1, padding: 16 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  taskName: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 18,
    color: "#111111",
    flex: 1,
  },
  taskPath: {
    fontFamily: "Jost_400Regular",
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 10,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  statusText: {
    fontFamily: "Jost_500Medium",
    fontSize: 11,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  dueDate: {
    fontFamily: "Jost_500Medium",
    fontSize: 13,
    color: "#111111",
  },
  criticality: {
    fontFamily: "Jost_400Regular",
    fontSize: 13,
    color: "#4B5563",
  },
  linkedText: {
    fontFamily: "Jost_400Regular",
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },
  emptyText: {
    fontFamily: "Jost_400Regular",
    textAlign: "center",
    marginTop: 36,
    fontSize: 15,
    color: "#6B7280",
  },
});
