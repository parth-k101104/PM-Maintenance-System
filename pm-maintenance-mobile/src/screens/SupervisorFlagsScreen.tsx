import React, { useEffect, useState, useMemo } from "react";
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

import { fetchSupervisorFlags } from "../api/client";
import { FlagListCard } from "../components/FlagListCard";
import { useAuth } from "../context/AuthContext";
import { IssueFlag } from "../types/api";
import { RootStackParamList } from "../types/navigation";

const STATUS_FILTERS = [
  "ALL",
  "POTENTIAL_REPLACEMENT",
  "REPLACEMENT_REQUIRED",
  "REPLACEMENT_INITIATED",
  "UNDER_REVIEW",
  "CLOSED",
] as const;

const STATUS_PRIORITY: Record<string, number> = {
  UNDER_REVIEW: 0,
  POTENTIAL_REPLACEMENT: 1,
  REPLACEMENT_REQUIRED: 2,
  REPLACEMENT_INITIATED: 3,
  REPLACEMENT_DONE: 4,
  CLOSED: 5,
};

export function SupervisorFlagsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { authState } = useAuth();

  const [flags, setFlags] = useState<IssueFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<(typeof STATUS_FILTERS)[number]>("ALL");

  async function loadFlags(isRefresh = false) {
    if (!authState.session) return;
    if (isRefresh) setRefreshing(true);
    try {
      const data = await fetchSupervisorFlags(authState.session.token);
      setFlags(data);
    } catch (e) {
      console.error("Failed to load flags", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadFlags();
  }, [authState.session]);

  useFocusEffect(
    React.useCallback(() => {
      loadFlags(true);
    }, [authState.session]),
  );

  const sortedFlags = useMemo(() => {
    return [...flags].sort((a, b) => {
      const statusDelta = (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99);
      if (statusDelta !== 0) return statusDelta;
      return new Date(b.raisedDttm).getTime() - new Date(a.raisedDttm).getTime();
    });
  }, [flags]);

  const visibleFlags = useMemo(
    () => sortedFlags.filter((flag) => selectedStatus === "ALL" || flag.status === selectedStatus),
    [selectedStatus, sortedFlags],
  );

  const statusCounts = useMemo(() => {
    return flags.reduce<Record<string, number>>(
      (acc, flag) => {
        acc.ALL = (acc.ALL ?? 0) + 1;
        acc[flag.status] = (acc[flag.status] ?? 0) + 1;
        return acc;
      },
      { ALL: 0 },
    );
  }, [flags]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#111111" />
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
        <Text style={styles.headerTitle}>Line Flags (Supervisor)</Text>
      </View>

      <View style={styles.statusTabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusTabs}>
          {STATUS_FILTERS.map((status) => {
            const selected = selectedStatus === status;
            return (
              <Pressable
                key={status}
                style={[styles.statusTab, selected && styles.statusTabSelected]}
                onPress={() => setSelectedStatus(status)}
              >
                <Text style={[styles.statusTabText, selected && styles.statusTabTextSelected]}>
                  {status === "ALL" ? "All" : status.replace(/_/g, " ")}
                </Text>
                <Text style={[styles.statusTabCount, selected && styles.statusTabTextSelected]}>
                  {statusCounts[status] ?? 0}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={visibleFlags}
        keyExtractor={(item) => item.flagId.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadFlags(true)} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No flags found for this status.</Text>}
        renderItem={({ item }) => {
          return (
            <FlagListCard
              flag={item}
              actionLabel={item.status === "POTENTIAL_REPLACEMENT" || item.status === "UNDER_REVIEW" ? "Review" : "View"}
              onPress={() => navigation.navigate("SupervisorFlagReview", { flag: item })}
            />
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontFamily: "Jost_500Medium",
    fontSize: 22,
    marginLeft: 16,
    color: "#111111",
  },
  statusTabsWrap: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  statusTabs: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statusTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusTabSelected: {
    backgroundColor: "#111111",
  },
  statusTabText: {
    fontFamily: "Jost_500Medium",
    fontSize: 12,
    color: "#4B5563",
  },
  statusTabCount: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 12,
    color: "#4B5563",
  },
  statusTabTextSelected: {
    color: "#FFFFFF",
  },
  listContent: { padding: 16, paddingBottom: 40 },
  emptyText: { fontFamily: "Jost_400Regular", textAlign: "center", marginTop: 36, fontSize: 15, color: "#666" },
});
