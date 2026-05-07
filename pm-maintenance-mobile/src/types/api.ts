export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  message: string;
  token: string;
  employeeId: number;
  fullName: string;
  roleId: number;
  roleName?: string;
  accessLevelName?: string;
  permissions?: Record<string, unknown>;
};

export type DashboardItem = {
  itemName: string;
  quantity: number;
};

export type OperatorDashboardResponse = {
  userContext: {
    name: string;
    date: string;
    shift: string;
  };
  taskSummary: {
    tasksToday: number;
    backlogTasks: number;
    remainingTasks: number;
  };
  taskStatus: {
    approved: number;
    pending: number;
    denied: number;
  };
  timeEstimate: {
    totalTimeRequiredMins: number;
    formattedEstimate: string;
  };
  requiredItems: DashboardItem[];
  flagsRaised: number;
};

export type IssueFlag = {
  flagId: number;
  scheduleExecutionId: number;
  partId: number;
  partName: string;
  equipmentId: number;
  equipmentName: string;
  location: string;
  attendantId: number;
  attendantName: string;
  status: string;
  criticality: string;
  dueDate: string;
  raisedDttm: string;
};

export type FlagScanRequest = {
  equipmentId?: number;
  equipmentElementId?: number;
  equipmentPartId?: number;
};

export type FlagScanResponse = {
  status: string;
  message: string;
  partId?: number;
  partName?: string;
  partCode?: string;
  sparePartId?: number;
  sparePartName?: string;
  sparePartNumber?: string;
  sparePartLocation?: string;
  sparePartCurrentStock?: number;
  actualValue?: number;
  uom?: string;
  toleranceMin?: number;
  toleranceMax?: number;
  standardValue?: number;
  photoUploadUrl?: string;
  photoS3Key?: string;
  uploadExpiresInMinutes?: number;
};

export type FlagReplacementRequest = {
  replacementDone: boolean;
  sparePartId?: number;
  notes?: string;
};

export type SupervisorDashboardResponse = {
  todaysDueApprovals: number;
  activeFlags: number;
  openDeviations: number;
  upcomingApprovalsThisMonth: number;
  supervisedEmployeeCount: number;
  tasksInPipeline: number;
};

export type LineManagerDashboardLineBreakdown = {
  lineId: number;
  lineName: string;
  healthScore?: number;
  phmCoverageRate?: number;
  pmComplianceRate?: number;
  taskRejectionRate?: number;
  approvalTurnaroundTimeHours?: number;
  evidenceComplianceRate?: number;
  employeeEfficiency?: number;
};

export type LineManagerDashboardWindowMetrics = {
  windowDays: number;
  lineHealth?: number;
  /** PHM prediction coverage: % of tasks the analytics engine could evaluate. */
  phmCoverageRate?: number;
  /** Operational PM compliance: approved / (approved + rejected) × 100. */
  pmComplianceRate?: number;
  taskRejectionRate?: number;
  approvalTurnaroundTimeHours?: number;
  evidenceComplianceRate?: number;
  employeeEfficiency?: number;
  lineMetrics?: LineManagerDashboardLineBreakdown[];
};

export type LineManagerDashboardResponse = {
  totalApprovalsToday: number;
  backlogApprovals: number;
  lineHealth: number;
  totalFlagsRaised: number;
  activeTasksToday: number;
  pendingReviewTasks?: number;
  rejectedTasks?: number;
  todayTasks?: TaskDetails[];
  rollingWindows?: Record<string, LineManagerDashboardWindowMetrics>;
  actionInsights?: ActionInsight[];
};

export type LinePart = {
  partId: number;
  partName: string;
};

export type LineElement = {
  elementId: number;
  elementName: string;
  parts: LinePart[];
};

export type LineEquipment = {
  equipmentId: number;
  equipmentName: string;
  elements: LineElement[];
};

export type MaintenanceManagerDashboardWindowMetrics = {
  windowDays: number;
  taskStatusCounts: {
    inProgress: number;
    underReview: number;
    overdue: number;
    rejected: number;
    approved: number;
  };
  /** PHM prediction coverage: % of tasks the analytics engine could evaluate. */
  overallPhmCoverageRate: number | null;
  /** Operational PM compliance: approved / (approved + rejected) × 100. */
  overallPmComplianceRate: number | null;
  // Orange metrics — plant-wide averages
  plantRejectionRate: number | null;
  plantApprovalTurnaroundTimeHours: number | null;
  plantEvidenceComplianceRate: number | null;
  plantEmployeeEfficiency: number | null;
  lineWiseCompliance: {
    lineId: number;
    lineName: string;
    /** PHM health score for this line (0-100). */
    lineHealthScore: number | null;
    /** PHM prediction coverage for this line. */
    phmCoverageRate: number | null;
    /** Operational PM compliance for this line. */
    pmComplianceRate: number | null;
    // Orange metrics — per line
    rejectionRate: number | null;
    approvalTurnaroundTimeHours: number | null;
    evidenceComplianceRate: number | null;
    employeeEfficiency: number | null;
  }[];
};

