import React, { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { fetchSupervisorFlags } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { IssueFlag } from "../types/api";
import { RootStackParamList } from "../types/navigation";

export function SupervisorFlagsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { authState } = useAuth();

  const [flags, setFlags] = useState<IssueFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const sortedFlags = useMemo(() => {
    return [...flags].sort((a, b) => {
      if (a.status === "POTENTIAL_REPLACEMENT" && b.status !== "POTENTIAL_REPLACEMENT") return -1;
      if (a.status !== "POTENTIAL_REPLACEMENT" && b.status === "POTENTIAL_REPLACEMENT") return 1;
      return new Date(b.raisedDttm).getTime() - new Date(a.raisedDttm).getTime();
    });
  }, [flags]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "POTENTIAL_REPLACEMENT":
        return "#D97706"; // Amber
      case "REPLACEMENT_REQUIRED":
        return "#DC2626"; // Red
      case "REPLACEMENT_INITIATED":
        return "#2563EB"; // Blue
      case "REPLACEMENT_DONE":
        return "#16A34A"; // Green
      case "CLOSED":
        return "#4B5563"; // Gray
      default:
        return "#4B5563";
    }
  };

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

      <FlatList
        data={sortedFlags}
        keyExtractor={(item) => item.flagId.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadFlags(true)} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No flags found on your lines.</Text>}
        renderItem={({ item }) => {
          const statusColor = getStatusColor(item.status);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.partInfo}>
                  <Text style={styles.partName}>{item.partName}</Text>
                  <Text style={styles.equipmentName}>{item.equipmentName}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {item.status.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={14} color="#6B7280" />
                  <Text style={styles.metaText}>{item.location}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="person-outline" size={14} color="#6B7280" />
                  <Text style={styles.metaText}>Raised by: {item.attendantName}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="warning-outline" size={14} color={item.criticality === "CRITICAL" ? "#DC2626" : "#D97706"} />
                  <Text style={[styles.metaText, item.criticality === "CRITICAL" && { color: "#DC2626", fontFamily: "Jost_500Medium" }]}>
                    Priority: {item.criticality}
                  </Text>
                </View>
                <View style={styles.actionRow}>
                  <Pressable
                    style={styles.reviewBtn}
                    onPress={() => navigation.navigate("SupervisorFlagReview", { flag: item })}
                  >
                    <Text style={styles.reviewBtnText}>Review</Text>
                  </Pressable>
                </View>
              </View>
            </View>
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
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  partInfo: { flex: 1, paddingRight: 12 },
  partName: { fontFamily: "Jost_600SemiBold", fontSize: 16, color: "#111111", marginBottom: 2 },
  equipmentName: { fontFamily: "Jost_400Regular", fontSize: 13, color: "#4B5563" },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontFamily: "Jost_500Medium", fontSize: 11 },
  cardBody: { paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F3F4F6", gap: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontFamily: "Jost_400Regular", fontSize: 13, color: "#4B5563" },
  emptyText: { fontFamily: "Jost_400Regular", textAlign: "center", marginTop: 36, fontSize: 15, color: "#666" },
  actionRow: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 12, alignItems: "flex-end" },
  reviewBtn: { backgroundColor: "#111111", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  reviewBtnText: { fontFamily: "Jost_500Medium", fontSize: 13, color: "#FFFFFF" },
});
