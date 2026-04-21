import { joinRoom } from "@/lib/game/engine";
import { jsonError, jsonSuccess } from "@/lib/server/api";
import { getRoom, saveRoom } from "@/lib/server/room-store";

type JoinRequest = {
  name?: string;
};

type RouteParams = {
  params: Promise<{
    roomCode: string;
  }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const body = (await request.json().catch(() => null)) as JoinRequest | null;
  const name = body?.name?.trim();
  const { roomCode } = await params;

  if (!name) {
    return jsonError("Bitte gib zuerst deinen Namen ein.");
  }

  try {
    const room = await getRoom(roomCode.toUpperCase());
    if (!room) {
      return jsonError("Raum nicht gefunden.", 404);
    }

    const { token, side } = joinRoom(room, name);
    await saveRoom(room);

    return jsonSuccess({
      roomCode: room.roomCode,
      token,
      side,
      roomPath: `/game/${room.roomCode}`,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Beitritt fehlgeschlagen.",
      400,
    );
  }
}
