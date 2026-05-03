import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { reviewFlagAsSupervisor, scanFlagQr } from "../api/client";
import { AppMessageModal } from "../components/AppMessageModal";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { FlagScanResponse } from "../types/api";
import { RootStackParamList } from "../types/navigation";
import { getBackendMessage } from "../utils/messages";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, "SupervisorFlagReview">;

export function SupervisorFlagReviewScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { flag } = route.params;
  const { authState } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [flagDetails, setFlagDetails] = useState<FlagScanResponse | null>(null);

  const [status, setStatus] = useState(
    flag.status === "POTENTIAL_REPLACEMENT" ? "REPLACEMENT_REQUIRED" : flag.status === "UNDER_REVIEW" ? "CLOSED" : flag.status,
  );
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

  const canEscalate = flag.status === "POTENTIAL_REPLACEMENT";
  const canApproveClosure = flag.status === "UNDER_REVIEW";

  useEffect(() => {
    async function loadDetails() {
      if (!authState.session) return;
      try {
        const data = await scanFlagQr(authState.session.token, flag.flagId, {});
        setFlagDetails(data);
      } catch (e: any) {
        Alert.alert("Error", getBackendMessage(e, "Could not load flag details"));
      } finally {
        setLoading(false);
      }
    }
    loadDetails();
  }, [flag.flagId, authState.session]);

  const submitReview = async () => {
    setSubmitting(true);
    try {
      await reviewFlagAsSupervisor(authState.session!.token, flag.flagId, {
        newStatus: status,
        notes: notes,
      });

      setMessageModal({
        visible: true,
        type: "success",
        title: "Success",
        message: canApproveClosure ? "Flag approved and closed successfully." : "Flag status escalated successfully.",
        goBackOnClose: true,
      });
    } catch (e: any) {
      setMessageModal({
        visible: true,
        type: "failure",
        title: "Review failed",
        message: getBackendMessage(e, "Failed to escalate the flag."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const closeMessageModal = () => {
    const shouldGoBack = messageModal.goBackOnClose;
    setMessageModal((current) => ({ ...current, visible: false }));
    if (shouldGoBack) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={28} color="#111111" />
        </Pressable>
        <Text style={styles.headerTitle}>Review Flag</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.detailCard}>
          <Text style={styles.label}>Flagged Part</Text>
          <Text style={styles.value}>{flag.partName}</Text>
          <Text style={styles.subValue}>{flag.equipmentName} ({flag.location})</Text>

          <View style={styles.divider} />
          <Text style={styles.label}>Current Status</Text>
          <Text style={styles.value}>{flag.status.replace(/_/g, ' ')}</Text>
          
          <Text style={styles.label}>Criticality</Text>
          <Text style={styles.value}>{flag.criticality}</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : flagDetails ? (
          <View style={styles.workflowSection}>
            <View style={styles.verificationCard}>
              {flagDetails.actualValue !== undefined && flagDetails.actualValue !== null && (
                <View style={styles.readingBox}>
                  <Text style={styles.readingLabel}>Recorded Deviation</Text>
                  <Text style={styles.readingValue}>
                    {flagDetails.actualValue} {flagDetails.uom}
                  </Text>
                  <Text style={styles.readingRange}>
                    Standard: {flagDetails.standardValue} (Range: {flagDetails.toleranceMin} - {flagDetails.toleranceMax})
                  </Text>
                </View>
              )}

              {flagDetails.sparePartId ? (
                <View style={styles.sparePartBox}>
                  <Text style={styles.spareTitle}>Spare Part Availability</Text>
                  <Text style={styles.spareName}>{flagDetails.sparePartName}</Text>
                  <Text style={styles.spareDesc}>No: {flagDetails.sparePartNumber}</Text>
                  <Text style={styles.spareDesc}>Location: {flagDetails.sparePartLocation}</Text>
                  <Text style={[styles.spareStock, flagDetails.sparePartCurrentStock! < 5 && { color: "#DC2626" }]}>
                    Current Stock: {flagDetails.sparePartCurrentStock}
                  </Text>
                </View>
              ) : (
                <Text style={styles.noSpareText}>No spare part linked to this component in SAP.</Text>
              )}
            </View>

            {canEscalate ? (
              <>
                <View style={styles.notesSection}>
                  <Text style={styles.sectionTitle}>Change Status</Text>
                  <View style={styles.optionGrid}>
                    <Pressable style={[styles.optionChip, styles.optionChipSelected]} onPress={() => setStatus("REPLACEMENT_REQUIRED")}>
                      <Text style={[styles.optionText, styles.optionTextSelected]}>Replacement Required</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.notesSection}>
                  <Text style={styles.sectionTitle}>Notes (Optional)</Text>
                  <TextInput
                    style={styles.notesInput}
                    multiline
                    numberOfLines={3}
                    placeholder="Add any remarks for the line manager..."
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>

                <View style={styles.actionRow}>
                  <Pressable style={styles.primaryBtn} onPress={submitReview} disabled={submitting}>
                    {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>SUBMIT REVIEW</Text>}
                  </Pressable>
                </View>
              </>
            ) : canApproveClosure ? (
              <>
                <View style={styles.notesSection}>
                  <Text style={styles.sectionTitle}>Supervisor Approval</Text>
                  <Text style={styles.reviewCopy}>
                    The operator has completed the replacement or inspection. Approve this review to close the flag.
                  </Text>
                </View>

                <View style={styles.notesSection}>
                  <Text style={styles.sectionTitle}>Notes (Optional)</Text>
                  <TextInput
                    style={styles.notesInput}
                    multiline
                    numberOfLines={3}
                    placeholder="Add closure remarks..."
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>

                <View style={styles.actionRow}>
                  <Pressable style={styles.primaryBtn} onPress={submitReview} disabled={submitting}>
                    {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>APPROVE & CLOSE</Text>}
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={styles.readOnlyBox}>
                <Ionicons name="information-circle-outline" size={24} color="#2563EB" style={{ marginBottom: 8 }} />
                <Text style={styles.readOnlyText}>
                  This flag is visible for supervisor tracking. Only Potential Replacement and Under Review flags can be acted on here.
                </Text>
              </View>
            )}
          </View>
        ) : null}
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
  label: { fontFamily: "Jost_400Regular", fontSize: 13, color: "#6B7280", marginBottom: 4, marginTop: 12 },
  value: { fontFamily: "Jost_600SemiBold", fontSize: 18, color: "#111111" },
  subValue: { fontFamily: "Jost_400Regular", fontSize: 14, color: "#4B5563", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 },
  
  workflowSection: { marginTop: 8 },
  verificationCard: {
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    marginBottom: 24,
  },
  
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

  notesSection: { marginBottom: 24 },
  sectionTitle: { fontFamily: "Jost_600SemiBold", fontSize: 16, color: "#111111", marginBottom: 12 },
  reviewCopy: { fontFamily: "Jost_400Regular", fontSize: 14, lineHeight: 20, color: "#4B5563" },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionChipSelected: { backgroundColor: "#111111", borderColor: "#111111" },
  optionText: { fontFamily: "Jost_500Medium", fontSize: 13, color: "#374151" },
  optionTextSelected: { color: "#FFFFFF" },
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

  readOnlyBox: {
    backgroundColor: "#EFF6FF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "flex-start",
  },
  readOnlyText: { fontFamily: "Jost_400Regular", fontSize: 14, color: "#1E3A8A", lineHeight: 20 },
});
