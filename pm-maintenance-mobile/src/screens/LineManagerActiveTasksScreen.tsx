import React, { useEffect, useState, useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { fetchLineManagerActiveTasks } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { TaskListView } from "../components/TaskListView";
import { colors } from "../theme/colors";
import { TaskDetails } from "../types/api";
import { RootStackParamList } from "../types/navigation";

export function LineManagerActiveTasksScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { authState } = useAuth();
  const [tasks, setTasks] = useState<TaskDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      if (!authState.session) return;
      try {
        const data = await fetchLineManagerActiveTasks(authState.session.token);
        setTasks(data);
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, [authState.session]);

  const activeTasks = useMemo(() => tasks, [tasks]);

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
        <Text style={styles.headerTitle}>Active line tasks for today</Text>
      </View>

      <View style={styles.content}>
        <TaskListView
          tasks={activeTasks}
          emptyMessage="No active tasks found for today."
          onTaskPress={(task) => navigation.navigate("TaskDocuments", { task })}
        />
      </View>
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
  content: {
    flex: 1,
  },
});
