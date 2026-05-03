import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { fetchLineManagerEquipments, runAnalyticsSyncJob } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { LineEquipment } from "../types/api";
import { RootStackParamList } from "../types/navigation";

export function LineManagerEquipmentsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { authState } = useAuth();
  const [equipments, setEquipments] = useState<LineEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    async function loadEquipments() {
      if (!authState.session) return;
      try {
        setEquipments(await fetchLineManagerEquipments(authState.session.token));
      } finally {
        setLoading(false);
      }
    }

    loadEquipments();
  }, [authState.session]);

  const totals = useMemo(() => {
    const elements = equipments.reduce((sum, equipment) => sum + (equipment.elements?.length ?? 0), 0);
    const parts = equipments.reduce(
      (sum, equipment) =>
        sum + (equipment.elements ?? []).reduce((elementSum, element) => elementSum + (element.parts?.length ?? 0), 0),
      0,
    );
    return { elements, parts };
  }, [equipments]);

  async function handleSync() {
    if (!authState.session?.token || syncing) return;
    setSyncing(true);
    try {
      await runAnalyticsSyncJob(authState.session.token);
    } finally {
      setSyncing(false);
    }
  }

  function navigateToPart(part: { partId: number; partName: string }, equipmentName: string, equipmentId: number) {
    navigation.navigate("LineManagerPartAnalytics", {
      part: { partId: part.partId, partName: part.partName, equipmentName, equipmentId },
    });
  }

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
        <Text style={styles.headerTitle}>Line equipments</Text>
        <Pressable
          style={[styles.syncBtn, syncing && styles.syncBtnDisabled]}
          onPress={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#111111" />
          ) : (
            <Ionicons name="sync-outline" size={19} color="#111111" />
          )}
        </Pressable>
      </View>

      <View style={styles.summaryBand}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{equipments.length}</Text>
          <Text style={styles.summaryLabel}>Machines</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totals.elements}</Text>
          <Text style={styles.summaryLabel}>Elements</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totals.parts}</Text>
          <Text style={styles.summaryLabel}>Parts</Text>
        </View>
      </View>

      <FlatList
        data={equipments}
        keyExtractor={(item) => String(item.equipmentId)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No equipment found for your lines.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.machineIcon}>
                <Ionicons name="hardware-chip-outline" size={22} color="#2C346F" />
              </View>
              <View style={styles.machineTitleWrap}>
                <Text style={styles.machineName}>{item.equipmentName}</Text>
                <Text style={styles.machineMeta}>Equipment ID #{item.equipmentId}</Text>
              </View>
            </View>

            {(item.elements ?? []).map((element) => (
              <View key={element.elementId} style={styles.elementBlock}>
                <Text style={styles.elementName}>{element.elementName}</Text>
                <View style={styles.partsWrap}>
                  {(element.parts ?? []).length ? (
                    element.parts.map((part) => (
                      <Pressable
                        key={part.partId}
                        style={({ pressed }) => [styles.partPill, pressed && styles.partPillPressed]}
                        onPress={() => navigateToPart(part, item.equipmentName, item.equipmentId)}
                      >
                        <Text style={styles.partText}>{part.partName}</Text>
                        <Ionicons name="analytics-outline" size={12} color="#4B6FA8" style={styles.partIcon} />
                      </Pressable>
                    ))
                  ) : (
                    <Text style={styles.noPartsText}>No parts mapped</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
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
    gap: 12,
  },
  headerTitle: { fontFamily: "Jost_500Medium", fontSize: 22, flex: 1, color: "#111111" },
  syncBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#F5E4C9",
    alignItems: "center",
    justifyContent: "center",
  },
  syncBtnDisabled: { opacity: 0.7 },
  summaryBand: {
    flexDirection: "row",
    backgroundColor: "#F5F6FA",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontFamily: "Jost_600SemiBold", fontSize: 24, color: "#111111" },
  summaryLabel: { fontFamily: "Jost_400Regular", fontSize: 12, color: "#626781", marginTop: 2 },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 50 },
  card: { backgroundColor: "#F3F4F6", borderRadius: 18, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: "row", gap: 12, alignItems: "center", marginBottom: 14 },
  machineIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#E8E9F4",
    alignItems: "center",
    justifyContent: "center",
  },
  machineTitleWrap: { flex: 1 },
  machineName: { fontFamily: "Jost_600SemiBold", fontSize: 18, color: "#111111" },
  machineMeta: { fontFamily: "Jost_400Regular", fontSize: 12, color: "#626781", marginTop: 2 },
  elementBlock: { borderTopWidth: 1, borderTopColor: "#E0E2EA", paddingTop: 12, marginTop: 12 },
  elementName: { fontFamily: "Jost_500Medium", fontSize: 15, color: "#2F3448", marginBottom: 8 },
  partsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  partPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#D0D6E8",
  },
  partPillPressed: { backgroundColor: "#E8EDF8", opacity: 0.85 },
  partText: { fontFamily: "Jost_400Regular", fontSize: 12, color: "#2C346F" },
  partIcon: { marginTop: 1 },
  noPartsText: { fontFamily: "Jost_400Regular", fontSize: 12, color: "#7A7A8D" },
  emptyText: { fontFamily: "Jost_400Regular", textAlign: "center", marginTop: 36, fontSize: 15, color: "#666" },
});
