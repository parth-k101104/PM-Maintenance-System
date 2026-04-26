import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WebView } from "react-native-webview";

import { fetchTaskDocuments } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { TaskDocumentUrls } from "../types/api";
import { RootStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "TaskDocuments">;
type DrawerDocumentType = "manual" | "sop";

function formatHierarchy(values: Array<string | undefined>) {
  return values.filter(Boolean).join(" > ");
}

function getDocumentMeta(documentType: DrawerDocumentType, documents: TaskDocumentUrls | null) {
  if (documentType === "manual") {
    return {
      title: "Machine manual",
      description: "Machine reference document fetched for this task execution.",
      url: documents?.machineManualUrl,
      key: documents?.machineManualKey,
      icon: "book-outline" as const,
    };
  }

  return {
    title: "Task SOP",
    description: "Task-specific SOP fetched for this task execution.",
    url: documents?.taskSopUrl,
    key: documents?.taskSopKey,
    icon: "document-text-outline" as const,
  };
}

function buildViewerUri(url?: string) {
  if (!url) {
    return undefined;
  }

  return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`;
}

export function TaskDocumentsScreen({ navigation, route }: Props) {
  const { authState } = useAuth();
  const { task } = route.params;
  const [documents, setDocuments] = useState<TaskDocumentUrls | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DrawerDocumentType>("manual");
  const [hasViewedTaskSop, setHasViewedTaskSop] = useState(false);
  const [hasAcknowledgedTaskSop, setHasAcknowledgedTaskSop] = useState(false);

  const machineHierarchy = useMemo(
    () => formatHierarchy([task.machineName, task.machineElementName, task.machinePartName]),
    [task.machineElementName, task.machineName, task.machinePartName]
  );

  const scanQrEnabled = hasViewedTaskSop && hasAcknowledgedTaskSop;
  const selectedMeta = getDocumentMeta(selectedDocument, documents);
  const viewerUri = buildViewerUri(selectedMeta.url);

  async function loadDocuments() {
    if (!authState.session) {
      setErrorMessage("Your session is unavailable. Please sign in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setDocuments(null);

    try {
      const response = await fetchTaskDocuments(
        authState.session.token,
        task.scheduleExecutionId
      );
      setDocuments(response);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load task documents right now.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, [authState.session, task.scheduleExecutionId]);

  function openDrawer(documentType: DrawerDocumentType) {
    if (documentType === "sop") {
      setHasViewedTaskSop(true);
    }

    setSelectedDocument(documentType);
    setDrawerVisible(true);
  }

  function handleScanQrPress() {
    navigation.navigate("QRScanner", { task });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable hitSlop={12} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-outline" size={28} color="#111111" />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>{task.taskName}</Text>
            <Text style={styles.subHeader}>
              {machineHierarchy || "Machine hierarchy unavailable"}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.executionCard}>
            <Text style={styles.executionLabel}>Task execution</Text>
            <Text style={styles.executionValue}>#{task.scheduleExecutionId}</Text>
            <Text style={styles.executionHint}>
              Documents are fetched from the backend using this execution id.
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading machine manual and task SOP...</Text>
            </View>
          ) : null}

          {!loading && errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Unable to load task documents</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Pressable style={styles.retryButton} onPress={loadDocuments}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.documentCard,
              styles.manualCard,
              pressed && styles.documentCardPressed,
            ]}
            onPress={() => openDrawer("manual")}
            disabled={loading}
          >
            <View style={styles.documentCardTop}>
              <Ionicons name="book-outline" size={26} color="#111111" />
              <Ionicons name="chevron-forward-outline" size={22} color="#111111" />
            </View>
            <Text style={styles.documentTitle}>Machine manual</Text>
            <Text style={styles.documentSubtitle}>
              Open the machine manual linked to this task execution.
            </Text>
            <Text style={styles.documentStatus}>
              {documents?.machineManualUrl ? "PDF ready" : "Document unavailable"}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.documentCard,
              styles.sopCard,
              pressed && styles.documentCardPressed,
            ]}
            onPress={() => openDrawer("sop")}
            disabled={loading}
          >
            <View style={styles.documentCardTop}>
              <Ionicons name="document-text-outline" size={26} color="#111111" />
              <Ionicons name="chevron-forward-outline" size={22} color="#111111" />
            </View>
            <Text style={styles.documentTitle}>Task SOP</Text>
            <Text style={styles.documentSubtitle}>
              Review the SOP and acknowledge it before QR scanning is enabled.
            </Text>
            <Text style={styles.documentStatus}>
              {hasAcknowledgedTaskSop ? "Acknowledged" : "Pending acknowledgment"}
            </Text>
          </Pressable>

          <View style={styles.scanSection}>
            <Text style={styles.scanTitle}>Next step</Text>
            <Text style={styles.scanHint}>
              The Scan QR action becomes active after the Task SOP is opened and acknowledged.
            </Text>

            <Pressable
              style={[
                styles.scanButton,
                scanQrEnabled ? styles.scanButtonEnabled : styles.scanButtonDisabled,
              ]}
              onPress={handleScanQrPress}
              disabled={!scanQrEnabled}
            >
              <Ionicons
                name="qr-code-outline"
                size={22}
                color={scanQrEnabled ? "#FFFFFF" : "#7D819B"}
              />
              <Text
                style={[
                  styles.scanButtonText,
                  !scanQrEnabled && styles.scanButtonTextDisabled,
                ]}
              >
                Scan QR
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={drawerVisible}
        onRequestClose={() => setDrawerVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalOverlay} onPress={() => setDrawerVisible(false)} />
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerTitleGroup}>
                <Ionicons name={selectedMeta.icon} size={24} color="#111111" />
                <Text style={styles.drawerTitle}>{selectedMeta.title}</Text>
              </View>
              <Pressable hitSlop={12} onPress={() => setDrawerVisible(false)}>
                <Ionicons name="close-outline" size={28} color="#111111" />
              </Pressable>
            </View>

            <Text style={styles.drawerDescription}>{selectedMeta.description}</Text>

            {viewerUri ? (
              <View style={styles.viewerCard}>
                <WebView
                  key={`${selectedDocument}-${viewerUri}`}
                  source={{ uri: viewerUri }}
                  style={styles.webView}
                  startInLoadingState
                  renderLoading={() => (
                    <View style={styles.viewerLoadingState}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={styles.viewerLoadingText}>Loading PDF...</Text>
                    </View>
                  )}
                />
              </View>
            ) : (
              <View style={styles.previewCard}>
                <Text style={styles.previewLabel}>PDF source</Text>
                <Text style={styles.previewTitle}>No PDF available</Text>
                <Text style={styles.previewText}>
                  The backend did not return a usable document URL for this file.
                </Text>
                {selectedMeta.key ? (
                  <Text style={styles.keyText}>{selectedMeta.key}</Text>
                ) : (
                  <Text style={styles.keyText}>No backend key returned for this document.</Text>
                )}
              </View>
            )}

            {selectedDocument === "sop" ? (
              <Pressable
                style={[
                  styles.acknowledgeButton,
                  hasAcknowledgedTaskSop && styles.acknowledgeButtonActive,
                ]}
                onPress={() => {
                  setHasAcknowledgedTaskSop(true);
                  setDrawerVisible(false);
                }}
              >
                <Ionicons
                  name={hasAcknowledgedTaskSop ? "checkmark-circle" : "checkmark-circle-outline"}
                  size={22}
                  color={hasAcknowledgedTaskSop ? "#FFFFFF" : "#2D3268"}
                />
                <Text
                  style={[
                    styles.acknowledgeText,
                    hasAcknowledgedTaskSop && styles.acknowledgeTextActive,
                  ]}
                >
                  {hasAcknowledgedTaskSop
                    ? "Task SOP acknowledged"
                    : "I acknowledge that I have read the Task SOP"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
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
    lineHeight: 28,
    color: "#111111",
  },
  subHeader: {
    fontFamily: "Jost_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: "#6C3242",
    marginTop: 6,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 32,
    gap: 16,
  },
  executionCard: {
    backgroundColor: "#EFF0F8",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  executionLabel: {
    fontFamily: "Jost_500Medium",
    fontSize: 14,
    color: "#5F6486",
  },
  executionValue: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 28,
    lineHeight: 34,
    color: "#111111",
    marginTop: 6,
  },
  executionHint: {
    fontFamily: "Jost_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: "#5C617E",
    marginTop: 8,
  },
  loadingCard: {
    backgroundColor: "#F8F8FC",
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  loadingText: {
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    color: "#5E6278",
    marginTop: 12,
    textAlign: "center",
  },
  errorCard: {
    backgroundColor: "#FFF0EE",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  errorTitle: {
    fontFamily: "Jost_500Medium",
    fontSize: 17,
    color: "#8A1F1F",
  },
  errorText: {
    fontFamily: "Jost_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: "#8A1F1F",
    marginTop: 8,
  },
  retryButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: "#111111",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    fontFamily: "Jost_500Medium",
    fontSize: 14,
    color: "#FFFFFF",
  },
  documentCard: {
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingVertical: 18,
    minHeight: 162,
  },
  manualCard: {
    backgroundColor: "#DCE7D8",
  },
  sopCard: {
    backgroundColor: "#F5E4C9",
  },
  documentCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  documentCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  documentTitle: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 22,
    lineHeight: 26,
    color: "#111111",
  },
  documentSubtitle: {
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: "#383838",
    marginTop: 8,
  },
  documentStatus: {
    fontFamily: "Jost_500Medium",
    fontSize: 13,
    color: "#2D3268",
    marginTop: 16,
  },
  scanSection: {
    backgroundColor: "#E5E5ED",
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  scanTitle: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 22,
    lineHeight: 26,
    color: "#111111",
  },
  scanHint: {
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: "#55586C",
    marginTop: 8,
    marginBottom: 18,
  },
  scanButton: {
    minHeight: 58,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  scanButtonEnabled: {
    backgroundColor: "#111111",
  },
  scanButtonDisabled: {
    backgroundColor: "#CDD0DA",
  },
  scanButtonText: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 18,
    color: "#FFFFFF",
  },
  scanButtonTextDisabled: {
    color: "#7D819B",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  drawer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 26,
    minHeight: 420,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  drawerTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  drawerTitle: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 22,
    color: "#111111",
  },
  drawerDescription: {
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: "#565B74",
    marginTop: 12,
    marginBottom: 18,
  },
  previewCard: {
    backgroundColor: "#F4F5FA",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  viewerCard: {
    overflow: "hidden",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E4E6F0",
    backgroundColor: "#F4F5FA",
    minHeight: 420,
  },
  webView: {
    minHeight: 420,
    backgroundColor: "#F4F5FA",
  },
  viewerLoadingState: {
    flex: 1,
    minHeight: 420,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F5FA",
  },
  viewerLoadingText: {
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    color: "#5E6278",
    marginTop: 10,
  },
  previewLabel: {
    fontFamily: "Jost_500Medium",
    fontSize: 13,
    color: "#61657E",
  },
  previewTitle: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 20,
    color: "#111111",
    marginTop: 6,
  },
  previewText: {
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: "#484C60",
    marginTop: 10,
  },
  keyText: {
    fontFamily: "Jost_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: "#5E6278",
    marginTop: 14,
  },
  acknowledgeButton: {
    marginTop: 14,
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2D3268",
    backgroundColor: "#F6F7FD",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 14,
  },
  acknowledgeButtonActive: {
    backgroundColor: "#2D3268",
    borderColor: "#2D3268",
  },
  acknowledgeText: {
    fontFamily: "Jost_500Medium",
    fontSize: 15,
    lineHeight: 20,
    color: "#2D3268",
    textAlign: "center",
    flex: 1,
  },
  acknowledgeTextActive: {
    color: "#FFFFFF",
  },
});
