import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { fetchLineManagerTodaysApprovals, scanLineManagerTaskQr } from "../api/client";
import { TaskListView } from "../components/TaskListView";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { TaskDetails } from "../types/api";
import { RootStackParamList } from "../types/navigation";

export function LineManagerTodayApprovalsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { authState } = useAuth();
  const [tasks, setTasks] = useState<TaskDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSkipping, setIsSkipping] = useState(false);

  useEffect(() => {
    async function loadTasks() {
      if (!authState.session) return;
      try {
        setTasks(await fetchLineManagerTodaysApprovals(authState.session.token));
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
      const response = await scanLineManagerTaskQr(authState.session.token, {
        scheduleExecutionId: task.scheduleExecutionId,
      });

      if (response.status?.toLowerCase() === "success") {
        navigation.navigate("SupervisorTaskReview", {
          task,
          scanResponse: response,
          scannedEquipment: { rawValue: "SKIPPED" },
        });
      } else {
        // Fallback for LM skip failures if any
        console.warn("LM Skip QR failed", response.message);
      }
    } catch (error) {
      console.error("Error skipping QR", error);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={28} color="#111111" />
        </Pressable>
        <Text style={styles.headerTitle}>Today&apos;s Approvals</Text>
        <View style={styles.headerSpacer} />
      </View>

      <TaskListView
        tasks={tasks}
        emptyMessage="No line manager approvals due for today."
        showTabs={tasks.some((task) => Boolean(task.zone))}
        onTaskPress={(task) => navigation.navigate("QRScanner", { task })}
        onSkipQrPress={handleSkipQr}
        isLineManager={true}
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
