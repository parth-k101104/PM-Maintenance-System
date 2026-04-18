import type { QRScanResponse, ScannedEquipmentDetails, TaskDetails } from "./api";

export type RootStackParamList = {
  Dashboard: undefined;
  TaskList: undefined;
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
};
