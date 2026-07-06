import { NextRequest, NextResponse } from "next/server";
import { mapPlayerRow, mapRoomRow, type ImpostorRoomPlayerRow, type ImpostorRoomRow } from "@/lib/impostor-room";
import { getServiceSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ joinCode: string }> },
) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase server configuration is missing." }, { status: 500 });
  }

  const { joinCode: rawCode } = await context.params;
  const joinCode = rawCode.trim().toUpperCase();

  const roomResult = await supabase
    .from("impostor_rooms")
    .select("*")
    .eq("join_code", joinCode)
    .single<ImpostorRoomRow>();

  if (roomResult.error || !roomResult.data) {
    return NextResponse.json({ error: "Room code not found." }, { status: 404 });
  }

  const playersResult = await supabase
    .from("impostor_room_players")
    .select("*")
    .eq("room_id", roomResult.data.id)
    .order("created_at", { ascending: true })
    .returns<ImpostorRoomPlayerRow[]>();

  if (playersResult.error) {
    return NextResponse.json({ error: playersResult.error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      room: mapRoomRow(roomResult.data),
      players: (playersResult.data ?? []).map(mapPlayerRow),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  );
}
