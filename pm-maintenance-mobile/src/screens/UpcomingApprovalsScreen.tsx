import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { fetchUpcomingTasks } from "../api/client";
import { TaskListView } from "../components/TaskListView";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { TaskDetails } from "../types/api";
import { RootStackParamList } from "../types/navigation";

export function UpcomingApprovalsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { authState } = useAuth();
  const [tasks, setTasks] = useState<TaskDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadTasks() {
      if (!authState.session) return;

      try {
        const data = await fetchUpcomingTasks(authState.session.token);
        setTasks(data);
      } catch (error) {
        console.error("Failed to fetch upcoming approvals", error);
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, [authState.session]);

  const filteredTasks = tasks.filter((task) => {
    const query = searchQuery.toLowerCase();
    return Object.values(task)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const displayTasks = searchActive ? filteredTasks : tasks;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={28} color="#111111" />
        </Pressable>

        {searchActive ? (
          <TextInput
            style={styles.searchInput}
            placeholder="Search approvals..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            placeholderTextColor="#999"
          />
        ) : (
          <Text style={styles.headerTitle}>Upcoming Approvals</Text>
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

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <TaskListView
          tasks={displayTasks}
          emptyMessage="No upcoming approvals for this month."
          showTabs={tasks.some((task) => Boolean(task.zone))}
          onTaskPress={(task) => {
             // Only clickable if it has been performed/completed by employee
             if (task.approvalStatus === 'APPROVAL_REQUESTED') {
                 navigation.navigate("QRScanner", { task });
             }
          }}
        />
      )}
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
});
