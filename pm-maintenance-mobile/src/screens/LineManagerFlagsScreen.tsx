import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { fetchLineManagerFlags } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { IssueFlag } from "../types/api";
import { RootStackParamList } from "../types/navigation";

function getStatusColor(status: string) {
  switch (status) {
    case "REPLACEMENT_INITIATED":
      return "#DC2626";
    case "REPLACEMENT_REQUIRED":
      return "#B35900";
    case "POTENTIAL_REPLACEMENT":
      return "#2C4A80";
    default:
      return "#6B7280";
  }
}

export function LineManagerFlagsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { authState } = useAuth();
  const [flags, setFlags] = useState<IssueFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFlags() {
      if (!authState.session) return;
      try {
        setFlags(await fetchLineManagerFlags(authState.session.token));
      } finally {
        setLoading(false);
      }
    }

    loadFlags();
  }, [authState.session]);

  const sortedFlags = useMemo(
    () => [...flags].sort((a, b) => new Date(b.raisedDttm).getTime() - new Date(a.raisedDttm).getTime()),
    [flags],
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

      <FlatList
        data={sortedFlags}
        keyExtractor={(item) => String(item.flagId)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No active flags found for your lines.</Text>}
        renderItem={({ item }) => {
          const color = getStatusColor(item.status);
          const path = [item.equipmentName, item.location, item.partName].filter(Boolean).join(" > ");

          return (
            <View style={styles.card}>
              <View style={[styles.leftStrip, { backgroundColor: color }]} />
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.partName}>{item.partName || "Unknown part"}</Text>
                  <Text style={[styles.criticality, { color }]}>{item.criticality}</Text>
                </View>
                <Text style={styles.path}>{path || "Equipment hierarchy unavailable"}</Text>
                <View style={[styles.badge, { backgroundColor: `${color}22` }]}>
                  <Text style={[styles.badgeText, { color }]}>{item.status.replace(/_/g, " ")}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>Attendant: {item.attendantName || "Unassigned"}</Text>
                  <Text style={styles.metaText}>
                    Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "N/A"}
                  </Text>
                </View>
                <View style={styles.actionRow}>
                  <Pressable
                    style={styles.reviewBtn}
                    onPress={() => navigation.navigate("LineManagerFlagDetail", { flag: item })}
                  >
                    <Text style={styles.reviewBtnText}>Check Spare Part & Review</Text>
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
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 50 },
  card: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    marginBottom: 14,
    overflow: "hidden",
  },
  leftStrip: { width: 12 },
  cardContent: { flex: 1, padding: 16 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  partName: { fontFamily: "Jost_600SemiBold", fontSize: 18, color: "#111111", flex: 1 },
  criticality: { fontFamily: "Jost_600SemiBold", fontSize: 12 },
  path: { fontFamily: "Jost_400Regular", fontSize: 13, lineHeight: 18, color: "#5A5F75", marginTop: 4 },
  badge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 10 },
  badgeText: { fontFamily: "Jost_600SemiBold", fontSize: 11 },
  metaRow: { marginTop: 10, gap: 3 },
  metaText: { fontFamily: "Jost_400Regular", fontSize: 12, color: "#4B5563" },
  emptyText: { fontFamily: "Jost_400Regular", textAlign: "center", marginTop: 36, fontSize: 15, color: "#666" },
  actionRow: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 12, alignItems: "flex-end" },
  reviewBtn: { backgroundColor: "#111111", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  reviewBtnText: { fontFamily: "Jost_500Medium", fontSize: 13, color: "#FFFFFF" },
});
