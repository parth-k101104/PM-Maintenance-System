import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { IssueFlag } from "../types/api";

export function getFlagStatusColor(status: string) {
  switch (status) {
    case "REPLACEMENT_INITIATED":
      return "#DC2626";
    case "REPLACEMENT_REQUIRED":
      return "#B35900";
    case "POTENTIAL_REPLACEMENT":
      return "#2C4A80";
    case "UNDER_REVIEW":
      return "#7C3AED";
    case "CLOSED":
      return "#4B5563";
    default:
      return "#6B7280";
  }
}

type FlagListCardProps = {
  flag: IssueFlag;
  actionLabel?: string;
  showChevron?: boolean;
  onPress?: () => void;
};

export function FlagListCard({ flag, actionLabel, showChevron = false, onPress }: FlagListCardProps) {
  const color = getFlagStatusColor(flag.status);
  const path = [flag.equipmentName, flag.location, flag.partName].filter(Boolean).join(" > ");
  const Root = onPress ? Pressable : View;

  return (
    <Root style={styles.card} onPress={onPress as never}>
      <View style={[styles.leftStrip, { backgroundColor: color }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.partName}>{flag.partName || "Unknown part"}</Text>
          {showChevron ? <Ionicons name="chevron-forward" size={20} color="#111111" /> : null}
          {!showChevron ? <Text style={[styles.criticality, { color }]}>{flag.criticality}</Text> : null}
        </View>

        <Text style={styles.path}>{path || "Equipment hierarchy unavailable"}</Text>

        <View style={[styles.badge, { backgroundColor: `${color}22` }]}>
          <Text style={[styles.badgeText, { color }]}>{flag.status.replace(/_/g, " ")}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Attendant: {flag.attendantName || "Unassigned"}</Text>
          <Text style={styles.metaText}>
            Due: {flag.dueDate ? new Date(flag.dueDate).toLocaleDateString() : "N/A"}
          </Text>
          <Text style={styles.metaText}>Priority: {flag.criticality || "N/A"}</Text>
        </View>

        {actionLabel ? (
          <View style={styles.actionRow}>
            <View style={styles.reviewBtn}>
              <Text style={styles.reviewBtnText}>{actionLabel}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </Root>
  );
}

const styles = StyleSheet.create({
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
  actionRow: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 12, alignItems: "flex-end" },
  reviewBtn: { backgroundColor: "#111111", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  reviewBtnText: { fontFamily: "Jost_500Medium", fontSize: 13, color: "#FFFFFF" },
});
