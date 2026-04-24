import React from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { colors } from "../theme/colors";
import { HistoricalDataPoint } from "../types/api";
import { RootStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "SupervisorTaskReview">;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BAR_AREA_WIDTH = SCREEN_WIDTH - 32 - 24; // horizontal padding

function isMeasurementTask(uom?: string) {
  return !!uom && uom.trim().toUpperCase() !== "N/A";
}

function formatValue(v?: number | null) {
  if (v === undefined || v === null) return "—";
  return String(v);
}

/** Returns the chart bar value (actual measurement or time taken) */
function chartValue(point: HistoricalDataPoint, isMeasurement: boolean) {
  if (isMeasurement) return point.actualValue ?? 0;
  return point.timeTaken ?? 0;
}

function DeviationChip({ flag }: { flag?: boolean }) {
  if (flag) {
    return (
      <View style={chip.deviationBadge}>
        <Ionicons name="warning-outline" size={13} color="#B42318" />
        <Text style={chip.deviationText}>Deviation</Text>
      </View>
    );
  }
  return (
    <View style={chip.okBadge}>
      <Ionicons name="checkmark-circle-outline" size={13} color="#167C16" />
      <Text style={chip.okText}>Within range</Text>
    </View>
  );
}

const chip = StyleSheet.create({
  deviationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 8,
    backgroundColor: "#FFEAE8",
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  deviationText: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 12,
    color: "#B42318",
  },
  okBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 8,
    backgroundColor: "#D8EAD7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  okText: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 12,
    color: "#167C16",
  },
});

