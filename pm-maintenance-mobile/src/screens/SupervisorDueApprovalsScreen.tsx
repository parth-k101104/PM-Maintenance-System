import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { fetchSupervisorTodaysApprovals, scanSupervisorTaskQr } from "../api/client";
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
  const [isSkipping, setIsSkipping] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleSkipQr = async (task: TaskDetails) => {
    if (!authState.session) return;
    
    setIsSkipping(true);
    try {
      const supResponse = await scanSupervisorTaskQr(authState.session.token, {
        scheduleExecutionId: task.scheduleExecutionId,
      });

      if (supResponse.status?.toLowerCase() === "success") {
        navigation.navigate("SupervisorTaskReview", {
          task,
          scanResponse: supResponse,
          scannedEquipment: { rawValue: "SKIPPED" },
        });
      } else {
        Alert.alert("QR validation failed", supResponse.message || "Could not skip QR scan for this task.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to skip the QR code scan.";
      Alert.alert("Error", message);
    } finally {
      setIsSkipping(false);
    }
  };

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
          <Text style={styles.headerTitle}>Today&apos;s Due Approvals</Text>
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
        emptyMessage="No approvals due for today."
        showTabs={tasks.some((task) => Boolean(task.zone))}
        onTaskPress={(task) => navigation.navigate("QRScanner", { task })}
        onSkipQrPress={handleSkipQr}
      />

      {isSkipping && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.overlayText}>Validating...</Text>
        </View>
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  overlayText: {
    fontFamily: "Jost_500Medium",
    fontSize: 16,
    color: "#111111",
    marginTop: 12,
  },
});
