import { makePlacementFromInput, placeFleet } from "@/lib/game/engine";
import type { Orientation, Point } from "@/lib/game/types";
import { jsonError, roomResponse } from "@/lib/server/api";
import { getRoom, saveRoom } from "@/lib/server/room-store";

type PlacementInput = {
  shipKey: string;
  orientation: Orientation;
  start: Point;
};

type PlaceRequest = {
  token?: string;
  placements?: PlacementInput[];
};

type RouteParams = {
  params: Promise<{
    roomCode: string;
  }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const body = (await request.json().catch(() => null)) as PlaceRequest | null;
  const token = body?.token?.trim();
  const inputs = body?.placements ?? [];
  const { roomCode } = await params;

  if (!token) {
    return jsonError("Spieler-Token fehlt.");
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

    const placements = inputs.map((placement) =>
      makePlacementFromInput(placement.shipKey, placement.orientation, placement.start),
    );
    placeFleet(room, side, placements);
    await saveRoom(room);

    return roomResponse(room, token);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Die Flotte konnte nicht gespeichert werden.",
      400,
    );
  }
}
