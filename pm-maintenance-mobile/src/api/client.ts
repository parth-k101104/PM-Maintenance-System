import type {
  LoginRequest,
  LoginResponse,
  OperatorDashboardResponse,
  QRScanRequest,
  QRScanResponse,
  TaskCompletionRequest,
  TaskCompletionResponse,
  TaskDocumentUrls,
} from "../types/api";

// ─────────────────────────────────────────────────────────────────────────────
// API base URL
//
// Set EXPO_PUBLIC_API_BASE_URL in your .env file (copy from .env.example).
// Expo inlines EXPO_PUBLIC_* vars at bundle time, so a restart is required
// whenever you change .env.
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

if (!API_BASE_URL) {
  console.warn(
    "[api/client] EXPO_PUBLIC_API_BASE_URL is not set. " +
      "Copy .env.example → .env and set the correct backend URL."
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Base HTTP helper
//
// `...init` is spread FIRST so the explicit `headers` block below always wins,
// ensuring Content-Type: application/json is never overwritten by the caller.
// ─────────────────────────────────────────────────────────────────────────────
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }

  return response.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export async function login(payload: LoginRequest) {
  return request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchOperatorDashboard(token: string) {
  return request<OperatorDashboardResponse>("/api/v1/dashboard/operator", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Task lists
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchTasksForToday(token: string) {
  return request<import("../types/api").TaskDetails[]>("/api/v1/tasks/today", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchCompletedTasks(token: string) {
  return request<import("../types/api").CompletedTask[]>("/api/v1/tasks/completed", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchUpcomingTasks(token: string) {
  return request<import("../types/api").TaskDetails[]>("/api/v1/tasks/upcoming", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Documents
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchTaskDocuments(token: string, scheduleExecutionId: number) {
  return request<TaskDocumentUrls>(`/api/v1/documents/task/${scheduleExecutionId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Task execution
// ─────────────────────────────────────────────────────────────────────────────

export async function scanTaskQr(token: string, payload: QRScanRequest) {
  return request<QRScanResponse>("/api/v1/task-execution/scan", {
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

export { API_BASE_URL };
