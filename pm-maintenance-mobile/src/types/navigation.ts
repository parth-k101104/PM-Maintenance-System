import type { QRScanResponse, ScannedEquipmentDetails, SupervisorQRScanResponse, TaskDetails } from "./api";

export type RootStackParamList = {
  Dashboard: undefined;
  TaskList: undefined;
  SupervisorDueApprovals: undefined;
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
};
