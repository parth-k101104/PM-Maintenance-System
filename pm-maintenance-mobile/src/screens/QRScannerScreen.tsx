import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StackActions } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from "expo-camera";

import { scanSupervisorTaskQr, scanTaskQr } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { QRScanResponse } from "../types/api";
import { RootStackParamList } from "../types/navigation";
import { dedupeQrTasks, formatQrTaskHierarchy, parseEquipmentQr } from "../utils/qr";

type Props = NativeStackScreenProps<RootStackParamList, "QRScanner">;

export function QRScannerScreen({ navigation, route }: Props) {
  const { task } = route.params;
  const { authState } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failureResponse, setFailureResponse] = useState<QRScanResponse | null>(null);

  const relatedTasks = useMemo(() => {
    if (!failureResponse) {
      return [];
    }

    return dedupeQrTasks([
      ...(failureResponse.relatedPartTasks ?? []),
      ...(failureResponse.relatedMachineTasks ?? []),
    ]);
  }, [failureResponse]);

  async function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (isSubmitting) {
      return;
    }

    const scannedEquipment = parseEquipmentQr(result.data);

    if (!scannedEquipment.equipmentId) {
      Alert.alert(
        "Invalid QR",
        "This QR code does not include an equipment id. Please scan the equipment QR again."
      );
      return;
    }

    if (!authState.session) {
      Alert.alert("Session expired", "Please sign in again before scanning QR.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Supervisors (roleId 3) use a different scan endpoint
      if (authState.session.roleId === 3) {
        const supResponse = await scanSupervisorTaskQr(authState.session.token, {
          equipmentId: scannedEquipment.equipmentId,
          equipmentElementId: scannedEquipment.equipmentElementId,
          equipmentPartId: scannedEquipment.equipmentPartId,
          scheduleExecutionId: task.scheduleExecutionId,
        });

        if (supResponse.status?.toLowerCase() === "success") {
          navigation.replace("SupervisorTaskReview", {
            task,
            scanResponse: supResponse,
            scannedEquipment,
          });
          return;
        }

        // On supervisor failure, show a simple alert (no related tasks returned)
        Alert.alert("QR validation failed", supResponse.message || "This task is not assigned to you for approval.");
        return;
      }

      // Operator scan
      const response = await scanTaskQr(authState.session.token, {
        equipmentId: scannedEquipment.equipmentId,
        equipmentElementId: scannedEquipment.equipmentElementId,
        equipmentPartId: scannedEquipment.equipmentPartId,
        scheduleExecutionId: task.scheduleExecutionId,
      });

      if (response.status?.toLowerCase() === "success") {
        navigation.replace("TaskExecution", {
          task,
          scanResponse: response,
          scannedEquipment,
          startedAt: Date.now(),
        });
        return;
      }

      setFailureResponse(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to validate the QR code.";
      Alert.alert("QR validation failed", message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBackToList() {
    setFailureResponse(null);
    navigation.dispatch(StackActions.pop(2));
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.lightSafeArea}>
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Checking camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.lightSafeArea}>
        <View style={styles.permissionState}>
          <Ionicons name="camera-outline" size={60} color={colors.primary} />
          <Text style={styles.permissionTitle}>Camera access is required</Text>
          <Text style={styles.permissionText}>
            Allow camera access so the app can scan the equipment QR code.
          </Text>
          <Pressable style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Allow Camera</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.cameraRoot}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={failureResponse || isSubmitting ? undefined : handleBarcodeScanned}
        />

        <View style={styles.topBar}>
          <Pressable style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-outline" size={26} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.topBarTitle}>Scan equipment QR</Text>
        </View>

        <View style={styles.scanFrame}>
          <View style={styles.cornerTopLeft} />
          <View style={styles.cornerTopRight} />
          <View style={styles.cornerBottomLeft} />
          <View style={styles.cornerBottomRight} />
        </View>

        <View style={styles.bottomCard}>
          <Text style={styles.bottomTitle}>{task.taskName}</Text>
          <Text style={styles.bottomText}>
            Align the equipment QR inside the frame. We will validate it against task execution #{task.scheduleExecutionId}.
          </Text>
          {isSubmitting ? (
            <View style={styles.validatingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.validatingText}>Validating QR...</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={!!failureResponse}
        onRequestClose={() => setFailureResponse(null)}
      >
        <View style={styles.modalRoot}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name="alert-circle-outline" size={34} color="#8A1F1F" />
            </View>
            <Text style={styles.modalTitle}>Task not assigned for this QR</Text>
            <Text style={styles.modalText}>
              {failureResponse?.message || "This scanned equipment does not match the selected task."}
            </Text>

            <Text style={styles.relatedHeading}>Other assigned tasks</Text>
            <ScrollView style={styles.relatedList} showsVerticalScrollIndicator={false}>
              {relatedTasks.length ? (
                relatedTasks.map((relatedTask) => (
                  <View key={relatedTask.scheduleExecutionId} style={styles.relatedTaskCard}>
                    <Text style={styles.relatedTaskName}>{relatedTask.taskName}</Text>
                    <Text style={styles.relatedTaskMeta}>
                      ID #{relatedTask.scheduleExecutionId}
                      {relatedTask.uom ? ` | UOM: ${relatedTask.uom}` : ""}
                    </Text>
                    <Text style={styles.relatedTaskPath}>
                      {formatQrTaskHierarchy(relatedTask) || "Machine hierarchy unavailable"}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noRelatedText}>
                  No other assigned tasks were returned for this QR.
                </Text>
              )}
            </ScrollView>

            <Pressable style={styles.backToListButton} onPress={handleBackToList}>
              <Text style={styles.backToListText}>Back to task list</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#050505",
  },
  lightSafeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  cameraRoot: {
    flex: 1,
    backgroundColor: "#050505",
  },
  centeredState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  stateText: {
    fontFamily: "Jost_400Regular",
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 12,
  },
  permissionState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 28,
  },
  permissionTitle: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 24,
    color: "#111111",
    marginTop: 18,
    textAlign: "center",
  },
  permissionText: {
    fontFamily: "Jost_400Regular",
    fontSize: 15,
    lineHeight: 22,
    color: "#565B74",
    marginTop: 10,
    textAlign: "center",
  },
  permissionButton: {
    width: "100%",
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },
  permissionButtonText: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 17,
    color: "#FFFFFF",
  },
  secondaryButton: {
    marginTop: 14,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontFamily: "Jost_500Medium",
    fontSize: 15,
    color: colors.primary,
  },
  topBar: {
    position: "absolute",
    top: 18,
    left: 18,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.42)",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 21,
    color: "#FFFFFF",
  },
  scanFrame: {
    position: "absolute",
    top: "27%",
    alignSelf: "center",
    width: 260,
    height: 260,
  },
  cornerTopLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 58,
    height: 58,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderColor: "#FFFFFF",
    borderTopLeftRadius: 18,
  },
  cornerTopRight: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 58,
    height: 58,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderColor: "#FFFFFF",
    borderTopRightRadius: 18,
  },
  cornerBottomLeft: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: 58,
    height: 58,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderColor: "#FFFFFF",
    borderBottomLeftRadius: 18,
  },
  cornerBottomRight: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 58,
    height: 58,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderColor: "#FFFFFF",
    borderBottomRightRadius: 18,
  },
  bottomCard: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 22,
    borderRadius: 24,
    backgroundColor: "rgba(17,17,17,0.82)",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  bottomTitle: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 20,
    color: "#FFFFFF",
  },
  bottomText: {
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.78)",
    marginTop: 8,
  },
  validatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  validatingText: {
    fontFamily: "Jost_500Medium",
    fontSize: 14,
    color: "#FFFFFF",
  },
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.36)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  modalCard: {
    maxHeight: "82%",
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  modalIcon: {
    alignSelf: "center",
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFF0EE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 22,
    lineHeight: 27,
    color: "#111111",
    textAlign: "center",
  },
  modalText: {
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: "#5A5F75",
    textAlign: "center",
    marginTop: 8,
  },
  relatedHeading: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 17,
    color: "#111111",
    marginTop: 18,
    marginBottom: 10,
  },
  relatedList: {
    maxHeight: 260,
  },
  relatedTaskCard: {
    borderRadius: 18,
    backgroundColor: "#F2F3F8",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  relatedTaskName: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 16,
    color: "#111111",
  },
  relatedTaskMeta: {
    fontFamily: "Jost_500Medium",
    fontSize: 13,
    color: colors.primary,
    marginTop: 4,
  },
  relatedTaskPath: {
    fontFamily: "Jost_400Regular",
    fontSize: 12,
    lineHeight: 17,
    color: "#5A5F75",
    marginTop: 5,
  },
  noRelatedText: {
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    color: "#5A5F75",
    textAlign: "center",
    paddingVertical: 22,
  },
  backToListButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  backToListText: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 17,
    color: "#FFFFFF",
  },
});
