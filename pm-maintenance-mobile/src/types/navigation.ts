import type { QRScanResponse, ScannedEquipmentDetails, SupervisorQRScanResponse, TaskDetails, IssueFlag, LineEquipment } from "./api";

export type RootStackParamList = {
  Dashboard: undefined;
  MaintenanceManagerDashboard: undefined;
  MmTaskStatusList: { statusGroup: string; label: string; color: string; windowDays: number; rollingWindows: any };
  MmComplianceAnalytics: { currentRate?: number | null; lineWiseData: any[]; windowDays: number; rollingWindows: any };
  MmEvidenceComplianceAnalytics: {
    currentRate?: number | null;
    lineWiseData: { lineName: string; evidenceComplianceRate: number | null }[];
    windowDays: number;
    rollingWindows: any;
  };
  MmMetricTrend: {
    metric: "rejection" | "approvalTurnaround";
    title: string;
    currentValue?: number | null;
    unit: string;
    windowDays: number;
    rollingWindows: any;
  };
  TaskList: undefined;
  SupervisorDueApprovals: undefined;
  LineManagerTodayApprovals: undefined;
  LineManagerBacklogApprovals: undefined;
  LineManagerFlags: undefined;
  LineManagerEquipments: undefined;
  LineManagerAnalyticsDashboard: undefined;
  LineManagerEquipmentParts: { equipment: LineEquipment };
  LineManagerPartAnalytics: { part: { partId: number; partName: string; equipmentName: string; equipmentId: number } };
  BacklogTasks: undefined;
  TaskApproval: undefined;
  UpcomingTasks: undefined;
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
