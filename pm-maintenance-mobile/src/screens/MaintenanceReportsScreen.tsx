import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import {
  fetchMaintenanceReportOptions,
  generateMaintenanceReport,
  generateMaintenanceReportPdfBase64,
  generateMaintenanceReportPdf,
} from "../api/client";
import { AppMessageModal } from "../components/AppMessageModal";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import type {
  ReportLineOption,
  ReportOptionsResponse,
  ReportPeriod,
  ReportRequest,
  ReportResponse,
  ReportScope,
  ReportType,
} from "../types/api";
import type { RootStackParamList } from "../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const REPORT_ICONS: Record<ReportType, keyof typeof Ionicons.glyphMap> = {
  OVERALL_MAINTENANCE_PERFORMANCE: "speedometer-outline",
  LINE_WISE_PERFORMANCE: "git-branch-outline",
  TASK_STATUS: "checkmark-done-circle-outline",
  EMPLOYEE_EFFICIENCY: "people-outline",
  PM_COMPLIANCE_TREND: "trending-up-outline",
  ISSUE_FLAGS_REPLACEMENT: "flag-outline",
};

const PERIODS: { label: string; value: ReportPeriod; hint: string }[] = [
  { label: "30 Days", value: "LAST_30_DAYS", hint: "rolling monthly" },
  { label: "365 Days", value: "LAST_365_DAYS", hint: "rolling yearly" },
  { label: "Q1", value: "QUARTERLY", hint: "Jan 1 - Mar 31" },
  { label: "Q2", value: "QUARTERLY", hint: "Apr 1 - Jun 30" },
  { label: "Q3", value: "QUARTERLY", hint: "Jul 1 - Sep 30" },
  { label: "Q4", value: "QUARTERLY", hint: "Oct 1 - Dec 31" },
  { label: "H1", value: "HALF_YEARLY", hint: "Jan 1 - Jun 30" },
  { label: "H2", value: "HALF_YEARLY", hint: "Jul 1 - Dec 31" },
  { label: "Custom", value: "CUSTOM", hint: "exact dates" },
];

function formatValue(value: unknown, unit?: string | null) {
  if (value === null || value === undefined || value === "") return "N/A";
  const suffix = unit ? ` ${unit}` : "";
  if (typeof value === "number") {
    return `${Number.isInteger(value) ? value : value.toFixed(1)}${suffix}`;
  }
  return `${String(value)}${suffix}`;
}

