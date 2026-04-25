import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { fetchTasksForToday } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { TaskLegendModal } from "../components/TaskLegendModal";
import { TaskListView } from "../components/TaskListView";
import { colors } from "../theme/colors";
import { TaskDetails } from "../types/api";
import { RootStackParamList } from "../types/navigation";

export function TaskListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { authState } = useAuth();
  const [tasks, setTasks] = useState<TaskDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [legendVisible, setLegendVisible] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadTasks() {
      if (!authState.session) return;
      try {
        const data = await fetchTasksForToday(authState.session.token);
        setTasks(data);
      } catch (e) {
        console.error("Failed to fetch tasks", e);
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

  const filteredTasks = tasks.filter((task) => {
    const query = searchQuery.toLowerCase();

    return Object.values(task)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={28} color="#111111" />
        </Pressable>

        {searchActive ? (
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            placeholderTextColor="#999"
          />
        ) : (
          <Text style={styles.headerTitle}>Today&apos;s Tasks</Text>
        )}

        <Pressable
          hitSlop={12}
          onPress={() => {
            if (searchActive) {
              setSearchQuery("");
            }
            setSearchActive((prev) => !prev);
          }}
        >
          <Ionicons
            name={searchActive ? "close-outline" : "search-outline"}
            size={28}
            color="#111111"
          />
        </Pressable>
      </View>

      <TaskListView
        tasks={searchActive ? filteredTasks : tasks}
        emptyMessage="No tasks assigned for today."
        onTaskPress={(task) => navigation.push("TaskDocuments", { task })}
      />

      <Pressable style={styles.fab} onPress={() => setLegendVisible(true)}>
        <Text style={styles.fabText}>Help?</Text>
      </Pressable>

      <TaskLegendModal
        visible={legendVisible}
        onClose={() => setLegendVisible(false)}
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
  searchInput: {
    flex: 1,
    marginLeft: 16,
    fontFamily: "Jost_400Regular",
    fontSize: 18,
    color: "#111111",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#2C346F",
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontFamily: "Jost_500Medium",
    color: "#FFFFFF",
    fontSize: 13,
  },
});
