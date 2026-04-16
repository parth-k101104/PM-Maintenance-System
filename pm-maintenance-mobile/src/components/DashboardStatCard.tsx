import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";

type Props = {
  label: string;
  value: string | number;
  accent?: string;
};

export function DashboardStatCard({ label, value, accent = colors.primary }: Props) {
  return (
    <View style={[styles.card, { borderLeftColor: accent }]}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderLeftWidth: 6,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  value: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 26,
    color: colors.text,
    marginBottom: 2,
  },
  label: {
    fontFamily: "Jost_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
});
