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
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused, useNavigation } from "@react-navigation/native";
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

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function monthTitle(date: Date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function sameDate(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();
}

function buildMonthCells(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

export function SchedulePlannerScreen() {
  const navigation = useNavigation<Nav>();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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
  const [calendarMonth, setCalendarMonth] = useState(() => parseIsoDate(todayIso()));
  const [calendarGridWidth, setCalendarGridWidth] = useState(0);

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
  const [occurrences, setOccurrences] = useState("4");
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
      setLineId(isLineManager ? firstLineId : effectiveTargetId ?? null);
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

  const isFocused = useIsFocused();
  useEffect(() => {
    if (isFocused) {
      load();
    }
  }, [isFocused, token]);

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
  const visibleTasks = useMemo(
    () => {
      const activeTasks = tasks.filter((task) =>
        (task.executions ?? []).some((execution) => execution.status === "ASSIGNED" || execution.status === "IN_PROGRESS"),
      );
      return lineId ? activeTasks.filter((task) => Number(task.lineId) === Number(lineId)) : activeTasks;
    },
    [tasks, lineId],
  );
  const tasksByLine = useMemo(() => {
    const groups = new Map<number, { lineName: string; tasks: SchedulePlannerTask[] }>();
    visibleTasks.forEach((task) => {
      const key = Number(task.lineId);
      const existing = groups.get(key);
      if (existing) {
        existing.tasks.push(task);
      } else {
        groups.set(key, { lineName: task.lineName || "Line", tasks: [task] });
      }
    });
    return Array.from(groups.entries()).map(([lineKey, value]) => ({ lineKey, ...value }));
  }, [visibleTasks]);
  const selectedEditableExecutions = useMemo(
    () => (selectedPlannedTask?.executions ?? []).filter((execution) => execution.status === "ASSIGNED" || execution.status === "IN_PROGRESS"),
    [selectedPlannedTask?.executions],
  );
  const assignmentEmployees = useMemo(
    () => (context?.assignableEmployees ?? []).filter((employee) =>
      selectedExecution?.assigneeEmployeeId ? employee.employeeId !== selectedExecution.assigneeEmployeeId : true,
    ),
    [context?.assignableEmployees, selectedExecution?.assigneeEmployeeId],
  );
  const calendarCells = useMemo(() => buildMonthCells(calendarMonth), [calendarMonth]);
  const calendarGap = 6;
  const calendarFallbackWidth = Math.min(windowWidth - 60, 720);
  const calendarCellSize = Math.floor(((calendarGridWidth || calendarFallbackWidth) - calendarGap * 6) / 7);

  function handleCalendarGridLayout(event: LayoutChangeEvent) {
    const nextWidth = Math.floor(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== calendarGridWidth) {
      setCalendarGridWidth(nextWidth);
    }
  }

  async function openAssignmentTask(task: SchedulePlannerTask) {
    setSelectedPlannedTask(task);
    const firstEditable = (task.executions ?? []).find((execution) => execution.status === "ASSIGNED" || execution.status === "IN_PROGRESS");
    setSelectedExecution(firstEditable ?? null);
    if (firstEditable?.dueDate) {
      setCalendarMonth(parseIsoDate(firstEditable.dueDate.slice(0, 10)));
    } else if (task.firstDueDate) {
      setCalendarMonth(parseIsoDate(task.firstDueDate));
    }
    if (!token) return;
    try {
      const lineCtx = await fetchSchedulePlannerContext(token, task.lineId);
      setContext((current) => ({ ...lineCtx, lines: current?.lines ?? lineCtx.lines }));
    } catch (error) {
      console.warn("Failed to load assignment employees for task line:", error);
    }
  }

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
    if (!elementId || !assigneeId || !supervisorId || !method.trim() || !startDate.trim()) {
      Alert.alert("Missing details", "Select machine element, assignee, supervisor, task name and start date.");
      return;
    }
    if (!endDate.trim() && !occurrences.trim()) {
      Alert.alert("Schedule range needed", "Enter either an end date or number of occurrences.");
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
        assigneeEmployeeId: assigneeId,
        supervisorId,
        estimatedReqTime: numberOrNull(estimatedMins),
        mode,
        frequency,
        startDate: startDate.trim(),
        endDate: endDate.trim() || null,
        occurrences: numberOrNull(occurrences),
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
              if (authState.session?.dashboardKind === "maintenanceManager") {
                navigation.navigate("MaintenanceManagerDashboard");
              } else {
                navigation.navigate("Dashboard");
              }
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

  function confirmReassignExecution(employeeId: number, employeeName: string) {
    if (!selectedExecution) return;
    const isReassignment = Boolean(selectedExecution.assigneeEmployeeId);
    const title = isReassignment ? "Confirm Reassignment" : "Confirm Assignment";
    const message = `Are you sure you want to ${isReassignment ? "reassign" : "assign"} this schedule to ${employeeName}?`;

    Alert.alert(
      title,
      message,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "default",
          onPress: () => {
            reassignExecution(employeeId);
          },
        },
      ],
      { cancelable: true }
    );
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
          <Text style={styles.headerTitle}>Schedule assignment</Text>
          <Text style={styles.headerSubtitle}>Assign generated schedules by line and due date</Text>
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
            <Text style={styles.sectionTitle}>Task library</Text>
            <Text style={styles.selectedText}>{visibleTasks.length} active</Text>
          </View>
          <Pressable style={styles.submitButton} onPress={() => navigation.navigate("SchedulePlannerCreate")}>
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.submitText}>Create PM task</Text>
          </Pressable>
          <View style={styles.chipWrap}>
            {!isLineManager ? (
              <Chip label="All lines" selected={!lineId} onPress={() => setLineId(null)} icon="albums-outline" />
            ) : null}
            {(context?.lines ?? []).map((line) => (
              <Chip
                key={line.lineId}
                label={line.lineName}
                selected={Number(line.lineId) === Number(lineId)}
                onPress={() => !isLineManager && setLineId(Number(line.lineId))}
                icon="git-branch-outline"
              />
            ))}
          </View>
          {isLineManager ? <Text style={styles.emptyInlineText}>Line manager view is restricted to your assigned line.</Text> : null}
        </View>

        {tasksByLine.length ? tasksByLine.map((group) => (
          <View style={styles.section} key={group.lineKey}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{group.lineName}</Text>
              <Text style={styles.selectedText}>{group.tasks.length} tasks</Text>
            </View>
            {group.tasks.map((task) => (
              <Pressable key={`${task.taskScheduleId}-${task.stdTaskId}`} style={styles.taskCard} onPress={() => openAssignmentTask(task)}>
                <View style={styles.taskIcon}>
                  <Ionicons name="calendar-number-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.taskBody}>
                  <Text style={styles.taskTitle} numberOfLines={1}>{task.taskName || task.taskRefNo || "PM task"}</Text>
                  <Text style={styles.taskMeta} numberOfLines={2}>
                    {task.equipmentName} • {task.elementName}{task.partName ? ` • ${task.partName}` : ""}
                  </Text>
                  <Text style={styles.taskMeta}>
                    {task.executionCount} dates • {task.firstDueDate || "-"} to {task.lastDueDate || "-"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={20} color="#8B90A4" />
              </Pressable>
            ))}
          </View>
        )) : <Text style={styles.emptyText}>No active task schedules found.</Text>}
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

      <Modal visible={Boolean(selectedPlannedTask)} animationType="slide" onRequestClose={() => {
        setSelectedPlannedTask(null);
        setSelectedExecution(null);
      }}>
        <View style={[styles.assignmentScreen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.assignmentSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <Text style={styles.modalTitle} numberOfLines={1}>{selectedPlannedTask?.taskName || "Planned schedule"}</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {selectedPlannedTask?.lineName} • {selectedPlannedTask?.equipmentName}
                </Text>
              </View>
              <Pressable style={styles.modalClose} onPress={() => {
                setSelectedPlannedTask(null);
                setSelectedExecution(null);
              }}>
                <Ionicons name="close-outline" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.assignmentContent}>
              <View style={styles.calendarHeader}>
                <Pressable style={styles.calendarNavButton} onPress={() => setCalendarMonth((current) => addMonths(current, -1))}>
                  <Ionicons name="chevron-back-outline" size={20} color={colors.primary} />
                </Pressable>
                <Text style={styles.calendarTitle}>{monthTitle(calendarMonth)}</Text>
                <Pressable style={styles.calendarNavButton} onPress={() => setCalendarMonth((current) => addMonths(current, 1))}>
                  <Ionicons name="chevron-forward-outline" size={20} color={colors.primary} />
                </Pressable>
              </View>

              <View style={styles.calendarFrame}>
                <View style={styles.calendarLegend}>
                  <View style={styles.legendItem}><View style={[styles.legendDot, styles.legendAssigned]} /><Text style={styles.legendText}>Assigned due date</Text></View>
                  <View style={styles.legendItem}><View style={[styles.legendDot, styles.legendOpen]} /><Text style={styles.legendText}>Unassigned due date</Text></View>
                  <View style={styles.legendItem}><View style={styles.legendNormal} /><Text style={styles.legendText}>No due date</Text></View>
                </View>

                <View style={styles.weekdayRow}>
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                    <Text
                      key={`${day}-${index}`}
                      style={[
                        styles.weekdayText,
                        {
                          width: calendarCellSize,
                          marginRight: index % 7 === 6 ? 0 : calendarGap,
                        },
                      ]}
                    >
                      {day}
                    </Text>
                  ))}
                </View>

                <View style={styles.calendarGrid} onLayout={handleCalendarGridLayout}>
                  {calendarCells.map((date, index) => {
                  const execution = selectedEditableExecutions.find((item) => item.dueDate && sameDate(parseIsoDate(item.dueDate.slice(0, 10)), date));
                  const selected = execution?.scheduleExecutionId === selectedExecution?.scheduleExecutionId;
                  const inMonth = date.getMonth() === calendarMonth.getMonth();
                  const assigned = Boolean(execution?.assigneeEmployeeId);
                  return (
                    <Pressable
                      key={date.toISOString()}
                      style={[
                        styles.calendarCell,
                        {
                          width: calendarCellSize,
                          height: Math.max(calendarCellSize * 1.12, 54),
                          marginRight: index % 7 === 6 ? 0 : calendarGap,
                          marginBottom: calendarGap,
                        },
                        !inMonth && styles.calendarCellMuted,
                        execution && (assigned ? styles.calendarCellAssigned : styles.calendarCellOpen),
                        selected && styles.calendarCellSelected,
                      ]}
                      disabled={!execution}
                      onPress={() => execution && setSelectedExecution(execution)}
                    >
                      <Text style={[
                        styles.calendarDayText,
                        !inMonth && styles.calendarDayMuted,
                        execution && styles.calendarDueText,
                      ]}>
                        {date.getDate()}
                      </Text>
                      {execution ? (
                        <Text style={styles.calendarAssigneeText} numberOfLines={1}>
                          {execution.assigneeName || "Open"}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
                </View>
              </View>

              {!selectedEditableExecutions.length ? (
                <Text style={styles.emptyInlineText}>No editable due schedules for this task.</Text>
              ) : null}

              {selectedExecution ? (
                <View style={styles.assignmentPanel}>
                  <Text style={styles.fieldLabel}>
                    {selectedExecution.assigneeEmployeeId ? "Reassign selected due date" : "Assign selected due date"}
                  </Text>
                  {assignmentEmployees.map((employee) => (
                    <EmployeeCard
                      key={employee.employeeId}
                      employee={employee}
                      selected={employee.employeeId === selectedExecution.assigneeEmployeeId}
                      onPress={() => confirmReassignExecution(employee.employeeId, employee.fullName)}
                    />
                  ))}
                  {!assignmentEmployees.length ? (
                    <Text style={styles.emptyInlineText}>No other operators available for this schedule.</Text>
                  ) : null}
                  {reassigningExecutionId ? <ActivityIndicator size="small" color={colors.primary} /> : null}
                </View>
              ) : (
                <Text style={styles.emptyInlineText}>Choose a due schedule above to reassign its operator.</Text>
              )}
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
    maxHeight: "88%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  assignmentScreen: { flex: 1, backgroundColor: colors.surface },
  assignmentSheet: { flex: 1, paddingHorizontal: 16, paddingTop: 18 },
  assignmentContent: { gap: 14, paddingBottom: 28 },
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
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  calendarTitle: { fontFamily: "Jost_600SemiBold", fontSize: 22, color: colors.text },
  calendarNavButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DADDE8",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarFrame: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E1E4EF",
    padding: 14,
    width: "100%",
    shadowColor: "#111827",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  calendarLegend: { flexDirection: "row", gap: 14, alignItems: "center", marginBottom: 14, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendAssigned: { backgroundColor: "#DBEAFE", borderWidth: 1, borderColor: "#2563EB" },
  legendOpen: { backgroundColor: "#FEE2E2", borderWidth: 1, borderColor: "#EF4444" },
  legendNormal: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB" },
  legendText: { fontFamily: "Jost_400Regular", fontSize: 12, color: "#626781" },
  weekdayRow: { flexDirection: "row", marginBottom: 10 },
  weekdayText: { textAlign: "center", fontFamily: "Jost_600SemiBold", fontSize: 12, color: "#626781" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", width: "100%" },
  calendarCell: {
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 7,
    justifyContent: "space-between",
  },
  calendarCellMuted: { opacity: 0.4 },
  calendarCellAssigned: { backgroundColor: "#DBEAFE", borderColor: "#2563EB" },
  calendarCellOpen: { backgroundColor: "#FEE2E2", borderColor: "#EF4444" },
  calendarCellSelected: { borderColor: colors.primary, borderWidth: 2 },
  calendarDayText: { fontFamily: "Jost_600SemiBold", fontSize: 14, color: colors.text },
  calendarDayMuted: { color: "#8B90A4" },
  calendarDueText: { color: colors.text },
  calendarAssigneeText: { fontFamily: "Jost_600SemiBold", fontSize: 10, color: "#2F3448" },
  assignmentPanel: { backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#E1E4EF", padding: 12 },
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
