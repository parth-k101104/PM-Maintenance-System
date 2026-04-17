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
};

export type AuthSession = LoginResponse & {
  dashboard?: OperatorDashboardResponse;
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

export type ScannedEquipmentDetails = {
  rawValue: string;
  equipmentId?: number;
  equipmentElementId?: number;
  equipmentPartId?: number;
};
