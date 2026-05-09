import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import {
  createSchedulePlannerTask,
  fetchSchedulePlannerContext,
  fetchSchedulePlannerTasks,
  updateScheduleExecutionAssignment,
} from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import type {
  LineElement,
  LineEquipment,
  LinePart,
  SchedulePlannerContext,
  SchedulePlannerEmployeeOption,
  SchedulePlannerExecutionSummary,
  SchedulePlannerTask,
} from "../types/api";
import type { RootStackParamList } from "../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Frequency = "DAILY" | "WEEKLY" | "MONTHLY";

const todayIso = () => new Date().toISOString().slice(0, 10);

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string) {
  if (!value) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function defaultOccurrencesFor(frequency: Frequency) {
  if (frequency === "DAILY") return 30;
  return 12;
}

function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
      {icon ? <Ionicons name={icon} size={14} color={selected ? "#FFFFFF" : colors.primary} /> : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function SelectRow({
  title,
  subtitle,
  selected,
  onPress,
  icon,
}: {
  title: string;
  subtitle?: string | null;
  selected?: boolean;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable style={[styles.selectRow, selected && styles.selectRowSelected]} onPress={onPress}>
      <View style={[styles.selectIcon, selected && styles.selectIconSelected]}>
        <Ionicons name={icon} size={18} color={selected ? "#FFFFFF" : colors.primary} />
      </View>
      <View style={styles.selectTextWrap}>
        <Text style={styles.selectTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.selectSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <Ionicons
        name={selected ? "checkmark-circle" : "chevron-forward-outline"}
        size={21}
        color={selected ? colors.primary : "#8B90A4"}
      />
    </Pressable>
  );
}

function EmployeeCard({
  employee,
  selected,
  onPress,
}: {
  employee: SchedulePlannerEmployeeOption;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.employeeCard, selected && styles.employeeSelected]} onPress={onPress}>
      <View style={styles.employeeTop}>
        <View style={[styles.avatar, selected && styles.avatarSelected]}>
          <Ionicons name={employee.roleId === 3 ? "shield-checkmark-outline" : "person-outline"} size={18} color={selected ? "#FFFFFF" : colors.primary} />
        </View>
        <View style={styles.employeeNameWrap}>
          <Text style={styles.employeeName} numberOfLines={1}>{employee.fullName}</Text>
          <Text style={styles.employeeMeta} numberOfLines={1}>
            {employee.roleName || "Employee"}{employee.expertise ? ` • ${employee.expertise}` : ""}
          </Text>
        </View>
        {selected ? (
          <View style={styles.selectedBadge}>
            <Ionicons name="checkmark-outline" size={13} color="#FFFFFF" />
          </View>
        ) : employee.primaryMatch ? (
          <View style={styles.matchDot} />
        ) : null}
      </View>
      <View style={styles.employeeScores}>
        <Text style={styles.scoreText}>Avail {Math.round((employee.availabilityScore ?? 0) * 100)}%</Text>
        <Text style={styles.scoreText}>Perf {(employee.performanceScore ?? 0).toFixed(1)}</Text>
      </View>
    </Pressable>
  );
}

export function SchedulePlannerCreateScreen() {
  const navigation = useNavigation<Nav>();
  const { authState, refreshDashboard } = useAuth();
  const token = authState.session?.token;
  const isLineManager = authState.session?.dashboardKind === "lineManager";

  const [context, setContext] = useState<SchedulePlannerContext | null>(null);
  const [tasks, setTasks] = useState<SchedulePlannerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linePickerOpen, setLinePickerOpen] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<"start" | "end" | null>(null);
  const [selectedPlannedTask, setSelectedPlannedTask] = useState<SchedulePlannerTask | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<SchedulePlannerExecutionSummary | null>(null);
  const [reassigningExecutionId, setReassigningExecutionId] = useState<number | null>(null);

  const [lineId, setLineId] = useState<number | null>(null);
  const [equipmentId, setEquipmentId] = useState<number | null>(null);
  const [elementId, setElementId] = useState<number | null>(null);
  const [partId, setPartId] = useState<number | null>(null);
  const [assigneeId, setAssigneeId] = useState<number | null>(null);
  const [supervisorId, setSupervisorId] = useState<number | null>(null);
  const [workflowId, setWorkflowId] = useState<number | null>(null);
  const [sparePartId, setSparePartId] = useState<number | null>(null);

  const [taskRefNo, setTaskRefNo] = useState("");
  const [method, setMethod] = useState("");
  const [strategy] = useState("PREVENTIVE");
  const [criticality, setCriticality] = useState("MEDIUM");
  const [mode] = useState("MANUAL");
  const [frequency, setFrequency] = useState<Frequency>("WEEKLY");
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState("");
  const [occurrences] = useState("");
  const [estimatedMins, setEstimatedMins] = useState("");
  const [standardValue, setStandardValue] = useState("");
  const [toleranceMin, setToleranceMin] = useState("");
  const [toleranceMax, setToleranceMax] = useState("");
  const [uom, setUom] = useState("");
  const [tools, setTools] = useState("");

  async function load(targetLineId?: number | null) {
    if (!token) return;
    setLoading(true);
    try {
      const effectiveTargetId = targetLineId ?? lineId;
      const initialCtx = await fetchSchedulePlannerContext(token, effectiveTargetId || undefined);
      const firstLineId = effectiveTargetId ?? initialCtx.lines[0]?.lineId ?? null;
      let finalCtx = initialCtx;

      if (!effectiveTargetId && firstLineId) {
        try {
          const lineCtx = await fetchSchedulePlannerContext(token, firstLineId);
          finalCtx = { ...lineCtx, lines: initialCtx.lines };
        } catch (lineError) {
          console.warn("Failed to load selected line schedule planner context:", lineError);
        }
      }

      setContext(finalCtx);
      setLineId(firstLineId);
      setWorkflowId((current) => current ?? finalCtx.approvalWorkflows[0]?.workflowId ?? null);

      try {
        const taskRows = await fetchSchedulePlannerTasks(token);
        setTasks(taskRows);
      } catch (taskError) {
        console.warn("Failed to load schedule planner tasks:", taskError);
        setTasks([]);
      }
    } catch (e) {
      console.warn("Failed to load schedule planner context:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  async function handleLineChange(nextLineId: number) {
    const normalizedLineId = Number(nextLineId);
    setLineId(normalizedLineId);
    setLinePickerOpen(false);
    setEquipmentId(null);
    setElementId(null);
    setPartId(null);
    setSparePartId(null);
    setAssigneeId(null);
    setSupervisorId(null);
    await load(normalizedLineId);
  }

  const selectedEquipment = useMemo(
    () => context?.equipments.find((item) => item.equipmentId === equipmentId) ?? null,
    [context?.equipments, equipmentId],
  );
  const selectedElement = useMemo(
    () => selectedEquipment?.elements?.find((item) => item.elementId === elementId) ?? null,
    [selectedEquipment, elementId],
  );
  const selectedPart = useMemo(
    () => selectedElement?.parts?.find((item) => item.partId === partId) ?? null,
    [selectedElement, partId],
  );
  const selectedLine = useMemo(
    () => context?.lines.find((item) => item.lineId === lineId) ?? null,
    [context?.lines, lineId],
  );
  const canChooseAsset = Boolean(selectedLine);
  const selectedAssignee = useMemo(
    () => context?.assignableEmployees.find((item) => item.employeeId === assigneeId) ?? null,
    [context?.assignableEmployees, assigneeId],
  );
  const selectedSupervisor = useMemo(
    () => context?.supervisors.find((item) => item.employeeId === supervisorId) ?? null,
    [context?.supervisors, supervisorId],
  );

  function selectEquipment(equipment: LineEquipment) {
    setEquipmentId(equipment.equipmentId);
    setElementId(null);
    setPartId(null);
    setSparePartId(null);
  }

  function selectElement(element: LineElement) {
    setElementId(element.elementId);
    setPartId(null);
    setSparePartId(null);
  }

  function selectPart(part: LinePart) {
    setPartId(part.partId);
    setSparePartId(part.sparePartId ?? null);
  }

  function handleDateChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS !== "ios") {
      setDatePickerTarget(null);
    }
    if (event.type === "dismissed" || !date || !datePickerTarget) return;
    const next = toIsoDate(date);
    if (datePickerTarget === "start") {
      setStartDate(next);
    } else {
      setEndDate(next);
    }
  }

  async function submit() {
    if (!token || saving) return;
    if (!elementId || !method.trim() || !startDate.trim()) {
      Alert.alert("Missing details", "Select machine element, task name and first due date.");
      return;
    }

    setSaving(true);
    try {
      const created = await createSchedulePlannerTask(token, {
        taskRefNo: taskRefNo.trim() || undefined,
        elementId,
        partId,
        sparePartId,
        taskCriticality: criticality,
        maintenanceStrategy: strategy,
        method: method.trim(),
        tools: tools.split(",").map((item) => item.trim()).filter(Boolean),
        assigneeEmployeeId: null,
        supervisorId: null,
        estimatedReqTime: numberOrNull(estimatedMins),
        mode,
        frequency,
        startDate: startDate.trim(),
        endDate: null,
        occurrences: numberOrNull(occurrences) ?? defaultOccurrencesFor(frequency),
        standardValue: numberOrNull(standardValue),
        toleranceMin: numberOrNull(toleranceMin),
        toleranceMax: numberOrNull(toleranceMax),
        uom: uom.trim() || undefined,
        approvalWorkflowId: workflowId,
      });
      setTasks((current) => [created, ...current]);
      setMethod("");
      setTaskRefNo("");
      await refreshDashboard();
      Alert.alert(
        "Schedule created",
        `${created.executionCount} task dates were generated.`,
        [
          {
            text: "OK",
            onPress: () => {
              navigation.navigate("SchedulePlanner");
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert("Could not create schedule", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function reassignExecution(employeeId: number) {
    if (!token || !selectedExecution || reassigningExecutionId) return;
    setReassigningExecutionId(selectedExecution.scheduleExecutionId);
    try {
      const updated = await updateScheduleExecutionAssignment(token, selectedExecution.scheduleExecutionId, employeeId);
      setTasks((current) => current.map((task) => task.taskScheduleId === updated.taskScheduleId ? updated : task));
      setSelectedPlannedTask(updated);
      const nextExecution = updated.executions?.find((execution) => execution.scheduleExecutionId === selectedExecution.scheduleExecutionId) ?? null;
      setSelectedExecution(nextExecution);
    } catch (error) {
      Alert.alert("Could not reassign schedule", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setReassigningExecutionId(null);
    }
  }

  if (loading && !context) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={28} color={colors.text} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Create PM task</Text>
          <Text style={styles.headerSubtitle}>Define the PM task and first due date</Text>
        </View>
        <Pressable style={styles.refreshButton} onPress={() => load()} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color={colors.text} /> : <Ionicons name="refresh-outline" size={19} color={colors.text} />}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => setDatePickerTarget(null)}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Line</Text>
            {selectedLine ? <Text style={styles.selectedText}>Selected: {selectedLine.lineName}</Text> : null}
          </View>
          <Pressable style={styles.selectorButton} onPress={() => !isLineManager && setLinePickerOpen(true)}>
            <View style={[styles.selectIcon, selectedLine && styles.selectIconSelected]}>
              <Ionicons name="git-branch-outline" size={18} color={selectedLine ? "#FFFFFF" : colors.primary} />
            </View>
            <View style={styles.selectTextWrap}>
              <Text style={styles.selectTitle}>{selectedLine?.lineName ?? "Select line"}</Text>
              <Text style={styles.selectSubtitle} numberOfLines={1}>
                {selectedLine ? [selectedLine.lineCode, selectedLine.block, selectedLine.zone].filter(Boolean).join(" • ") : "Tap to choose a line"}
              </Text>
            </View>
            {!isLineManager && <Ionicons name="chevron-down-outline" size={22} color={colors.primary} />}
          </Pressable>
          {isLineManager ? <Text style={{ fontFamily: "Jost_400Regular", fontSize: 12, color: colors.textMuted, marginTop: 4 }}>You can only schedule tasks for your assigned line.</Text> : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Asset</Text>
            {selectedEquipment ? <Text style={styles.selectedText}>Machine: {selectedEquipment.equipmentName}</Text> : null}
          </View>
          {canChooseAsset ? (
            <View style={styles.selectList}>
              {(context?.equipments ?? []).map((equipment) => (
                <SelectRow
                  key={equipment.equipmentId}
                  title={equipment.equipmentName}
                  subtitle={`Equipment ID #${equipment.equipmentId}`}
                  icon="hardware-chip-outline"
                  selected={equipment.equipmentId === equipmentId}
                  onPress={() => selectEquipment(equipment)}
                />
              ))}
              {!(context?.equipments ?? []).length ? <Text style={styles.emptyInlineText}>No assets found for the selected line.</Text> : null}
            </View>
          ) : (
            <Text style={styles.emptyInlineText}>Select a line first.</Text>
          )}
          {selectedEquipment ? (
            <View style={styles.nestedBlock}>
              <View style={styles.fieldHeaderRow}>
                <Text style={styles.fieldLabel}>Element</Text>
                {selectedElement ? <Text style={styles.fieldSelectedText}>{selectedElement.elementName}</Text> : null}
              </View>
              <View style={styles.selectList}>
                {(selectedEquipment.elements ?? []).map((element) => (
                  <SelectRow
                    key={element.elementId}
                    title={element.elementName}
                    icon="layers-outline"
                    selected={element.elementId === elementId}
                    onPress={() => selectElement(element)}
                  />
                ))}
              </View>
            </View>
          ) : null}
          {selectedElement ? (
            <View style={styles.nestedBlock}>
              <View style={styles.fieldHeaderRow}>
                <Text style={styles.fieldLabel}>Part</Text>
                {selectedPart ? <Text style={styles.fieldSelectedText}>{selectedPart.partName}</Text> : null}
              </View>
              <View style={styles.selectList}>
                {(selectedElement.parts ?? []).length ? (selectedElement.parts ?? []).map((part) => (
                  <SelectRow
                    key={part.partId}
                    title={part.partName}
                    subtitle={part.sparePartName ? `Spare: ${part.sparePartName}` : "No spare mapped"}
                    icon="cube-outline"
                    selected={part.partId === partId}
                    onPress={() => selectPart(part)}
                  />
                )) : (
                  <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                    <Text style={styles.infoText}>No parts are mapped to this element. You can still create this as an element-level PM task.</Text>
                  </View>
                )}
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Task details</Text>
          <View style={styles.inputRow}>
            <TextInput style={styles.input} placeholder="Task ref no" value={taskRefNo} onChangeText={setTaskRefNo} />
            <TextInput style={styles.input} placeholder="Estimated mins" value={estimatedMins} onChangeText={setEstimatedMins} keyboardType="numeric" />
          </View>
          <TextInput style={styles.inputWide} placeholder="Task name / method" value={method} onChangeText={setMethod} />
          <TextInput style={styles.inputWide} placeholder="Tools, comma separated" value={tools} onChangeText={setTools} />
          <View style={styles.chipWrap}>
            {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((item) => (
              <Chip key={item} label={item} selected={criticality === item} onPress={() => setCriticality(item)} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <View style={styles.segment}>
            {(["DAILY", "WEEKLY", "MONTHLY"] as Frequency[]).map((item) => (
              <Pressable key={item} style={[styles.segmentItem, frequency === item && styles.segmentItemActive]} onPress={() => setFrequency(item)}>
                <Text style={[styles.segmentText, frequency === item && styles.segmentTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.inputRow}>
            <Pressable style={styles.dateButton} onPress={() => setDatePickerTarget("start")}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <View>
                <Text style={styles.dateLabel}>First due date</Text>
                <Text style={styles.dateValue}>{startDate}</Text>
              </View>
            </Pressable>
          </View>
          {datePickerTarget && (
            <View style={styles.datePickerWrap}>
              <DateTimePicker
                value={parseIsoDate(startDate)}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "calendar"}
                minimumDate={new Date(2020, 0, 1)}
                maximumDate={new Date(2050, 0, 1)}
                onChange={handleDateChange}
              />
              {Platform.OS === "ios" && (
                <Pressable style={styles.doneButton} onPress={() => setDatePickerTarget(null)}>
                  <Text style={styles.doneButtonText}>Done</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Approval and standards</Text>
          <View style={styles.chipWrap}>
            {(context?.approvalWorkflows ?? []).map((workflow) => (
              <Chip
                key={workflow.workflowId}
                label={workflow.workflowName}
                icon="checkmark-done-outline"
                selected={workflow.workflowId === workflowId}
                onPress={() => setWorkflowId(workflow.workflowId)}
              />
            ))}
          </View>
          <View style={styles.inputRow}>
            <TextInput style={styles.input} placeholder="Standard value" value={standardValue} onChangeText={setStandardValue} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="UOM" value={uom} onChangeText={setUom} />
          </View>
          <View style={styles.inputRow}>
            <TextInput style={styles.input} placeholder="Tolerance min" value={toleranceMin} onChangeText={setToleranceMin} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Tolerance max" value={toleranceMax} onChangeText={setToleranceMax} keyboardType="numeric" />
          </View>
          {selectedPart ? (
            <>
              <Text style={styles.fieldLabel}>Spare part mapping</Text>
              <View style={styles.chipWrap}>
                {(context?.spareParts ?? []).slice(0, 12).map((spare) => (
                  <Chip
                    key={spare.sparePartId}
                    label={spare.name}
                    icon="cube-outline"
                    selected={spare.sparePartId === sparePartId}
                    onPress={() => setSparePartId(spare.sparePartId)}
                  />
                ))}
              </View>
            </>
          ) : null}
        </View>

        <Pressable style={[styles.submitButton, saving && styles.submitButtonDisabled]} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />}
          <Text style={styles.submitText}>Create schedule</Text>
        </Pressable>

      </ScrollView>

      <Modal visible={linePickerOpen} animationType="slide" transparent onRequestClose={() => setLinePickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select line</Text>
              <Pressable style={styles.modalClose} onPress={() => setLinePickerOpen(false)}>
                <Ionicons name="close-outline" size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalList}>
              {(context?.lines ?? []).map((line) => (
                <SelectRow
                  key={line.lineId}
                  title={line.lineName}
                  subtitle={[line.lineCode, line.block, line.zone].filter(Boolean).join(" • ")}
                  icon="git-branch-outline"
                  selected={Number(line.lineId) === Number(lineId)}
                  onPress={() => handleLineChange(Number(line.lineId))}
                />
              ))}
              {!(context?.lines ?? []).length ? <Text style={styles.emptyInlineText}>No lines available for this account.</Text> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontFamily: "Jost_600SemiBold", fontSize: 22, color: colors.text },
  headerSubtitle: { fontFamily: "Jost_400Regular", fontSize: 12, color: "#626781", marginTop: 2 },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#F5E4C9",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 16, paddingBottom: 52 },
  section: { backgroundColor: "#F3F4F6", borderRadius: 18, padding: 16, marginBottom: 16 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 },
  sectionTitle: { fontFamily: "Jost_600SemiBold", fontSize: 18, color: colors.text },
  selectedText: { flex: 1, textAlign: "right", fontFamily: "Jost_500Medium", fontSize: 12, color: colors.primary },
  fieldLabel: { fontFamily: "Jost_500Medium", fontSize: 13, color: "#2F3448", marginTop: 10, marginBottom: 8 },
  fieldHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  fieldSelectedText: { flex: 1, textAlign: "right", fontFamily: "Jost_500Medium", fontSize: 12, color: colors.primary, marginTop: 10, marginBottom: 8 },
  nestedBlock: { borderTopWidth: 1, borderTopColor: "#E0E2EA", marginTop: 12, paddingTop: 2 },
  selectList: { gap: 10 },
  selectorButton: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DADDE8",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectRowSelected: { borderColor: colors.primary, backgroundColor: "#F7F6FC" },
  selectIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  selectIconSelected: { backgroundColor: colors.primary },
  selectTextWrap: { flex: 1, minWidth: 0 },
  selectTitle: { fontFamily: "Jost_600SemiBold", fontSize: 14, color: colors.text },
  selectSubtitle: { fontFamily: "Jost_400Regular", fontSize: 11, color: "#626781", marginTop: 2 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 34,
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#D0D6E8",
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: "Jost_500Medium", fontSize: 12, color: colors.primary, maxWidth: 210 },
  chipTextSelected: { color: "#FFFFFF" },
  inputRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DADDE8",
    paddingHorizontal: 12,
    fontFamily: "Jost_400Regular",
    color: colors.text,
  },
  inputWide: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DADDE8",
    paddingHorizontal: 12,
    marginBottom: 10,
    fontFamily: "Jost_400Regular",
    color: colors.text,
  },
  dateButton: { flex: 1, minHeight: 56, backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#EBEBF5", paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 9 },
  dateLabel: { fontFamily: "Jost_500Medium", fontSize: 12, color: colors.textMuted },
  dateValue: { fontFamily: "Jost_500Medium", fontSize: 13, color: colors.text, marginTop: 1 },
  clearDateButton: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  clearDateText: { fontFamily: "Jost_400Regular", fontSize: 12, color: "#626781" },
  datePickerWrap: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#EBEBF5", overflow: "hidden", padding: 8, marginBottom: 10 },
  doneButton: { alignSelf: "flex-end", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.primary, marginTop: 8 },
  doneButtonText: { fontFamily: "Jost_500Medium", fontSize: 13, color: "#FFFFFF" },
  segment: { flexDirection: "row", backgroundColor: "#E8E8F5", borderRadius: 14, padding: 4, marginBottom: 12 },
  segmentItem: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 36, borderRadius: 11 },
  segmentItemActive: { backgroundColor: colors.primary },
  segmentText: { fontFamily: "Jost_600SemiBold", fontSize: 12, color: colors.primary },
  segmentTextActive: { color: "#FFFFFF" },
  employeeGrid: { gap: 10, marginBottom: 4 },
  employeeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#DADDE8",
  },
  employeeSelected: { borderColor: colors.primary, backgroundColor: "#F7F6FC" },
  employeeTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSelected: { backgroundColor: colors.primary },
  employeeNameWrap: { flex: 1 },
  employeeName: { fontFamily: "Jost_600SemiBold", fontSize: 14, color: colors.text },
  employeeMeta: { fontFamily: "Jost_400Regular", fontSize: 11, color: "#626781", marginTop: 1 },
  matchDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.success },
  selectedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  employeeScores: { flexDirection: "row", gap: 8, marginTop: 8, paddingLeft: 44 },
  scoreText: { fontFamily: "Jost_400Regular", fontSize: 11, color: "#626781" },
  emptyInlineText: { fontFamily: "Jost_400Regular", fontSize: 13, color: "#626781", paddingVertical: 8 },
  submitButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: { fontFamily: "Jost_600SemiBold", fontSize: 15, color: "#FFFFFF" },
  taskCard: { flexDirection: "row", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12, marginBottom: 10 },
  taskIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  taskBody: { flex: 1 },
  taskTitle: { fontFamily: "Jost_600SemiBold", fontSize: 15, color: colors.text },
  taskMeta: { fontFamily: "Jost_400Regular", fontSize: 12, color: "#626781", marginTop: 2 },
  emptyText: { fontFamily: "Jost_400Regular", fontSize: 13, color: "#626781", textAlign: "center", paddingVertical: 18 },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DADDE8",
    padding: 12,
  },
  infoText: { flex: 1, fontFamily: "Jost_400Regular", fontSize: 12, color: "#626781" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17,17,17,0.35)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "78%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  modalTitleWrap: { flex: 1, minWidth: 0, marginRight: 12 },
  modalTitle: { fontFamily: "Jost_600SemiBold", fontSize: 20, color: colors.text },
  modalSubtitle: { fontFamily: "Jost_400Regular", fontSize: 12, color: "#626781", marginTop: 2 },
  modalClose: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  modalList: { gap: 10, paddingBottom: 10 },
  executionRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DADDE8",
    padding: 12,
  },
  executionRowSelected: { borderColor: colors.primary, backgroundColor: "#F7F6FC" },
  executionDateBox: { width: 96 },
  executionDateText: { fontFamily: "Jost_600SemiBold", fontSize: 13, color: colors.text },
  executionStatusText: { fontFamily: "Jost_400Regular", fontSize: 10, color: "#626781", marginTop: 2 },
  executionAssigneeWrap: { flex: 1, minWidth: 0 },
  executionAssigneeLabel: { fontFamily: "Jost_400Regular", fontSize: 11, color: "#626781" },
  executionAssigneeName: { fontFamily: "Jost_600SemiBold", fontSize: 14, color: colors.text, marginTop: 2 },
});
