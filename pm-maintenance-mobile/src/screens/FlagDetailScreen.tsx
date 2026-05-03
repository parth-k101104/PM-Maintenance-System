import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";

import { completeFlagReplacement, scanFlagQr } from "../api/client";
import { AppMessageModal } from "../components/AppMessageModal";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { FlagScanResponse } from "../types/api";
import { RootStackParamList } from "../types/navigation";
import { getBackendMessage, getResponseMessage } from "../utils/messages";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, "FlagDetail">;

export function FlagDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { flag } = route.params;
  const { authState } = useAuth();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<FlagScanResponse | null>(null);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [takingPhoto, setTakingPhoto] = useState(false);
  let cameraRef: CameraView | null = null;

  const [notes, setNotes] = useState("");
  const [messageModal, setMessageModal] = useState<{
    visible: boolean;
    type: "success" | "failure";
    title: string;
    message: string;
    goBackOnClose?: boolean;
  }>({
    visible: false,
    type: "success",
    title: "",
    message: "",
  });

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (loading) return;
    setScanning(false);
    setLoading(true);

    try {
      // Mock parsing logic; adjust to real QR data format
      const isJson = data.startsWith("{");
      const eqId = isJson ? JSON.parse(data).equipmentId : parseInt(data.replace(/[^0-9]/g, ""), 10);
      
      const res = await scanFlagQr(authState.session!.token, flag.flagId, {
        equipmentId: eqId || undefined,
        equipmentElementId: isJson ? JSON.parse(data).equipmentElementId : undefined,
        equipmentPartId: isJson ? JSON.parse(data).equipmentPartId : undefined,
      });
      setScanResult(res);
    } catch (e: any) {
      setMessageModal({
        visible: true,
        type: "failure",
        title: "Scan failed",
        message: getBackendMessage(e, "Failed to verify equipment."),
      });
    } finally {
      setLoading(false);
    }
  };

  const startScanning = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Permission required", "Camera permission is needed to scan QR code.");
        return;
      }
    }
    setScanning(true);
  };

  const takePicture = async () => {
    if (cameraRef) {
      const photo = await cameraRef.takePictureAsync({ quality: 0.5 });
      setPhotoUri(photo!.uri);
      setTakingPhoto(false);
    }
  };

  const submitReplacement = async (replaced: boolean) => {
    if (replaced && !photoUri) {
      Alert.alert("Required", "Please take a photo of the replacement.");
      return;
    }

    setLoading(true);
    try {
      // Upload photo to S3 if taking replacement
      if (replaced && photoUri && scanResult?.photoUploadUrl) {
        const fetchResponse = await fetch(photoUri);
        const blob = await fetchResponse.blob();
        const uploadRes = await fetch(scanResult.photoUploadUrl, {
          method: "PUT",
          body: blob,
          headers: { "Content-Type": "image/jpeg" },
        });
        if (!uploadRes.ok) {
          const errorText = await uploadRes.text();
          console.error("S3 Upload Error Body:", errorText);
          throw new Error(`S3 upload failed with status ${uploadRes.status}. Check console for details.`);
        }
      }

      const response = await completeFlagReplacement(authState.session!.token, flag.flagId, {
        replacementDone: replaced,
        sparePartId: scanResult?.sparePartId,
        notes: notes,
      });

      setMessageModal({
        visible: true,
        type: "success",
        title: "Success",
        message: getResponseMessage(response, "Issue flag has been submitted for supervisor review."),
        goBackOnClose: true,
      });
    } catch (e: any) {
      setMessageModal({
        visible: true,
        type: "failure",
        title: "Replacement failed",
        message: getBackendMessage(e, "Failed to complete replacement."),
      });
    } finally {
      setLoading(false);
    }
  };

  const closeMessageModal = () => {
    const shouldGoBack = messageModal.goBackOnClose;
    setMessageModal((current) => ({ ...current, visible: false }));
    if (shouldGoBack) {
      navigation.goBack();
    }
  };

  if (scanning) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        />
        <SafeAreaView style={styles.overlaySafe}>
          <View style={styles.cameraHeader}>
            <Pressable onPress={() => setScanning(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={28} color="#FFF" />
            </Pressable>
            <Text style={styles.cameraTitle}>Scan Equipment QR</Text>
          </View>
          <View style={styles.scanTarget} />
          <Text style={styles.scanInstruction}>Point camera at the equipment QR code</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (takingPhoto) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          ref={(ref) => {
            cameraRef = ref;
          }}
        />
        <SafeAreaView style={styles.overlaySafe}>
          <View style={styles.cameraHeader}>
            <Pressable onPress={() => setTakingPhoto(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={28} color="#FFF" />
            </Pressable>
            <Text style={styles.cameraTitle}>Take Photo</Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={styles.captureFooter}>
            <Pressable style={styles.captureBtn} onPress={takePicture}>
              <View style={styles.captureInner} />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={28} color="#111111" />
        </Pressable>
        <Text style={styles.headerTitle}>Replacement Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.detailCard}>
          <Text style={styles.label}>Flagged Part</Text>
          <Text style={styles.value}>{flag.partName}</Text>
          <Text style={styles.subValue}>{flag.equipmentName} ({flag.location})</Text>

          <View style={styles.divider} />
          <Text style={styles.label}>Issue Status</Text>
          <Text style={styles.value}>{flag.status.replace(/_/g, ' ')}</Text>
          <Text style={styles.subValue}>Priority: {flag.criticality}</Text>
        </View>

        {!scanResult ? (
          <View style={styles.scanSection}>
            <Text style={styles.sectionDesc}>
              To begin the replacement, please scan the QR code on the equipment to verify your location.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={startScanning} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>SCAN QR CODE</Text>}
            </Pressable>
          </View>
        ) : (
          <View style={styles.workflowSection}>
            <View style={styles.verificationCard}>
              <Ionicons name="checkmark-circle" size={24} color="#16A34A" style={{ marginBottom: 8 }} />
              <Text style={styles.successText}>Location Verified</Text>
              
              {scanResult.actualValue !== undefined && (
                <View style={styles.readingBox}>
                  <Text style={styles.readingLabel}>Recorded Deviation</Text>
                  <Text style={styles.readingValue}>
                    {scanResult.actualValue} {scanResult.uom}
                  </Text>
                  <Text style={styles.readingRange}>
                    Standard: {scanResult.standardValue} (Range: {scanResult.toleranceMin} - {scanResult.toleranceMax})
                  </Text>
                </View>
              )}

              {scanResult.sparePartId ? (
                <View style={styles.sparePartBox}>
                  <Text style={styles.spareTitle}>Suggested Spare Part</Text>
                  <Text style={styles.spareName}>{scanResult.sparePartName}</Text>
                  <Text style={styles.spareDesc}>No: {scanResult.sparePartNumber}</Text>
                  <Text style={styles.spareDesc}>Location: {scanResult.sparePartLocation}</Text>
                  <Text style={[styles.spareStock, scanResult.sparePartCurrentStock! < 5 && { color: "#DC2626" }]}>
                    Current Stock: {scanResult.sparePartCurrentStock}
                  </Text>
                </View>
              ) : (
                <Text style={styles.noSpareText}>No spare part linked to this component in SAP.</Text>
              )}
            </View>

            <View style={styles.photoSection}>
              <Text style={styles.sectionTitle}>Replacement Proof</Text>
              {photoUri ? (
                <View>
                  <Image source={{ uri: photoUri }} style={styles.previewImage} />
                  <Pressable style={styles.retakeBtn} onPress={() => setTakingPhoto(true)}>
                    <Text style={styles.retakeText}>Retake Photo</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.photoBtn} onPress={() => setTakingPhoto(true)}>
                  <Ionicons name="camera-outline" size={32} color="#4F46E5" />
                  <Text style={styles.photoBtnText}>Take Photo of Replacement</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.notesSection}>
              <Text style={styles.sectionTitle}>Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                multiline
                numberOfLines={3}
                placeholder="Add any remarks about the replacement..."
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <View style={styles.actionRow}>
              <Pressable style={styles.secondaryBtn} onPress={() => submitReplacement(false)} disabled={loading}>
                <Text style={styles.secondaryBtnText}>Skip Replacement</Text>
              </Pressable>
              <Pressable style={[styles.primaryBtn, { flex: 2, marginLeft: 12 }]} onPress={() => submitReplacement(true)} disabled={loading || !photoUri}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>COMPLETE</Text>}
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
      <AppMessageModal
        visible={messageModal.visible}
        type={messageModal.type}
        title={messageModal.title}
        message={messageModal.message}
        onPrimaryAction={closeMessageModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
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
    marginLeft: 16,
    color: "#111111",
  },
  content: { padding: 20, paddingBottom: 40 },
  detailCard: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 24,
  },
  label: { fontFamily: "Jost_400Regular", fontSize: 13, color: "#6B7280", marginBottom: 4 },
  value: { fontFamily: "Jost_600SemiBold", fontSize: 18, color: "#111111" },
  subValue: { fontFamily: "Jost_400Regular", fontSize: 14, color: "#4B5563", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 },
  
  scanSection: { alignItems: "center", marginTop: 20 },
  sectionDesc: { fontFamily: "Jost_400Regular", fontSize: 15, color: "#4B5563", textAlign: "center", marginBottom: 24, lineHeight: 22 },
  
  workflowSection: { marginTop: 8 },
  verificationCard: {
    backgroundColor: "#ECFDF5",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#10B981",
    marginBottom: 24,
  },
  successText: { fontFamily: "Jost_600SemiBold", fontSize: 16, color: "#065F46", marginBottom: 16 },
  
  readingBox: { backgroundColor: "#FFFFFF", padding: 12, borderRadius: 8, marginBottom: 12 },
  readingLabel: { fontFamily: "Jost_500Medium", fontSize: 12, color: "#6B7280", textTransform: "uppercase" },
  readingValue: { fontFamily: "Jost_600SemiBold", fontSize: 18, color: "#DC2626", marginVertical: 4 },
  readingRange: { fontFamily: "Jost_400Regular", fontSize: 12, color: "#9CA3AF" },

  sparePartBox: { backgroundColor: "#FFFFFF", padding: 12, borderRadius: 8 },
  spareTitle: { fontFamily: "Jost_500Medium", fontSize: 12, color: "#6B7280", textTransform: "uppercase", marginBottom: 6 },
  spareName: { fontFamily: "Jost_600SemiBold", fontSize: 15, color: "#111111" },
  spareDesc: { fontFamily: "Jost_400Regular", fontSize: 13, color: "#4B5563", marginTop: 2 },
  spareStock: { fontFamily: "Jost_500Medium", fontSize: 13, color: "#16A34A", marginTop: 6 },
  noSpareText: { fontFamily: "Jost_400Regular", fontSize: 13, color: "#6B7280", fontStyle: "italic" },

  photoSection: { marginBottom: 24 },
  sectionTitle: { fontFamily: "Jost_600SemiBold", fontSize: 16, color: "#111111", marginBottom: 12 },
  photoBtn: {
    height: 120,
    backgroundColor: "#EEF2FF",
    borderWidth: 2,
    borderColor: "#C7D2FE",
    borderStyle: "dashed",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  photoBtnText: { fontFamily: "Jost_500Medium", fontSize: 14, color: "#4F46E5", marginTop: 8 },
  previewImage: { width: "100%", height: 200, borderRadius: 12, marginBottom: 12 },
  retakeBtn: { alignSelf: "center", paddingVertical: 8, paddingHorizontal: 16 },
  retakeText: { fontFamily: "Jost_500Medium", fontSize: 14, color: "#4F46E5" },

  notesSection: { marginBottom: 24 },
  notesInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontFamily: "Jost_400Regular",
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },

  actionRow: { flexDirection: "row" },
  primaryBtn: {
    backgroundColor: "#111111",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  primaryBtnText: { fontFamily: "Jost_600SemiBold", fontSize: 15, color: "#FFFFFF", letterSpacing: 0.5 },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { fontFamily: "Jost_500Medium", fontSize: 14, color: "#4B5563" },

  cameraContainer: { flex: 1, backgroundColor: "#000" },
  overlaySafe: { flex: 1 },
  cameraHeader: { flexDirection: "row", alignItems: "center", padding: 16 },
  closeBtn: { padding: 8, backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 20 },
  cameraTitle: { fontFamily: "Jost_600SemiBold", fontSize: 18, color: "#FFF", marginLeft: 16 },
  scanTarget: {
    alignSelf: "center",
    marginTop: "30%",
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#10B981",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  scanInstruction: {
    fontFamily: "Jost_400Regular",
    fontSize: 16,
    color: "#FFF",
    textAlign: "center",
    marginTop: 24,
  },
  captureFooter: { alignItems: "center", paddingBottom: 40 },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#FFF" },
});
