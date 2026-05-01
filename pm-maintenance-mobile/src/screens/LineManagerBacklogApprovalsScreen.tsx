import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { fetchLineManagerBacklogApprovals } from "../api/client";
import { TaskListView } from "../components/TaskListView";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { TaskDetails } from "../types/api";
import { RootStackParamList } from "../types/navigation";

export function LineManagerBacklogApprovalsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { authState } = useAuth();
  const [tasks, setTasks] = useState<TaskDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      if (!authState.session) return;
      try {
        setTasks(await fetchLineManagerBacklogApprovals(authState.session.token));
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, [authState.session]);

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
        <Text style={styles.headerTitle}>Backlog Approvals</Text>
        <View style={styles.headerSpacer} />
      </View>

      <TaskListView
        tasks={tasks}
        emptyMessage="No backlog approvals found."
        showTabs={tasks.some((task) => Boolean(task.zone))}
        onTaskPress={(task) => navigation.navigate("QRScanner", { task })}
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
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    fontFamily: "Jost_500Medium",
    fontSize: 22,
    flex: 1,
    marginLeft: 16,
    color: "#111111",
  },
  headerSpacer: { width: 28 },
});
