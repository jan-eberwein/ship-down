import type { RoomState } from "@/lib/game/types";
import { getEnv } from "@/lib/server/env";

type RoomRow = {
  room_code: string;
  state: RoomState;
  updated_at: string;
};

type SupabaseListResponse<T> = {
  data: T[] | null;
  error?: {
    message: string;
  } | null;
};

type SupabaseSingleResponse<T> = {
  data: T | null;
  error?: {
    message: string;
  } | null;
};

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
  return `${supabaseUrl}/rest/v1/rooms${suffix}`;
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
  const response = await fetch(
    roomsEndpoint(`select=state&room_code=eq.${encodeURIComponent(roomCode)}&limit=1`),
    {
      headers: getHeaders(),
      cache: "no-store",
    },
  );

  const payload = await parseResponse<SupabaseListResponse<{ state: RoomState }>>(response);
  const room = payload.data?.[0]?.state ?? null;

  if (!room) {
    console.error(`[Supabase] Raum ${roomCode} nicht gefunden oder kein Zugriff.`);
  }

  return room;
}

export async function createRoomRecord(room: RoomState): Promise<void> {
  const response = await fetch(roomsEndpoint(), {
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
    throw new Error(text || "Raum konnte nicht erstellt werden.");
  }
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

  const payload = await parseResponse<SupabaseListResponse<RoomRow>>(response);
  const rows = payload.data ?? [];

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
