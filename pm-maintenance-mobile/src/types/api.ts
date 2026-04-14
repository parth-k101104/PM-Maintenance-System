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
};
