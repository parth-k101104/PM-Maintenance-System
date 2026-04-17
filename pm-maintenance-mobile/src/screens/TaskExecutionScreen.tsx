import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { RootStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "TaskExecution">;

function formatHierarchy(values: Array<string | undefined>) {
  return values.filter(Boolean).join(" > ");
}

function formatElapsedTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${mm}:${ss}`;
  }

  return `${mm}:${ss}`;
}

function formatValue(value?: number) {
  if (value === undefined || value === null) {
    return "Not specified";
  }

  return String(value);
}

export function TaskExecutionScreen({ navigation, route }: Props) {
  const { task, scanResponse, scannedEquipment, startedAt } = route.params;
  const [actualValue, setActualValue] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  );

  const machineHierarchy = useMemo(
    () => formatHierarchy([task.machineName, task.machineElementName, task.machinePartName]),
    [task.machineElementName, task.machineName, task.machinePartName]
  );

  const estimatedSeconds = Math.max(0, (task.timeRequired ?? 0) * 60);
  const isPastEstimate = estimatedSeconds > 0 && elapsedSeconds > estimatedSeconds;
  const uomLabel = scanResponse.uom || "value";

  useEffect(() => {
    const intervalId = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [startedAt]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable hitSlop={12} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-outline" size={28} color="#111111" />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Task execution</Text>
            <Text style={styles.headerSubtitle}>{scanResponse.message}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>QR verified successfully</Text>
            <Text style={styles.successText}>
              The scanned equipment is assigned to you for this selected task.
            </Text>
          </View>

          <View style={styles.timerCard}>
            <Text style={styles.cardLabel}>Time elapsed</Text>
            <Text style={[styles.timerValue, isPastEstimate && styles.timerValueLate]}>
              {formatElapsedTime(elapsedSeconds)}
            </Text>
            <Text style={styles.timerHint}>
              Estimated required time: {task.timeRequired ?? 0} mins
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.cardLabel}>Task details</Text>
            <Text style={styles.taskName}>{task.taskName}</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Execution ID</Text>
              <Text style={styles.infoValue}>#{task.scheduleExecutionId}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Task Ref</Text>
              <Text style={styles.infoValue}>{task.taskRefNo}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Line</Text>
              <Text style={styles.infoValue}>{task.lineCode || task.lineName || "N/A"}</Text>
            </View>
            <Text style={styles.hierarchyText}>
              {machineHierarchy || "Machine hierarchy unavailable"}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.cardLabel}>Scanned equipment</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Equipment ID</Text>
              <Text style={styles.infoValue}>
                {scannedEquipment.equipmentId ?? "Not found"}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Element ID</Text>
              <Text style={styles.infoValue}>
                {scannedEquipment.equipmentElementId ?? "Not found"}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Part ID</Text>
              <Text style={styles.infoValue}>
                {scannedEquipment.equipmentPartId ?? "Not found"}
              </Text>
            </View>
          </View>

          <View style={styles.measurementCard}>
            <Text style={styles.cardLabel}>Measurement</Text>
            <View style={styles.measurementGrid}>
              <View style={styles.measurementPill}>
                <Text style={styles.measurementLabel}>UOM</Text>
                <Text style={styles.measurementValue}>{uomLabel}</Text>
              </View>
              <View style={styles.measurementPill}>
                <Text style={styles.measurementLabel}>Standard</Text>
                <Text style={styles.measurementValue}>
                  {formatValue(scanResponse.standardValue)}
                </Text>
              </View>
            </View>
            <Text style={styles.toleranceText}>
              Tolerance: {formatValue(scanResponse.toleranceMin)} to{" "}
              {formatValue(scanResponse.toleranceMax)}
            </Text>

            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Enter actual value ({uomLabel})</Text>
              <TextInput
                value={actualValue}
                onChangeText={setActualValue}
                keyboardType="decimal-pad"
                placeholder={`Actual ${uomLabel}`}
                placeholderTextColor="#9296AA"
                style={styles.input}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 24,
    color: "#111111",
  },
  headerSubtitle: {
    fontFamily: "Jost_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: "#4E556E",
    marginTop: 5,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 34,
    gap: 16,
  },
  successCard: {
    borderRadius: 28,
    backgroundColor: "#D8EAD7",
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  successIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#167C16",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  successTitle: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 23,
    color: "#111111",
  },
  successText: {
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: "#36503A",
    marginTop: 7,
  },
  timerCard: {
    borderRadius: 28,
    backgroundColor: "#E8E9F4",
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: "center",
  },
  cardLabel: {
    fontFamily: "Jost_500Medium",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#626781",
    marginBottom: 10,
  },
  timerValue: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 58,
    lineHeight: 64,
    color: "#111111",
  },
  timerValueLate: {
    color: "#B42318",
  },
  timerHint: {
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    color: "#53586F",
    marginTop: 8,
  },
  infoCard: {
    borderRadius: 24,
    backgroundColor: "#F5F6FA",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  taskName: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 21,
    lineHeight: 26,
    color: "#111111",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 7,
  },
  infoLabel: {
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    color: "#61677F",
  },
  infoValue: {
    flex: 1,
    fontFamily: "Jost_500Medium",
    fontSize: 14,
    color: "#111111",
    textAlign: "right",
  },
  hierarchyText: {
    fontFamily: "Jost_400Regular",
    fontSize: 13,
    lineHeight: 19,
    color: "#6C3242",
    marginTop: 10,
  },
  measurementCard: {
    borderRadius: 26,
    backgroundColor: "#F5E4C9",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  measurementGrid: {
    flexDirection: "row",
    gap: 12,
  },
  measurementPill: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.72)",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  measurementLabel: {
    fontFamily: "Jost_400Regular",
    fontSize: 12,
    color: "#6D5C42",
  },
  measurementValue: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 18,
    color: "#111111",
    marginTop: 4,
  },
  toleranceText: {
    fontFamily: "Jost_500Medium",
    fontSize: 14,
    color: "#55452E",
    marginTop: 14,
  },
  inputWrap: {
    marginTop: 18,
  },
  inputLabel: {
    fontFamily: "Jost_500Medium",
    fontSize: 15,
    color: "#111111",
    marginBottom: 8,
  },
  input: {
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    fontFamily: "Jost_500Medium",
    fontSize: 18,
    color: "#111111",
  },
});
