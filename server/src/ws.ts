import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { lucia } from "./auth.js";
import type { WsEvent } from "@shared/types.js";

// Map estateId → Set of connected sockets
const estateConnections = new Map<string, Set<WebSocket>>();

export function broadcastToEstate(estateId: string, event: WsEvent) {
  const conns = estateConnections.get(estateId);
  if (!conns) return;
  const payload = JSON.stringify(event);
  for (const ws of conns) {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }
}

export function createWsServer(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", async (ws, req: IncomingMessage) => {
    const cookie = req.headers.cookie ?? "";
    const sessionId = lucia.readSessionCookie(cookie);

    if (!sessionId) {
      ws.close(4001, "Unauthorized");
      return;
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || !user.estateId) {
      ws.close(4001, "Unauthorized");
      return;
    }

    const estateId = user.estateId;
    if (!estateConnections.has(estateId)) {
      estateConnections.set(estateId, new Set());
    }
    estateConnections.get(estateId)!.add(ws);

    ws.on("close", () => {
      estateConnections.get(estateId)?.delete(ws);
    });

    ws.on("error", () => {
      estateConnections.get(estateId)?.delete(ws);
    });
  });

  return wss;
}
