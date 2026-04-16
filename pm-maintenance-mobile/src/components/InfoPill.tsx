import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";

type Props = {
  title: string;
  value: string;
};

export function InfoPill({ title, value }: Props) {
  return (
    <View style={styles.pill}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.primaryMuted,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  title: {
    fontFamily: "Jost_500Medium",
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  value: {
    fontFamily: "Jost_500Medium",
    fontSize: 15,
    color: colors.text,
  },
});
