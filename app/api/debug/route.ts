import { getRoom } from "@/lib/server/room-store";
import { getEnv } from "@/lib/server/env";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  
  if (!code) {
    return Response.json({ error: "No code provided" });
  }

  try {
    const supabaseUrl = getEnv("SUPABASE_URL");
    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    
    // Test direct fetch
    const fetchUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/rooms?select=room_code&room_code=eq.${encodeURIComponent(code)}&limit=1`;
    const response = await fetch(fetchUrl, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    const status = response.status;
    const text = await response.text();
    
    const roomStoreResult = await getRoom(code);

    return Response.json({
      debug: true,
      code,
      url: fetchUrl,
      keyLength: serviceRoleKey.length,
      directFetch: {
        status,
        text,
      },
      roomStoreResult: roomStoreResult ? "Found" : "Null",
    });
  } catch (err) {
    return Response.json({
      debug: true,
      error: err instanceof Error ? err.message : String(err)
    });
  }
}
