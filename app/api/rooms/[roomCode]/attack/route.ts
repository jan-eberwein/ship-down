import { attackCoordinate } from "@/lib/game/engine";
import { jsonError, roomResponse } from "@/lib/server/api";
import { getRoom, saveRoom } from "@/lib/server/room-store";

type AttackRequest = {
  token?: string;
  coordinate?: string;
};

type RouteParams = {
  params: Promise<{
    roomCode: string;
  }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const body = (await request.json().catch(() => null)) as AttackRequest | null;
  const token = body?.token?.trim();
  const coordinate = body?.coordinate?.trim();
  const { roomCode } = await params;

  if (!token || !coordinate) {
    return jsonError("Feld oder Spieler-Token fehlt.");
  }

  try {
    const room = await getRoom(roomCode.toUpperCase());
    if (!room) {
      return jsonError("Raum nicht gefunden.", 404);
    }

    const side =
      room.players.A?.token === token ? "A" : room.players.B?.token === token ? "B" : undefined;

    if (!side) {
      return jsonError("Dieser Zugang gehoert nicht zu diesem Raum.", 403);
    }

    attackCoordinate(room, side, coordinate);
    await saveRoom(room);

    return roomResponse(room, token);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Der Angriff konnte nicht ausgefuehrt werden.",
      400,
    );
  }
}
