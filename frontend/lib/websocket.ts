"use client";
import { useEffect, useRef } from "react";
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
      ws = new WebSocket(WS_URL);
      ws.onopen = () => { retry = 0; };
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data) as WsEvent;
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
