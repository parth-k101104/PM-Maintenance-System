import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { fetchLineManagerFlags } from "../api/client";
import { FlagListCard } from "../components/FlagListCard";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { IssueFlag } from "../types/api";
import { RootStackParamList } from "../types/navigation";

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
          return (
            <FlagListCard
              flag={item}
              actionLabel="Check Spare Part & Review"
              onPress={() => navigation.navigate("LineManagerFlagDetail", { flag: item })}
            />
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
  emptyText: { fontFamily: "Jost_400Regular", textAlign: "center", marginTop: 36, fontSize: 15, color: "#666" },
});