function humanizeKey(key: string) {
  const known: Record<string, string> = {
    approved: "Approved",
    inProgress: "In Progress",
    underReview: "Under Review",
    rejected: "Rejected",
    overdue: "Overdue",
    activeFlags: "Active Flags",
    replacementRequired: "Replacement Required",
    completedReplacements: "Completed Replacements",
    flagsRaised: "Flags Raised",
    pmCompliance: "PM Compliance",
    employeeEfficiency: "Employee Efficiency",
    evidenceCompliance: "Evidence Compliance",
    approvalTurnaroundHours: "Approval Turnaround",
    rejectionRate: "Rejection Rate",
    lineName: "Line",
    machineName: "Machine",
    equipmentName: "Equipment",
    partName: "Part",
    taskName: "Task",
    taskRefNo: "Task Ref No",
    dueDate: "Due Date",
    raisedDate: "Raised Date",
    hasActiveFlag: "Has Active Flag",
  };
  return known[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function toDisplayValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return formatValue(value);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string) {
  if (!value) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

function toneColor(tone?: string | null) {
  if (tone === "danger") return colors.danger;
  if (tone === "warning") return colors.warning;
  if (tone === "success") return colors.success;
  return colors.primary;
}

function numericFromRow(row: Record<string, unknown>) {
  const value = Object.values(row).find((item) => typeof item === "number");
  return typeof value === "number" ? value : 0;
}

function labelFromRow(row: Record<string, unknown>) {
  const value = Object.entries(row).find(([, item]) => typeof item === "string");
  return value ? humanizeKey(String(value[1])) : "Item";
}

export function MaintenanceReportsScreen() {
  const navigation = useNavigation<Nav>();
  const { authState } = useAuth();
  const { width } = useWindowDimensions();

  const [options, setOptions] = useState<ReportOptionsResponse | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportType>("OVERALL_MAINTENANCE_PERFORMANCE");
  const [scope, setScope] = useState<ReportScope>("PLANT");
  const [lineId, setLineId] = useState<number | null>(null);
  const [period, setPeriod] = useState<ReportPeriod>("LAST_30_DAYS");
  const [quarter, setQuarter] = useState<number | null>(null);
  const [half, setHalf] = useState<number | null>(null);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [datePickerTarget, setDatePickerTarget] = useState<"start" | "end" | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [message, setMessage] = useState<{ visible: boolean; type: "success" | "failure"; title: string; message: string }>({
    visible: false,
    type: "success",
    title: "",
    message: "",
  });

  const reportOptions = options?.reportTypes ?? [];
  const lines = options?.lines ?? [];
  const selectedLine = lines.find((line) => line.lineId === lineId);
  const isWide = width >= 768;

  useEffect(() => {
    async function load() {
      if (!authState.session?.token) return;
      setLoading(true);
      try {
        const response = await fetchMaintenanceReportOptions(authState.session.token);
        setOptions(response);
        if (response.lines.length > 0) setLineId(response.lines[0].lineId);
      } catch (error) {
        setMessage({
          visible: true,
          type: "failure",
          title: "Reports unavailable",
          message: error instanceof Error ? error.message : "Unable to load report options.",
        });
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [authState.session?.token]);

  const requestPayload = useMemo<ReportRequest>(() => ({
    reportType: selectedReport,
    scope,
    lineId: scope === "LINE" ? lineId : null,
    period,
    quarter,
    half,
    customStartDate: period === "CUSTOM" ? customStart : null,
    customEndDate: period === "CUSTOM" ? customEnd : null,
    format: "PDF",
  }), [customEnd, customStart, half, lineId, period, quarter, scope, selectedReport]);

  function choosePeriod(item: (typeof PERIODS)[number]) {
    setPeriod(item.value);
    setQuarter(item.label.startsWith("Q") ? Number(item.label.slice(1)) : null);
    setHalf(item.label.startsWith("H") ? Number(item.label.slice(1)) : null);
  }

  function handleDateChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS !== "ios") {
      setDatePickerTarget(null);
    }
    if (event.type === "dismissed" || !date || !datePickerTarget) return;
    const value = toIsoDate(date);
    if (datePickerTarget === "start") {
      setCustomStart(value);
    } else {
      setCustomEnd(value);
    }
  }

  function renderConfigPanel() {
    return (
      <View style={s.inlineConfig}>
        <Text style={s.configTitle}>Configure report</Text>
        <View style={s.segment}>
          {(["PLANT", "LINE"] as ReportScope[]).map((item) => (
            <Pressable key={item} style={[s.segmentBtn, scope === item && s.segmentActive]} onPress={() => setScope(item)}>
              <Text style={[s.segmentText, scope === item && s.segmentTextActive]}>{item === "PLANT" ? "Entire Plant" : "Line-wise"}</Text>
            </Pressable>
          ))}
        </View>

        {scope === "LINE" && (
          <View style={s.lineWrap}>
            {lines.map((line: ReportLineOption) => (
              <Pressable
                key={line.lineId}
                style={[s.lineChip, lineId === line.lineId && s.lineChipActive]}
                onPress={() => setLineId(line.lineId)}
              >
                <Text style={[s.lineChipText, lineId === line.lineId && s.lineChipTextActive]}>{line.lineName}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={s.periodGrid}>
          {PERIODS.map((item) => {
            const active =
              item.value === period &&
              (item.value !== "QUARTERLY" || quarter === Number(item.label.slice(1))) &&
              (item.value !== "HALF_YEARLY" || half === Number(item.label.slice(1)));
            return (
              <Pressable key={`${item.label}-${item.value}`} style={[s.periodCard, active && s.periodCardActive]} onPress={() => choosePeriod(item)}>
                <Text style={[s.periodLabel, active && s.periodLabelActive]}>{item.label}</Text>
                <Text style={s.periodHint}>{item.hint}</Text>
              </Pressable>
            );
          })}
        </View>

        {period === "CUSTOM" && (
          <View style={s.customRange}>
            <View style={s.customRow}>
              <Pressable style={s.dateButton} onPress={() => setDatePickerTarget("start")}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <View>
                  <Text style={s.inputLabel}>Start date</Text>
                  <Text style={s.dateText}>{customStart || "Choose date"}</Text>
                </View>
              </Pressable>
              <Pressable style={s.dateButton} onPress={() => setDatePickerTarget("end")}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <View>
                  <Text style={s.inputLabel}>End date</Text>
                  <Text style={s.dateText}>{customEnd || "Choose date"}</Text>
                </View>
              </Pressable>
            </View>
            {datePickerTarget && (
              <View style={s.datePickerWrap}>
                <DateTimePicker
                  value={parseIsoDate(datePickerTarget === "start" ? customStart : customEnd)}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "calendar"}
                  maximumDate={new Date()}
                  onChange={handleDateChange}
                />
                {Platform.OS === "ios" && (
                  <Pressable style={s.doneButton} onPress={() => setDatePickerTarget(null)}>
                    <Text style={s.doneButtonText}>Done</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}

        <View style={s.actionRow}>
          <Pressable style={[s.primaryButton, generating && s.buttonDisabled]} onPress={handleGenerate} disabled={generating}>
            {generating ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="document-text-outline" size={18} color="#fff" />}
            <Text style={s.primaryButtonText}>Generate Preview</Text>
          </Pressable>
          <Pressable style={[s.secondaryButton, pdfGenerating && s.buttonDisabled]} onPress={handlePdf} disabled={pdfGenerating}>
            {pdfGenerating ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="download-outline" size={18} color={colors.primary} />}
            <Text style={s.secondaryButtonText}>PDF</Text>
          </Pressable>
        </View>

        {scope === "LINE" && selectedLine && <Text style={s.muted}>Selected line: {selectedLine.lineName}</Text>}
      </View>
    );
  }

  async function handleGenerate() {
    if (!authState.session?.token) return;
    setGenerating(true);
    try {
      const response = await generateMaintenanceReport(authState.session.token, requestPayload);
      setReport(response);
    } catch (error) {
      setMessage({
        visible: true,
        type: "failure",
        title: "Report not available",
        message: error instanceof Error ? error.message : "Unable to generate this report.",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handlePdf() {
    if (!authState.session?.token) return;
    setPdfGenerating(true);
    try {
      if (Platform.OS === "web") {
        const blob = await generateMaintenanceReportPdf(authState.session.token, requestPayload);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${selectedReport.toLowerCase().replace(/_/g, "-")}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const pdf = await generateMaintenanceReportPdfBase64(authState.session.token, requestPayload);
        const fileUri = `${FileSystem.documentDirectory}${pdf.filename}`;
        await FileSystem.writeAsStringAsync(fileUri, pdf.base64, { encoding: FileSystem.EncodingType.Base64 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: pdf.contentType,
            dialogTitle: "Save or share report PDF",
            UTI: "com.adobe.pdf",
          });
        }
      }
      setMessage({
        visible: true,
        type: "success",
        title: "PDF generated",
        message: Platform.OS === "web"
          ? "The report PDF download has started."
          : "The PDF is ready. Use the share sheet to save or send it.",
      });
    } catch (error) {
      setMessage({
        visible: true,
        type: "failure",
        title: "PDF not generated",
        message: error instanceof Error ? error.message : "Unable to generate PDF report.",
      });
    } finally {
      setPdfGenerating(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.muted}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable hitSlop={12} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={28} color="#111" />
        </Pressable>
        <Text style={s.headerTitle}>Reports</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={[s.content, isWide && s.contentWide]} showsVerticalScrollIndicator={false}>
        <View style={s.panel}>
          <Text style={s.sectionTitle}>Choose report</Text>
          <View style={[s.reportGrid, isWide && s.reportGridWide]}>
            {reportOptions.map((option) => {
              const value = option.value as ReportType;
              const active = selectedReport === value;
              return (
                <View
                  key={option.value}
                  style={[s.reportCard, active && s.reportCardActive, active && s.reportCardExpanded]}
                >
                  <Pressable
                    onPress={() => {
                      setSelectedReport(value);
                      setReport(null);
                    }}
                    style={s.reportPressArea}
                  >
                    <View style={s.reportCardTop}>
                      <Ionicons name={REPORT_ICONS[value]} size={24} color={active ? colors.primary : colors.textMuted} />
                      <Ionicons name={active ? "chevron-down" : "chevron-forward"} size={18} color={colors.textMuted} />
                    </View>
                    <Text style={s.reportName}>{option.label}</Text>
                    <Text style={s.reportDescription}>{option.description}</Text>
                    <Text style={s.scopeText}>Plant and line scope</Text>
                  </Pressable>
                  {active && renderConfigPanel()}
                </View>
              );
            })}
          </View>
        </View>

        {report && (
          <View style={s.preview}>
            <View style={s.previewHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.previewTitle}>{report.title}</Text>
                <Text style={s.previewMeta}>{report.periodLabel} • {report.scopeLabel}</Text>
                <Text style={s.previewMeta}>Generated {new Date(report.generatedAt).toLocaleString()}</Text>
              </View>
              <Ionicons name="document-attach-outline" size={28} color={colors.primary} />
            </View>

            <View style={s.summaryGrid}>
              {report.summaryCards.map((card) => (
                <View key={card.label} style={s.summaryCard}>
                  <Text style={s.summaryLabel}>{card.label}</Text>
                  <Text style={[s.summaryValue, { color: toneColor(card.tone) }]}>{formatValue(card.value, card.unit)}</Text>
                  <Text style={s.summaryDescription}>{card.description}</Text>
                </View>
              ))}
            </View>

            {report.sections.map((section) => (
              <View key={section.title} style={s.sectionCard}>
                <Text style={s.sectionTitle}>{section.title}</Text>
                {!!section.description && <Text style={s.sectionDescription}>{section.description}</Text>}
                {section.data?.length ? (
                  <>
                    {section.visualization !== "table" && (
                      <View style={s.chartPreview}>
                        {section.data.slice(0, 6).map((row, index) => {
                          const value = numericFromRow(row);
                          const max = Math.max(...section.data.slice(0, 6).map(numericFromRow), 1);
                          return (
                            <View key={`${section.title}-${index}`} style={s.barRow}>
                              <Text style={s.barLabel} numberOfLines={1}>{labelFromRow(row)}</Text>
                              <View style={s.barTrack}>
                                <View style={[s.barFill, { width: `${Math.max(4, (value / max) * 100)}%` }]} />
                              </View>
                              <Text style={s.barValue}>{formatValue(value)}</Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                    <View style={s.table}>
                      {section.data.slice(0, 6).map((row, index) => (
                        <View key={`${section.title}-row-${index}`} style={s.tableRow}>
                          {Object.entries(row).slice(0, 4).map(([key, value]) => (
                            <View key={key} style={s.tableCell}>
                              <Text style={s.tableKey}>{humanizeKey(key)}</Text>
                              <Text style={s.tableValue}>{toDisplayValue(value)}</Text>
                            </View>
                          ))}
                        </View>
                      ))}
                    </View>
                  </>
                ) : (
                  <Text style={s.emptyText}>No data available for this section.</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <AppMessageModal
        visible={message.visible}
        type={message.type}
        title={message.title}
        message={message.message}
        onPrimaryAction={() => setMessage((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  headerTitle: { fontFamily: "Jost_500Medium", fontSize: 20, lineHeight: 26, color: colors.text },
  content: { padding: 18, paddingBottom: 42, gap: 18 },
  contentWide: { maxWidth: 980, alignSelf: "center", width: "100%" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  muted: { fontFamily: "Jost_400Regular", fontSize: 12, color: colors.textMuted },
  panel: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EBEBF5",
    padding: 16,
    gap: 14,
  },
  sectionTitle: { fontFamily: "Jost_500Medium", fontSize: 16, lineHeight: 22, color: colors.text },
  reportGrid: { gap: 12 },
  reportGridWide: { flexDirection: "row", flexWrap: "wrap" },
  reportCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EBEBF5",
    padding: 14,
    gap: 7,
    flexBasis: "31%",
    flexGrow: 1,
  },
  reportCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  reportCardExpanded: { flexBasis: "100%" },
  reportPressArea: { gap: 7 },
  reportCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reportName: { fontFamily: "Jost_500Medium", fontSize: 14, color: colors.text },
  reportDescription: { fontFamily: "Jost_400Regular", fontSize: 12, lineHeight: 17, color: colors.textMuted },
  scopeText: { fontFamily: "Jost_500Medium", fontSize: 11, color: colors.primary },
  inlineConfig: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#DADAF0", gap: 14 },
  configTitle: { fontFamily: "Jost_500Medium", fontSize: 14, color: colors.text },
  segment: { flexDirection: "row", padding: 4, backgroundColor: colors.primaryMuted, borderRadius: 16, gap: 8 },
  segmentBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12 },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontFamily: "Jost_500Medium", fontSize: 13, color: colors.primary },
  segmentTextActive: { color: "#FFFFFF" },
  lineWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  lineChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#EBEBF5" },
  lineChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  lineChipText: { fontFamily: "Jost_500Medium", fontSize: 12, color: colors.textMuted },
  lineChipTextActive: { color: "#FFFFFF" },
  periodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  periodCard: { width: "30.5%", minWidth: 96, padding: 10, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#EBEBF5" },
  periodCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodLabel: { fontFamily: "Jost_500Medium", fontSize: 13, color: colors.text },
  periodLabelActive: { color: "#FFFFFF" },
  periodHint: { fontFamily: "Jost_400Regular", fontSize: 10, color: colors.textMuted, marginTop: 2 },
  customRow: { flexDirection: "row", gap: 10 },
  customRange: { gap: 10 },
  inputLabel: { fontFamily: "Jost_500Medium", fontSize: 12, color: colors.textMuted },
  dateButton: { flex: 1, minHeight: 56, backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#EBEBF5", paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 9 },
  dateText: { fontFamily: "Jost_500Medium", fontSize: 13, color: colors.text, marginTop: 1 },
  datePickerWrap: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#EBEBF5", overflow: "hidden", padding: 8 },
  doneButton: { alignSelf: "flex-end", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.primary },
  doneButtonText: { fontFamily: "Jost_500Medium", fontSize: 13, color: "#FFFFFF" },
  actionRow: { flexDirection: "row", gap: 10 },
  primaryButton: { flex: 1, minHeight: 46, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  primaryButtonText: { fontFamily: "Jost_500Medium", fontSize: 14, color: "#FFFFFF" },
  secondaryButton: { minWidth: 104, minHeight: 46, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  secondaryButtonText: { fontFamily: "Jost_500Medium", fontSize: 14, color: colors.primary },
  buttonDisabled: { opacity: 0.65 },
  preview: { gap: 16 },
  previewHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: "#F7F6FC", borderRadius: 22, borderWidth: 1, borderColor: "#EBEBF5", padding: 16 },
  previewTitle: { fontFamily: "Jost_500Medium", fontSize: 18, lineHeight: 23, color: colors.text },
  previewMeta: { fontFamily: "Jost_400Regular", fontSize: 12, color: colors.textMuted, marginTop: 2 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryCard: { flexGrow: 1, flexBasis: "30%", minWidth: 145, backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#EBEBF5", padding: 13, gap: 4 },
  summaryLabel: { fontFamily: "Jost_500Medium", fontSize: 12, color: colors.textMuted },
  summaryValue: { fontFamily: "Jost_500Medium", fontSize: 24, lineHeight: 30 },
  summaryDescription: { fontFamily: "Jost_400Regular", fontSize: 11, lineHeight: 15, color: colors.textMuted },
  sectionCard: { backgroundColor: colors.surfaceAlt, borderRadius: 22, borderWidth: 1, borderColor: "#EBEBF5", padding: 16, gap: 10 },
  sectionDescription: { fontFamily: "Jost_400Regular", fontSize: 12, lineHeight: 17, color: colors.textMuted },
  chartPreview: { gap: 8, paddingVertical: 4 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { width: 90, fontFamily: "Jost_400Regular", fontSize: 11, color: colors.textMuted },
  barTrack: { flex: 1, height: 9, borderRadius: 5, backgroundColor: "#E0E0EF", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 5, backgroundColor: colors.primary },
  barValue: { width: 48, textAlign: "right", fontFamily: "Jost_500Medium", fontSize: 11, color: colors.primary },
  table: { gap: 8 },
  tableRow: { backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#EBEBF5", padding: 10, gap: 8 },
  tableCell: { gap: 2 },
  tableKey: { fontFamily: "Jost_500Medium", fontSize: 10, color: colors.textSoft, textTransform: "capitalize" },
  tableValue: { fontFamily: "Jost_400Regular", fontSize: 12, color: colors.text },
  emptyText: { fontFamily: "Jost_400Regular", fontSize: 12, color: colors.textMuted },
});
