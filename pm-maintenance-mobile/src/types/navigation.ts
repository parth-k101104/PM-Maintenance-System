import type { QRScanResponse, ScannedEquipmentDetails, SupervisorQRScanResponse, TaskDetails, IssueFlag, LineEquipment } from "./api";

export type RootStackParamList = {
  Dashboard: undefined;
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
