import { findPlayerByToken, sanitizeRoomForViewer } from "@/lib/game/engine";
import type { PublicRoomState, RoomState } from "@/lib/game/types";

export function jsonError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

export function jsonSuccess(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function roomResponse(room: RoomState, token?: string | null): Response {
  const viewer = findPlayerByToken(room, token);
  const payload: PublicRoomState = sanitizeRoomForViewer(room, viewer);
  return jsonSuccess(payload);
}
