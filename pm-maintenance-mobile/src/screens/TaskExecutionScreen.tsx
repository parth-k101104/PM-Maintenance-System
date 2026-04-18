import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import * as ImagePicker from "expo-image-picker";

import { RootStackParamList } from "../types/navigation";
import { useAuth } from "../context/AuthContext";
import { completeTask } from "../api/client";

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
  if (hours > 0) return `${String(hours).padStart(2, "0")}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

function formatValue(value?: number) {
  if (value === undefined || value === null) return "Not specified";
  return String(value);
}

/** A UOM is "real" (measurement task) if it exists and isn't 'N/A'. */
function isMeasurementTask(uom?: string) {
  return !!uom && uom.trim().toUpperCase() !== "N/A";
}

export function TaskExecutionScreen({ navigation, route }: Props) {
  const { task, scanResponse, scannedEquipment, startedAt } = route.params;
  const { authState } = useAuth();

  const [actualValue, setActualValue] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  );
  const elapsedRef = useRef(elapsedSeconds);
  elapsedRef.current = elapsedSeconds;

  const machineHierarchy = useMemo(
    () => formatHierarchy([task.machineName, task.machineElementName, task.machinePartName]),
    [task.machineElementName, task.machineName, task.machinePartName]
  );

  const estimatedSeconds = Math.max(0, (task.timeRequired ?? 0) * 60);
  const isPastEstimate = estimatedSeconds > 0 && elapsedSeconds > estimatedSeconds;
  const uomLabel = scanResponse.uom || "";
  const requiresValue = isMeasurementTask(uomLabel);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);
    return () => clearInterval(intervalId);
  }, [startedAt]);

  // ─── Camera ────────────────────────────────────────────────────────────────

  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera permission is needed to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  function handleRetakePhoto() {
    setPhotoUri(null);
  }

  // ─── S3 Upload ─────────────────────────────────────────────────────────────

  async function uploadPhotoToS3(uri: string, presignedUrl: string): Promise<void> {
    setIsUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const uploadResult = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      if (!uploadResult.ok) {
        throw new Error(`S3 upload failed: ${uploadResult.status}`);
      }
    } finally {
      setIsUploading(false);
    }
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (requiresValue) {
      const trimmed = actualValue.trim();
      if (!trimmed) {
        Alert.alert("Value required", `Please enter the actual ${uomLabel} value before submitting.`);
        return;
      }
      if (isNaN(Number(trimmed))) {
        Alert.alert("Invalid value", `The actual ${uomLabel} value must be a number.`);
        return;
      }
    }

    if (!authState.session?.token) {
      Alert.alert("Session expired", "Please log in again.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload photo to S3 if taken and URL is available
      if (photoUri && scanResponse.observationUploadUrl) {
        await uploadPhotoToS3(photoUri, scanResponse.observationUploadUrl);
      }

      // 2. Calculate time taken in minutes (from elapsed seconds on screen)
      const timeTakenMins = Math.max(1, Math.round(elapsedRef.current / 60));

      // 3. Submit task completion to backend
      await completeTask(authState.session.token, {
        scheduleExecutionId: task.scheduleExecutionId,
        timeTaken: timeTakenMins,
        actualValue: requiresValue ? Number(actualValue.trim()) : null,
        notes: notes.trim() || undefined,
      });

      Alert.alert(
        "Task completed",
        "Your task has been submitted successfully and sent for review.",
        [{ text: "OK", onPress: () => navigation.navigate("Dashboard") }]
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      Alert.alert("Submission failed", message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLoading = isSubmitting || isUploading;

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
          {/* ── Success banner ─────────────────────────────────── */}
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>QR verified successfully</Text>
            <Text style={styles.successText}>
              The scanned equipment is assigned to you for this selected task.
            </Text>
          </View>

          {/* ── Timer ──────────────────────────────────────────── */}
          <View style={styles.timerCard}>
            <Text style={styles.cardLabel}>Time elapsed</Text>
            <Text style={[styles.timerValue, isPastEstimate && styles.timerValueLate]}>
              {formatElapsedTime(elapsedSeconds)}
            </Text>
            <Text style={styles.timerHint}>
              Estimated required time: {task.timeRequired ?? 0} mins
            </Text>
          </View>

          {/* ── Task details ───────────────────────────────────── */}
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

          {/* ── Measurement card (only for measurement tasks) ── */}
          {requiresValue && (
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
                <Text style={styles.inputLabel}>
                  Actual value ({uomLabel}){" "}
                  <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  value={actualValue}
                  onChangeText={setActualValue}
                  keyboardType="decimal-pad"
                  placeholder={`Enter actual ${uomLabel}`}
                  placeholderTextColor="#9296AA"
                  style={styles.input}
                  editable={!isLoading}
                />
              </View>
            </View>
          )}

          {/* ── Visual task badge ───────────────────────────────── */}
          {!requiresValue && (
            <View style={styles.visualBadge}>
              <Ionicons name="eye-outline" size={20} color="#4B6FA8" />
              <Text style={styles.visualBadgeText}>
                Visual inspection — no measurement required
              </Text>
            </View>
          )}

          {/* ── Observation photo ───────────────────────────────── */}
          <View style={styles.photoCard}>
            <Text style={styles.cardLabel}>Observation photo</Text>
            {photoUri ? (
              <View>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
                <View style={styles.photoActionRow}>
                  <Pressable
                    style={[styles.photoBtn, styles.retakeBtn]}
                    onPress={handleRetakePhoto}
                    disabled={isLoading}
                  >
                    <Ionicons name="refresh-outline" size={18} color="#B42318" />
                    <Text style={[styles.photoBtnText, styles.retakeBtnText]}>Retake</Text>
                  </Pressable>
                  <View style={styles.photoStatusChip}>
                    <Ionicons name="checkmark-circle" size={16} color="#167C16" />
                    <Text style={styles.photoStatusText}>Photo ready</Text>
                  </View>
                </View>
              </View>
            ) : (
              <Pressable
                style={[styles.photoBtn, styles.cameraBtn]}
                onPress={handleTakePhoto}
                disabled={isLoading}
              >
                <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
                <Text style={styles.cameraBtnText}>Take photo of work</Text>
              </Pressable>
            )}
            {!scanResponse.observationUploadUrl && (
              <Text style={styles.photoHint}>
                ⚠ No upload URL received — photo will not be saved to cloud storage.
              </Text>
            )}
          </View>

          {/* ── Notes ───────────────────────────────────────────── */}
          <View style={styles.notesCard}>
            <Text style={styles.cardLabel}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any observations or notes (optional)"
              placeholderTextColor="#9296AA"
              style={styles.notesInput}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isLoading}
            />
          </View>

          {/* ── Submit button ────────────────────────────────────── */}
          <Pressable
            style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-done-outline" size={22} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Complete task</Text>
              </>
            )}
          </Pressable>

          {isUploading && (
            <Text style={styles.uploadingHint}>Uploading observation photo…</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontFamily: "Jost_600SemiBold", fontSize: 24, color: "#111111" },
  headerSubtitle: {
    fontFamily: "Jost_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: "#4E556E",
    marginTop: 5,
  },
  content: { paddingHorizontal: 18, paddingBottom: 42, gap: 16 },

  // Success banner
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
  successTitle: { fontFamily: "Jost_600SemiBold", fontSize: 23, color: "#111111" },
  successText: {
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: "#36503A",
    marginTop: 7,
  },

  // Timer
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
  timerValueLate: { color: "#B42318" },
  timerHint: { fontFamily: "Jost_400Regular", fontSize: 14, color: "#53586F", marginTop: 8 },

  // Info card
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
  infoLabel: { fontFamily: "Jost_400Regular", fontSize: 14, color: "#61677F" },
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

  // Measurement card
  measurementCard: {
    borderRadius: 26,
    backgroundColor: "#F5E4C9",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  measurementGrid: { flexDirection: "row", gap: 12 },
  measurementPill: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.72)",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  measurementLabel: { fontFamily: "Jost_400Regular", fontSize: 12, color: "#6D5C42" },
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
  inputWrap: { marginTop: 18 },
  inputLabel: { fontFamily: "Jost_500Medium", fontSize: 15, color: "#111111", marginBottom: 8 },
  required: { color: "#B42318" },
  input: {
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    fontFamily: "Jost_500Medium",
    fontSize: 18,
    color: "#111111",
  },

  // Visual task badge
  visualBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 20,
    backgroundColor: "#EAF0FB",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  visualBadgeText: {
    fontFamily: "Jost_500Medium",
    fontSize: 14,
    color: "#2C4A80",
    flex: 1,
  },

  // Photo card
  photoCard: {
    borderRadius: 24,
    backgroundColor: "#F5F6FA",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  photoPreview: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: "#E0E0E0",
  },
  photoActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  cameraBtn: {
    backgroundColor: "#1A1F36",
    flex: 1,
    justifyContent: "center",
  },
  cameraBtnText: { fontFamily: "Jost_600SemiBold", fontSize: 15, color: "#FFFFFF" },
  retakeBtn: {
    backgroundColor: "#FDE8E7",
  },
  retakeBtnText: { fontFamily: "Jost_500Medium", fontSize: 14, color: "#B42318" },
  photoBtnText: {},
  photoStatusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#D8EAD7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  photoStatusText: { fontFamily: "Jost_500Medium", fontSize: 13, color: "#167C16" },
  photoHint: {
    fontFamily: "Jost_400Regular",
    fontSize: 12,
    color: "#A0550E",
    marginTop: 10,
    lineHeight: 17,
  },

  // Notes card
  notesCard: {
    borderRadius: 24,
    backgroundColor: "#F5F6FA",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  notesInput: {
    minHeight: 100,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 14,
    fontFamily: "Jost_400Regular",
    fontSize: 15,
    color: "#111111",
    lineHeight: 22,
  },

  // Submit button
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 20,
    backgroundColor: "#167C16",
    paddingVertical: 18,
    marginTop: 4,
  },
  submitBtnDisabled: { backgroundColor: "#82B882" },
  submitBtnText: { fontFamily: "Jost_600SemiBold", fontSize: 17, color: "#FFFFFF" },
  uploadingHint: {
    fontFamily: "Jost_400Regular",
    fontSize: 13,
    color: "#626781",
    textAlign: "center",
    marginTop: -8,
  },
});
