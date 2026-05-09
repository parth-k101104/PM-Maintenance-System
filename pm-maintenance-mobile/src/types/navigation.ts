import type { QRScanResponse, ScannedEquipmentDetails, SupervisorQRScanResponse, TaskDetails, IssueFlag, LineEquipment } from "./api";

export type RootStackParamList = {
  Dashboard: undefined;
  MaintenanceManagerDashboard: undefined;
  MaintenanceReports: undefined;
  MmTaskStatusList: { statusGroup: string; label: string; color: string; windowDays: number; rollingWindows: any };
  MmComplianceAnalytics: {
    currentRate?: number | null;
    lineWiseData?: any[];
    windowDays: number;
    rollingWindows: any;
    isLineManager?: boolean;
    lineId?: number | null;
  };
  MmEvidenceComplianceAnalytics: {
    currentRate?: number | null;
    lineWiseData: { lineName: string; evidenceComplianceRate: number | null }[];
    windowDays: number;
    rollingWindows: any;
    isLineManager?: boolean;
    lineId?: number | null;
  };
  MmPhmCoverageAnalytics: {
    windowDays: number;
    rollingWindows: any;
    isLineManager?: boolean;
    lineId?: number | null;
  };
  MmEmployeeEfficiencyAnalytics: {
    windowDays: number;
    rollingWindows: any;
    isLineManager?: boolean;
    lineId?: number | null;
  };
  MmMetricTrend: {
    metric: "rejection" | "approvalTurnaround" | "phmCoverage" | "efficiency";
    title: string;
    currentValue?: number | null;
    unit: string;
    windowDays: number;
    rollingWindows: any;
    isLineManager?: boolean;
  };
  ConfigParams: undefined;
  TaskList: undefined;
  SupervisorDueApprovals: undefined;
  LineManagerTodayApprovals: undefined;
  LineManagerBacklogApprovals: undefined;
  LineManagerFlags: undefined;
  LineManagerEquipments: undefined;
  SchedulePlanner: undefined;
  SchedulePlannerCreate: undefined;
  LineManagerAnalyticsDashboard: { lineId?: number };
  LineManagerEquipmentParts: { equipment: LineEquipment };
  LineManagerPartAnalytics: { part: { partId: number; partName: string; equipmentName: string; equipmentId: number } };
  BacklogTasks: undefined;
  TaskApproval: undefined;
  UpcomingTasks: undefined;
  UpcomingApprovals: undefined;
  TaskDocuments: {
    task: TaskDetails;
  };
  QRScanner: {
    task: TaskDetails;
  };
  TaskExecution: {
    task: TaskDetails;
    scanResponse: QRScanResponse;
    scannedEquipment: ScannedEquipmentDetails;
    startedAt: number;
  };
  SupervisorTaskReview: {
    task: TaskDetails;
    scanResponse: SupervisorQRScanResponse;
    scannedEquipment: ScannedEquipmentDetails;
  };
  EmployeeApprovalChart: undefined;
  FlagsRaised: undefined;
  LineManagerActiveTasks: undefined;
  LineManagerFlagDetail: {
    flag: IssueFlag;
  };
  SupervisorFlags: undefined;
  SupervisorFlagReview: {
    flag: IssueFlag;
  };
  FlagDetail: {
    flag: IssueFlag;
  };
};
