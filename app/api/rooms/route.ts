import { createRoom } from "@/lib/game/engine";
import { jsonError, jsonSuccess } from "@/lib/server/api";
import { createRoomRecord } from "@/lib/server/room-store";

type CreateRoomRequest = {
  name?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CreateRoomRequest | null;
  const name = body?.name?.trim();

  if (!name) {
    return jsonError("Bitte gib zuerst deinen Namen ein.");
  }

  try {
    const { room, token, side } = createRoom(name);
    await createRoomRecord(room);

    return jsonSuccess(
      {
        roomCode: room.roomCode,
        token,
        side,
        roomPath: `/game/${room.roomCode}`,
      },
      201,
    );
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Raum konnte nicht erstellt werden.",
      500,
    );
  }
}
