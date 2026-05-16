"use client";

/**
 * Per-tab session id used to scope dashboard state on the backend.
 *
 * Generated once on first mount, persisted in sessionStorage so a refresh
 * keeps the same id. Different tabs get different ids (sessionStorage is
 * tab-scoped on every browser), so two visitors at the same URL never see
 * each other's scenarios, toggles, or chains.
 *
 * SSR-safe: returns "default" on the server, which the backend treats as
 * "no specific session" (broadcasts reach everyone). The real id replaces
 * it on the client during hydration.
 */

const KEY = "heimdall_session_id";

export function getSessionId(): string {
  if (typeof window === "undefined") return "default";
  try {
    let id = window.sessionStorage.getItem(KEY);
    if (!id) {
      id = generateId();
      window.sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // private mode / storage disabled — fall back to a per-load random id
    return generateId();
  }
}

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + random suffix
  return `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
