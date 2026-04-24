import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { fetchSupervisorTodaysApprovals } from "../api/client";
import { TaskListView } from "../components/TaskListView";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { TaskDetails } from "../types/api";
import { RootStackParamList } from "../types/navigation";

export function SupervisorDueApprovalsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { authState } = useAuth();
  const [tasks, setTasks] = useState<TaskDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      if (!authState.session) return;

      try {
        const data = await fetchSupervisorTodaysApprovals(authState.session.token);
        setTasks(data);
      } catch (error) {
        console.error("Failed to fetch supervisor due approvals", error);
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
        <Text style={styles.headerTitle}>Today&apos;s Due Approvals</Text>
        <Pressable hitSlop={12}>
          <Ionicons name="search-outline" size={28} color="#111111" />
        </Pressable>
      </View>

      <TaskListView
        tasks={tasks}
        emptyMessage="No approvals due for today."
        showTabs={tasks.some((task) => Boolean(task.zone))}
        onTaskPress={(task) => navigation.navigate("QRScanner", { task })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
});
