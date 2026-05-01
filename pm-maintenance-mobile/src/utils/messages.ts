export function getBackendMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error) || !error.message) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(error.message);
    if (typeof parsed?.message === "string" && parsed.message.trim()) {
      return parsed.message;
    }
    if (typeof parsed?.error === "string" && parsed.error.trim()) {
      return parsed.error;
    }
  } catch {
    // Not a JSON error payload; use the original message below.
  }

  return error.message;
}

export function getResponseMessage(response: { message?: string } | undefined, fallback: string) {
  return response?.message?.trim() || fallback;
}
