import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { lucia } from "./auth.js";
import type { WsEvent, UserRole } from "@shared/types.js";
import { logger } from "./lib/logger.js";

const log = logger.child({ component: "ws" });

interface AliveSocket extends WebSocket {
  isAlive?: boolean;
  role?: UserRole;
}

// Map estateId → Set of connected sockets
const estateConnections = new Map<string, Set<AliveSocket>>();

// Heartbeat: every HEARTBEAT_MS the server pings every socket. The
// `isAlive` flag is reset to true on pong; sockets that miss two pings
// in a row are terminated. Without this, mobile clients on dropped 3G
// never close cleanly, leaving zombie sockets that broadcasts keep
// trying to write to.
const HEARTBEAT_MS = 30_000;

function originAllowed(req: IncomingMessage): boolean {
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) return true;
  const origin = req.headers.origin;
  if (!origin) return false; // Production browsers always send Origin on WS handshake.

  const allowed = [
    "https://www.jiranihub.co.ke",
    "https://jiranihub.co.ke",
    process.env.CLIENT_URL,
    process.env.RENDER_EXTERNAL_URL,
  ].filter(Boolean) as string[];
  return allowed.includes(origin);
}

// `roles`, when given, restricts delivery to sockets whose authenticated
// role is in the list — e.g. emergency alerts carry GPS coordinates and a
// phone number that a vendor account has no business receiving just
// because it shares an estate with the resident who raised the alert.
export function broadcastToEstate(
  estateId: string,
  event: WsEvent,
  opts?: { roles?: UserRole[] },
) {
  const conns = estateConnections.get(estateId);
  if (!conns) return;
  const payload = JSON.stringify(event);
  for (const ws of conns) {
    if (opts?.roles && (!ws.role || !opts.roles.includes(ws.role))) continue;
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }
}

export function createWsServer(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", async (ws: AliveSocket, req: IncomingMessage) => {
    if (!originAllowed(req)) {
      log.warn(
        { event: "ws_origin_rejected", origin: req.headers.origin },
        "rejected WS handshake from disallowed origin",
      );
      ws.close(4003, "Origin not allowed");
      return;
    }

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

    // Reject sessions for soft-deleted users (mirror of HTTP guard).
    if ((user as { deletedAt?: Date | null }).deletedAt) {
      ws.close(4003, "Account inactive");
      return;
    }

    const estateId = user.estateId;
    if (!estateConnections.has(estateId)) {
      estateConnections.set(estateId, new Set());
    }
    estateConnections.get(estateId)!.add(ws);

    ws.role = user.role;
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("close", () => {
      estateConnections.get(estateId)?.delete(ws);
    });

    ws.on("error", () => {
      estateConnections.get(estateId)?.delete(ws);
    });
  });

  // Heartbeat loop — terminate zombie sockets so estateConnections
  // doesn't grow without bound on mobile networks.
  const heartbeat = setInterval(() => {
    wss.clients.forEach((raw) => {
      const ws = raw as AliveSocket;
      if (ws.isAlive === false) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch {
        // Errors on ping are surfaced to the close handler.
      }
    });
  }, HEARTBEAT_MS);

  wss.on("close", () => clearInterval(heartbeat));

  return wss;
}