export function SupervisorTaskReviewScreen({ navigation, route }: Props) {
  const { task, scanResponse, scannedEquipment } = route.params;
  const isMeasurement = isMeasurementTask(scanResponse.uom);
  const historicalData = scanResponse.historicalData ?? [];

  // Compute bar chart max value
  const values = historicalData.map((p) => chartValue(p, isMeasurement));
  const refValue = isMeasurement
    ? scanResponse.standardValue ?? 0
    : scanResponse.estimatedReqTime ?? 0;
  const maxVal = Math.max(...values, refValue, 1);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={28} color="#111111" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Supervisor Review</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {task.taskName}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Success banner ── */}
        <View style={styles.successCard}>
          <View style={styles.successIconWrap}>
            <Ionicons name="qr-code-outline" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>QR verified</Text>
          <Text style={styles.successText}>{scanResponse.message}</Text>
        </View>

        {/* ── Current execution metrics ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Execution details</Text>

          <View style={styles.metricsGrid}>
            {isMeasurement && (
              <>
                <View style={styles.metricPill}>
                  <Text style={styles.metricKey}>Actual value</Text>
                  <Text style={styles.metricVal}>
                    {formatValue(scanResponse.actualValue)} {scanResponse.uom}
                  </Text>
                </View>
                <View style={styles.metricPill}>
                  <Text style={styles.metricKey}>Standard</Text>
                  <Text style={styles.metricVal}>
                    {formatValue(scanResponse.standardValue)} {scanResponse.uom}
                  </Text>
                </View>
                <View style={[styles.metricPill, styles.pillWide]}>
                  <Text style={styles.metricKey}>Tolerance</Text>
                  <Text style={styles.metricVal}>
                    {formatValue(scanResponse.toleranceMin)} –{" "}
                    {formatValue(scanResponse.toleranceMax)} {scanResponse.uom}
                  </Text>
                </View>
              </>
            )}
            <View style={styles.metricPill}>
              <Text style={styles.metricKey}>Time taken</Text>
              <Text style={styles.metricVal}>{formatValue(scanResponse.timeTaken)} mins</Text>
            </View>
            <View style={styles.metricPill}>
              <Text style={styles.metricKey}>Est. required</Text>
              <Text style={styles.metricVal}>{formatValue(scanResponse.estimatedReqTime)} mins</Text>
            </View>
          </View>

          <View style={styles.deviationRow}>
            <Text style={styles.metricKey}>Status</Text>
            <DeviationChip flag={scanResponse.deviationFlag} />
          </View>

          {!!scanResponse.notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Operator notes</Text>
              <Text style={styles.notesText}>{scanResponse.notes}</Text>
            </View>
          )}
        </View>

        {/* ── Observation photo ── */}
        {!!scanResponse.observationPhotoUrl && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Observation photo</Text>
            <Image
              source={{ uri: scanResponse.observationPhotoUrl }}
              style={styles.photo}
              resizeMode="cover"
            />
          </View>
        )}

        {/* ── Historical chart ── */}
        {historicalData.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>
              Historical {isMeasurement ? "measurements" : "time taken"} (last{" "}
              {historicalData.length} executions)
            </Text>

            {/* Bar chart */}
            <View style={styles.chartArea}>
              {/* Reference line */}
              <View
                style={[
                  styles.refLine,
                  { bottom: (refValue / maxVal) * 140 },
                ]}
              >
                <Text style={styles.refLineLabel}>
                  {isMeasurement ? `Std: ${refValue}` : `Est: ${refValue}m`}
                </Text>
              </View>

              {historicalData.map((point, idx) => {
                const val = chartValue(point, isMeasurement);
                const barH = Math.max(4, (val / maxVal) * 140);
                const isDeviation = point.deviationFlag;
                return (
                  <View key={point.scheduleExecutionId} style={styles.barWrap}>
                    <Text style={styles.barValue}>
                      {val > 0 ? val : "—"}
                    </Text>
                    <View
                      style={[
                        styles.bar,
                        { height: barH },
                        isDeviation ? styles.barDeviation : styles.barNormal,
                      ]}
                    />
                    <Text style={styles.barLabel}>#{idx + 1}</Text>
                  </View>
                );
              })}
            </View>

            {/* Legend */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#167C16" }]} />
                <Text style={styles.legendText}>Normal</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#B42318" }]} />
                <Text style={styles.legendText}>Deviation</Text>
              </View>
            </View>

            {/* Historical table */}
            <View style={styles.historyTable}>
              {historicalData.map((point, idx) => (
                <View
                  key={point.scheduleExecutionId}
                  style={[
                    styles.historyRow,
                    idx === historicalData.length - 1 && styles.historyRowLast,
                  ]}
                >
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyIdx}>#{idx + 1}</Text>
                    <View>
                      <Text style={styles.historyBy}>{point.executedBy ?? "Unknown"}</Text>
                      <Text style={styles.historyDate}>
                        {point.completedDate
                          ? new Date(point.completedDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })
                          : "—"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.historyRight}>
                    {isMeasurement ? (
                      <Text style={styles.historyVal}>
                        {formatValue(point.actualValue)} {scanResponse.uom}
                      </Text>
                    ) : (
                      <Text style={styles.historyVal}>{formatValue(point.timeTaken)} mins</Text>
                    )}
                    <DeviationChip flag={point.deviationFlag} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Approve / Reject buttons (placeholder) ── */}
        <View style={styles.actionsRow}>
          <Pressable style={[styles.actionBtn, styles.rejectBtn]}>
            <Ionicons name="close-circle-outline" size={20} color="#B42318" />
            <Text style={styles.rejectBtnText}>Reject</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, styles.approveBtn]}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.approveBtnText}>Approve</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontFamily: "Jost_600SemiBold", fontSize: 24, color: "#111111" },
  headerSubtitle: {
    fontFamily: "Jost_400Regular",
    fontSize: 13,
    color: "#5A5F75",
    marginTop: 3,
  },
  content: { paddingHorizontal: 16, paddingBottom: 42, gap: 14 },

  // Success banner
  successCard: {
    borderRadius: 24,
    backgroundColor: "#D8EAD7",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  successIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#167C16",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  successTitle: { fontFamily: "Jost_600SemiBold", fontSize: 20, color: "#111111" },
  successText: {
    fontFamily: "Jost_400Regular",
    fontSize: 13,
    color: "#36503A",
    lineHeight: 19,
    marginTop: 5,
  },

  // Generic card
  card: {
    borderRadius: 24,
    backgroundColor: "#F5F6FA",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  cardLabel: {
    fontFamily: "Jost_500Medium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#626781",
    marginBottom: 14,
  },

  // Metrics grid
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  metricPill: {
    flex: 1,
    minWidth: "44%",
    borderRadius: 16,
    backgroundColor: "#ECEDF5",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pillWide: { minWidth: "96%" },
  metricKey: {
    fontFamily: "Jost_400Regular",
    fontSize: 11,
    color: "#7A7A8D",
    marginBottom: 4,
  },
  metricVal: { fontFamily: "Jost_600SemiBold", fontSize: 17, color: "#111111" },

  deviationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  notesBox: {
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 6,
  },
  notesLabel: {
    fontFamily: "Jost_500Medium",
    fontSize: 12,
    color: "#7A7A8D",
    marginBottom: 4,
  },
  notesText: {
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    color: "#111111",
    lineHeight: 20,
  },

  // Photo
  photo: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    backgroundColor: "#E0E0E0",
  },

  // Bar chart
  chartArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    height: 180,
    paddingTop: 30,
    position: "relative",
    marginBottom: 12,
  },
  refLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    borderWidth: 1,
    borderColor: "#B8B8CC",
    borderStyle: "dashed",
  },
  refLineLabel: {
    position: "absolute",
    top: -16,
    right: 0,
    fontFamily: "Jost_400Regular",
    fontSize: 10,
    color: "#7A7A8D",
  },
  barWrap: { flex: 1, alignItems: "center", gap: 5 },
  barValue: { fontFamily: "Jost_500Medium", fontSize: 10, color: "#333" },
  bar: { width: "80%", borderRadius: 6 },
  barNormal: { backgroundColor: "#167C16" },
  barDeviation: { backgroundColor: "#B42318" },
  barLabel: {
    fontFamily: "Jost_400Regular",
    fontSize: 10,
    color: "#7A7A8D",
    marginTop: 3,
  },

  // Legend
  legendRow: { flexDirection: "row", gap: 18, marginBottom: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontFamily: "Jost_400Regular", fontSize: 12, color: "#555" },

  // History table
  historyTable: {
    borderRadius: 16,
    backgroundColor: "#ECEDF5",
    overflow: "hidden",
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#D8D9E5",
    gap: 10,
  },
  historyRowLast: { borderBottomWidth: 0 },
  historyLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  historyIdx: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 13,
    color: "#626781",
    width: 28,
  },
  historyBy: { fontFamily: "Jost_500Medium", fontSize: 13, color: "#111111" },
  historyDate: { fontFamily: "Jost_400Regular", fontSize: 11, color: "#7A7A8D", marginTop: 1 },
  historyRight: { alignItems: "flex-end", gap: 5 },
  historyVal: { fontFamily: "Jost_600SemiBold", fontSize: 14, color: "#111111" },

  // Action buttons
  actionsRow: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 18,
    paddingVertical: 16,
  },
  rejectBtn: { backgroundColor: "#FDE8E7" },
  rejectBtnText: { fontFamily: "Jost_600SemiBold", fontSize: 16, color: "#B42318" },
  approveBtn: { backgroundColor: "#167C16" },
  approveBtnText: { fontFamily: "Jost_600SemiBold", fontSize: 16, color: "#FFFFFF" },
});
