import type {
  AnalyticsDashboardResponse,
  ApprovalActionRequest,
  ApprovalActionResponse,
  FlagReplacementRequest,
  FlagScanRequest,
  FlagScanResponse,
  IssueFlag,
  JobRunResponse,
  LineEquipment,
  LineManagerDashboardResponse,
  LoginRequest,
  LoginResponse,
  OperatorDashboardResponse,
  QRScanRequest,
  QRScanResponse,
  SupervisorDashboardResponse,
  SupervisorQRScanRequest,
  SupervisorQRScanResponse,
  TaskCompletionRequest,
  TaskCompletionResponse,
  TaskDetails,
  TaskDocumentUrls,
} from "../types/api";

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

if (!API_BASE_URL) {
  console.warn(
    "[api/client] EXPO_PUBLIC_API_BASE_URL is not set. Copy .env.example to .env and set the backend URL.",
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;

    try {
      const parsed = JSON.parse(text);
      message = parsed?.message || parsed?.error || text;
    } catch {
      message = text;
    }

    throw new Error(message || "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function login(payload: LoginRequest) {
  return request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchOperatorDashboard(token: string) {
  return request<OperatorDashboardResponse>("/api/v1/dashboard/operator", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchSupervisorDashboard(token: string) {
  return request<SupervisorDashboardResponse>("/api/v1/dashboard/supervisor", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchLineManagerDashboard(token: string) {
  return request<LineManagerDashboardResponse>("/api/v1/dashboard/line-manager", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchTasksForToday(token: string) {
  return request<TaskDetails[]>("/api/v1/tasks/today", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchSupervisorTodaysApprovals(token: string) {
  return request<TaskDetails[]>("/api/v1/tasks/supervisor/approvals/today", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchLineManagerTodaysApprovals(token: string) {
  return request<TaskDetails[]>("/api/v1/line-manager/approvals/today", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchLineManagerBacklogApprovals(token: string) {
  return request<TaskDetails[]>("/api/v1/line-manager/approvals/backlog", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchLineManagerFlags(token: string) {
  return request<IssueFlag[]>("/api/v1/line-manager/flags", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchLineManagerActiveTasks(token: string) {
  return request<TaskDetails[]>("/api/v1/line-manager/tasks/active", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchLineManagerEquipments(token: string) {
  return request<LineEquipment[]>("/api/v1/line-manager/equipments", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchLineManagerAnalyticsDashboard(token: string) {
  return request<AnalyticsDashboardResponse>("/api/v1/line-manager/analytics/dashboard", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function acknowledgeLineManagerInsight(token: string, insightId: number) {
  return request<void>(`/api/v1/line-manager/analytics/insights/${insightId}/acknowledge`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function runAnalyticsSyncJob(token: string) {
  return request<JobRunResponse>("/api/system-jobs/NIGHTLY_PHM_ANALYTICS_SYNC/run", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ persist: true, triggerType: "MANUAL_UI" }),
  });
}

export async function fetchCompletedTasks(token: string) {
  return request<import("../types/api").CompletedTask[]>("/api/v1/tasks/completed", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchBacklogTasks(token: string) {
  return request<TaskDetails[]>("/api/v1/tasks/backlog", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchUpcomingTasks(token: string) {
  return request<TaskDetails[]>("/api/v1/tasks/upcoming", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchTaskDocuments(token: string, scheduleExecutionId: number) {
  return request<TaskDocumentUrls>(`/api/v1/documents/task/${scheduleExecutionId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function scanTaskQr(token: string, payload: QRScanRequest) {
  return request<QRScanResponse>("/api/v1/task-execution/scan", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function scanSupervisorTaskQr(token: string, payload: SupervisorQRScanRequest) {
  return request<SupervisorQRScanResponse>("/api/v1/task-execution/supervisor/scan", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function scanLineManagerTaskQr(token: string, payload: SupervisorQRScanRequest) {
  return request<SupervisorQRScanResponse>("/api/v1/task-execution/line-manager/scan", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function scanMaintenanceManagerTaskQr(token: string, payload: SupervisorQRScanRequest) {
  return request<SupervisorQRScanResponse>("/api/v1/task-execution/maintenance-manager/scan", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function processSupervisorApproval(token: string, payload: ApprovalActionRequest) {
  return request<ApprovalActionResponse>("/api/v1/supervisor/approvals/action", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function processLineManagerApproval(token: string, payload: ApprovalActionRequest) {
  return request<ApprovalActionResponse>("/api/v1/line-manager/approvals/action", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function processMaintenanceManagerApproval(token: string, payload: ApprovalActionRequest) {
  return request<ApprovalActionResponse>("/api/v1/maintenance-manager/approvals/action", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function completeTask(token: string, payload: TaskCompletionRequest) {
  return request<TaskCompletionResponse>("/api/v1/task-execution/complete", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function fetchEmployeeApprovalSummary(token: string, period: "CURRENT_MONTH" | "YEAR") {
  return request<
    {
      employeeId: number;
      employeeName: string;
      period: string;
      totalTasks: number;
      assignedOrInProgress: number;
      pendingSupervisorApproval: number;
      underLineManagerReview: number;
      underMaintManagerReview: number;
      totalExecuted: number;
      approved: number;
      rejected: number;
    }[]
  >(`/api/v1/supervisor/approvals/employees/summary?period=${period}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchMyFlags(token: string) {
  return request<IssueFlag[]>("/api/v1/issues/operator", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function scanFlagQr(token: string, flagId: number, payload: FlagScanRequest) {
  return request<FlagScanResponse>(`/api/v1/issues/${flagId}/scan`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function completeFlagReplacement(token: string, flagId: number, payload: FlagReplacementRequest) {
  return request<any>(`/api/v1/issues/${flagId}/complete-replacement`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function fetchSupervisorFlags(token: string) {
  return request<IssueFlag[]>("/api/v1/issues/supervisor", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function reviewFlagAsLineManager(
  token: string,
  flagId: number,
  payload: { newStatus: string; criticality?: string; notes?: string; closureReason?: string },
) {
  return request<IssueFlag>(`/api/v1/issues/${flagId}/review`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function reviewFlagAsSupervisor(
  token: string,
  flagId: number,
  payload: { newStatus: string; notes?: string },
) {
  return request<IssueFlag>(`/api/v1/issues/${flagId}/review`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function fetchPartAnalytics(token: string, partId: number) {
  return request<import("../types/api").PartAnalyticsResponse>(
    `/api/v1/line-manager/analytics/parts/${partId}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
}

export { API_BASE_URL };
