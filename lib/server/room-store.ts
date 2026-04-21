import type { RoomState } from "@/lib/game/types";
import { getEnv } from "@/lib/server/env";

type RoomRow = {
  room_code: string;
  state: RoomState;
  updated_at: string;
};

// Removed incorrect wrapper types since raw PostgREST returns arrays directly

function getHeaders() {
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

function roomsEndpoint(query?: string): string {
  const supabaseUrl = getEnv("SUPABASE_URL").replace(/\/$/, "");
  const suffix = query ? `?${query}` : "";
  const url = `${supabaseUrl}/rest/v1/rooms${suffix}`;
  return url;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as T | null;

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "message" in payload
        ? String((payload as { message?: string }).message)
        : `Supabase Fehler (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

export async function getRoom(roomCode: string): Promise<RoomState | null> {
  const url = roomsEndpoint(`select=state&room_code=eq.${encodeURIComponent(roomCode)}&limit=1`);
  const response = await fetch(url, {
    headers: getHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[Supabase GET Error] ${response.status}: ${text}`);
  }

  const payload = await parseResponse<{ state: RoomState }[]>(response);
  const room = payload[0]?.state ?? null;

  if (!room) {
    console.warn(`[Supabase GET] Raum ${roomCode} nicht gefunden. URL: ${url}`);
  }

  return room;
}

export async function createRoomRecord(room: RoomState): Promise<void> {
  const url = roomsEndpoint();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...getHeaders(),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      room_code: room.roomCode,
      state: room,
      updated_at: room.updatedAt,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[Supabase POST Error] ${response.status}: ${text}`);
    throw new Error(text || "Raum konnte nicht erstellt werden.");
  }

  console.log(`[Supabase POST Success] Raum ${room.roomCode} erstellt.`);
}

export async function saveRoom(room: RoomState): Promise<void> {
  const response = await fetch(
    roomsEndpoint(`room_code=eq.${encodeURIComponent(room.roomCode)}`),
    {
      method: "PATCH",
      headers: {
        ...getHeaders(),
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        state: room,
        updated_at: room.updatedAt,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Raum konnte nicht gespeichert werden.");
  }
}

export async function cleanupExpiredRooms(maxAgeHours = 48): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();
  const response = await fetch(
    roomsEndpoint(`updated_at=lt.${encodeURIComponent(cutoff)}&select=room_code`),
    {
      headers: getHeaders(),
      cache: "no-store",
    },
  );

  const rows = await parseResponse<RoomRow[]>(response);

  if (rows.length === 0) {
    return 0;
  }

  const deleteResponse = await fetch(
    roomsEndpoint(`updated_at=lt.${encodeURIComponent(cutoff)}`),
    {
      method: "DELETE",
      headers: {
        ...getHeaders(),
        Prefer: "return=minimal",
      },
    },
  );

  if (!deleteResponse.ok) {
    const text = await deleteResponse.text();
    throw new Error(text || "Alte Raeume konnten nicht geloescht werden.");
  }

  return rows.length;
}
