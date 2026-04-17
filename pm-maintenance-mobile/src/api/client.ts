import Constants from "expo-constants";
import { Platform } from "react-native";

import type {
  LoginRequest,
  LoginResponse,
  OperatorDashboardResponse,
  QRScanRequest,
  QRScanResponse,
  TaskDocumentUrls,
} from "../types/api";

const expoBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

function getDefaultBaseUrl() {
  if (envBaseUrl) {
    return envBaseUrl;
  }

  if (Platform.OS === "android") {
    if (expoBaseUrl?.includes("localhost")) {
      return "http://192.168.1.3:8080";
    }

    if (expoBaseUrl) {
      return expoBaseUrl;
    }

    return "http://192.168.1.3:8080";
  }

  if (expoBaseUrl) {
    return expoBaseUrl;
  }

  return "http://192.168.1.3:8080";
}

const API_BASE_URL = getDefaultBaseUrl().replace(/\/$/, "");

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

export async function login(payload: LoginRequest) {
  return request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchOperatorDashboard(token: string) {
  return request<OperatorDashboardResponse>("/api/v1/dashboard/operator", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function fetchTasksForToday(token: string) {
  return request<import("../types/api").TaskDetails[]>("/api/v1/tasks/today", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function fetchCompletedTasks(token: string) {
  return request<import("../types/api").CompletedTask[]>("/api/v1/tasks/completed", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function fetchUpcomingTasks(token: string) {
  return request<import("../types/api").TaskDetails[]>("/api/v1/tasks/upcoming", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function fetchTaskDocuments(token: string, scheduleExecutionId: number) {
  return request<TaskDocumentUrls>(`/api/v1/documents/task/${scheduleExecutionId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function scanTaskQr(token: string, payload: QRScanRequest) {
  return request<QRScanResponse>("/api/v1/task-execution/scan", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export { API_BASE_URL };
