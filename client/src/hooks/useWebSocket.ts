import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { WsEvent } from "@shared/types";

export function useWebSocket(enabled = true) {
  const ws = useRef<WebSocket | null>(null);
  const qc = useQueryClient();

  const handleEvent = useCallback(
    (event: WsEvent) => {
      switch (event.type) {
        case "visitor:checked_in":
        case "visitor:checked_out":
          qc.invalidateQueries({ queryKey: ["visitors"] });
          break;
        case "ticket:created":
        case "ticket:updated":
          qc.invalidateQueries({ queryKey: ["maintenance"] });
          break;
        case "announcement:new":
          qc.invalidateQueries({ queryKey: ["announcements"] });
          break;
        case "notification:new":
          qc.invalidateQueries({ queryKey: ["notifications"] });
          break;
        case "emergency:alert":
          qc.invalidateQueries({ queryKey: ["emergency"] });
          break;
      }
    },
    [qc],
  );

  useEffect(() => {
    if (!enabled) return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/ws`;

    const connect = () => {
      const socket = new WebSocket(wsUrl);
      ws.current = socket;

      socket.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as WsEvent;
          handleEvent(event);
        } catch {
          // ignore malformed messages
        }
      };

      socket.onclose = () => {
        // reconnect after 3s unless intentionally closed
        setTimeout(() => {
          if (ws.current?.readyState === WebSocket.CLOSED) connect();
        }, 3000);
      };
    };

    connect();

    return () => {
      ws.current?.close();
    };
  }, [enabled, handleEvent]);
}