export type MaintenanceManagerDashboardResponse = MaintenanceManagerDashboardWindowMetrics & {
  rollingWindows?: Record<string, MaintenanceManagerDashboardWindowMetrics>;
  actionInsights?: ActionInsight[];
};

export type DashboardKind = "operator" | "supervisor" | "lineManager" | "maintenanceManager";

export type AuthSession = LoginResponse & {
  dashboardKind?: DashboardKind;
  dashboard?: OperatorDashboardResponse | SupervisorDashboardResponse | LineManagerDashboardResponse | MaintenanceManagerDashboardResponse;
};

export type ConfigParam = {
  paramId: number;
  paramKey: string;
  paramValue: string;
  paramCategory: string;
  description?: string | null;
  dataType: "STRING" | "INTEGER" | "LONG" | "DOUBLE" | "BOOLEAN" | string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type TaskDetails = {
  scheduleExecutionId: number;
  stdTaskId: number;
  taskRefNo: string;
  taskName: string;
  timeRequired: number;
  machineName: string;
  machineElementName: string;
  machinePartName: string;
  zone: string;
  block: string;
  lineName: string;
  lineCode: string;
  lineId: number;
  taskCriticality: "HIGH" | "MEDIUM" | "LOW";
  dueDate?: string;
  /** Time actually taken by the employee (mins) — populated for approval lists */
  timeTaken?: number;
  /** Name of the employee who executed the task */
  employeeName?: string;
  scheduleApprovalId?: number;
  deviationFlag?: boolean;
  hasActiveFlag?: boolean;
  activeFlagStatus?: string;
  rescheduleFlag?: boolean;
  parentScheduleExecutionId?: number;
};

export type CompletedTask = {
  scheduleExecutionId: number;
  taskName: string;
  machineName: string;
  machineElementName: string;
  machinePartName: string;
  stdAmountOfTime: number;
  timeTaken: number;
  zone: string;
  block: string;
  lineId: number;
  lineCode: string;
  lineName: string;
  status: string;
  taskCriticality: "HIGH" | "MEDIUM" | "LOW";
  supervisorName?: string;
  /** Name of the employee currently assigned to review this task */
  reviewerName?: string;
  /** Human-readable review stage label, e.g. "Supervisor Review" */
  reviewType?: string;

  // Reschedule info for rejected tasks
  rescheduleFlag?: boolean;
  parentScheduleExecutionId?: number;
  rescheduledExecutionId?: number;
  rescheduledStatus?: string;
  rescheduledDueDate?: string;
};

export type TaskDocumentUrls = {
  taskSopUrl?: string;
  machineManualUrl?: string;
  taskSopKey?: string;
  machineManualKey?: string;
};

export type QRScanRequest = {
  equipmentId?: number;
  equipmentElementId?: number;
  equipmentPartId?: number;
  scheduleExecutionId: number;
  scheduleApprovalId?: number;
};

export type SupervisorQRScanRequest = {
  equipmentId?: number;
  equipmentElementId?: number;
  equipmentPartId?: number;
  scheduleExecutionId: number;
  scheduleApprovalId?: number;
};

/** One historical execution data point returned by the supervisor QR scan */
export type HistoricalDataPoint = {
  scheduleExecutionId: number;
  taskName: string;
  actualValue?: number;
  deviationFlag: boolean;
  timeTaken?: number;
  notes?: string;
  completedDate?: string;
  status: string;
  executedBy?: string;
};

export type SupervisorQRScanResponse = {
  status: string;
  message: string;
  uom?: string;
  toleranceMin?: number;
  toleranceMax?: number;
  standardValue?: number;
  actualValue?: number;
  deviationFlag?: boolean;
  timeTaken?: number;
  notes?: string;
  estimatedReqTime?: number;
  observationPhotoUrl?: string;
  historicalData?: HistoricalDataPoint[];
};

export type QRTask = {
  scheduleExecutionId: number;
  stdTaskId: number;
  taskRefNo: string;
  taskName: string;
  timeRequired: number;
  uom?: string;
  machineName?: string;
  machineElementName?: string;
  machinePartName?: string;
  zone?: string;
  block?: string;
  lineName?: string;
  dueDate?: string;
};

export type QRScanResponse = {
  status: "success" | "not_found" | string;
  message: string;
  uom?: string;
  toleranceMin?: number;
  toleranceMax?: number;
  standardValue?: number;
  observationUploadUrl?: string;
  observationS3Key?: string;
  uploadExpiresInMinutes?: number;
  relatedPartTasks?: QRTask[];
  relatedMachineTasks?: QRTask[];
};

export type TaskCompletionRequest = {
  scheduleExecutionId: number;
  timeTaken: number;
  actualValue?: number | null;
  notes?: string;
  manualDeviation?: boolean;
  manualFlagStatus?: "POTENTIAL_REPLACEMENT" | "REPLACEMENT_REQUIRED";
  manualIssueDetails?: string;
};

export type TaskCompletionResponse = {
  status: string;
  message: string;
};

export type ApprovalActionRequest = {
  scheduleExecutionId: number;
  action: "APPROVE" | "REJECT";
  remarks?: string;
  evidenceRejectedFlag?: boolean;
};

export type ApprovalActionResponse = {
  status: string;
  message: string;
  executionStatus?: string;
  nextApproverId?: number;
  rescheduledExecutionId?: number;
};

export type ScannedEquipmentDetails = {
  rawValue: string;
  equipmentId?: number;
  equipmentElementId?: number;
  equipmentPartId?: number;
};

export type HealthScore = {
  healthId: number;
  evaluationDate: string;
  entityType: "LINE" | "EQUIPMENT" | string;
  entityId: number;
  entityName?: string;
  healthScore?: number;
  criticalFlagsCount?: number;
  pmComplianceRate?: number;
  trend?: string;
};

export type PartPrediction = {
  predictionId: number;
  lineId?: number;
  lineName?: string;
  equipmentId?: number;
  equipmentName?: string;
  partId: number;
  partName: string;
  taskScheduleId?: number;
  evaluationDate: string;
  currentValue?: number;
  predictedFailureDate?: string;
  confidenceScore?: number;
  daysRemaining?: number;
  degradationVelocity?: number;
  riskScore?: number;
  lifecycleRatio?: number;
};

export type ActionInsight = {
  insightId: number;
  lineId?: number;
  equipmentId?: number;
  equipmentName?: string;
  partId?: number;
  partName?: string;
  insightType?: string;
  insightCode: string;
  severity?: "CRITICAL" | "WARNING" | "INFO" | string;
  status: string;
  createdAt?: string;
  message: string;
  currentValue?: number;
  predictedFailureDate?: string;
  confidenceScore?: number;
  daysRemaining?: number;
  riskScore?: number;
  velocityIncreasePercent?: number;
};

export type AnalyticsDashboardResponse = {
  rollingHealthScores: Record<string, HealthScore[]>;
  predictions: PartPrediction[];
  actionInsights: ActionInsight[];
};

export type JobRunResponse = {
  jobCode: string;
  status: string;
  responsePayload?: string;
};

export type SeriesPoint = {
  day: number;
  date: string;
  value: number;
};

export type HistoricalCycle = {
  cycleIndex: number;
  startDate: string;
  endDate?: string | null;
  velocity: number;
  points: SeriesPoint[];
};

export type PartThresholds = {
  standardValue?: number | null;
  toleranceMin?: number | null;
  toleranceMax?: number | null;
  warningValue?: number | null;
  uom?: string | null;
};

export type PartAnalyticsResponse = {
  partId: number;
  partName: string;
  equipmentId: number;
  equipmentName: string;
  status?: string | null;
  currentValue?: number | null;
  riskScore?: number | null;
  confidenceScore?: number | null;
  degradationVelocity?: number | null;
  lifecycleRatio?: number | null;
  velocityRatio?: number | null;
  daysRemaining?: number | null;
  predictedFailureDate?: string | null;
  evaluationDate?: string | null;
  thresholds?: PartThresholds | null;
  currentCycle?: SeriesPoint[];
  historicalCycles?: HistoricalCycle[];
  simulatedFailureCurve?: SeriesPoint[];
  masterCurve?: SeriesPoint[];
  actionInsights?: ActionInsight[];
};
