import { ensureRoomFresh, findPlayerByToken } from "@/lib/game/engine";
import { jsonError, roomResponse } from "@/lib/server/api";
import { getRoom, saveRoom } from "@/lib/server/room-store";

type RouteParams = {
  params: Promise<{
    roomCode: string;
  }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { roomCode } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  try {
    const room = await getRoom(roomCode.toUpperCase());

    if (!room) {
      return jsonError("Raum nicht gefunden.", 404);
    }

    const freshRoom = ensureRoomFresh(room);
    const viewer = findPlayerByToken(freshRoom, token);

    if (viewer && freshRoom.phase !== room.phase) {
      await saveRoom(freshRoom);
    }

    return roomResponse(freshRoom, token);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Raum konnte nicht geladen werden.",
      500,
    );
  }
}
