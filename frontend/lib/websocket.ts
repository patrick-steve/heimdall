"use client";
import { useEffect, useRef } from "react";
import { getSessionId } from "./session";
import type { WsEvent } from "./types";

const WS_URL =
  (process.env.NEXT_PUBLIC_HEIMDALL_WS as string) ?? "ws://127.0.0.1:8000/ws";

export function useWebSocket(onEvent: (e: WsEvent) => void): void {
  const cbRef = useRef(onEvent);
  useEffect(() => { cbRef.current = onEvent; }, [onEvent]);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    let retry = 0;

    const connect = () => {
      const sid = getSessionId();
      const url = `${WS_URL}?session_id=${encodeURIComponent(sid)}`;
      ws = new WebSocket(url);
      ws.onopen = () => { retry = 0; };
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data) as WsEvent;
          // Defensive: if the backend included a session_id and it doesn't
          // match ours, drop the event. Backend already routes by session,
          // so this should never trigger; it's a belt-and-braces guard.
          const stamped = (data as { session_id?: string }).session_id;
          if (stamped && stamped !== sid) return;
          cbRef.current(data);
        } catch {
          /* ignore non-json keepalives */
        }
      };
      ws.onclose = () => {
        if (cancelled) return;
        retry = Math.min(retry + 1, 5);
        setTimeout(connect, retry * 500);
      };
      ws.onerror = () => ws?.close();
    };

    connect();
    return () => { cancelled = true; ws?.close(); };
  }, []);
}
