import { NextRequest, NextResponse } from "next/server";
import { type ImpostorRoomRow } from "@/lib/impostor-room";
import { getServiceSupabase } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase server configuration is missing." }, { status: 500 });
  }

  try {
    const body = await request.json();
    const joinCode = typeof body?.joinCode === "string" ? body.joinCode.trim().toUpperCase() : "";
    const playerToken = typeof body?.playerToken === "string" ? body.playerToken.trim() : "";

    if (!joinCode || !playerToken) {
      return NextResponse.json({ error: "Join code and host token are required." }, { status: 400 });
    }

    const roomResult = await supabase
      .from("impostor_rooms")
      .select("*")
      .eq("join_code", joinCode)
      .single<ImpostorRoomRow>();

    if (roomResult.error || !roomResult.data) {
      return NextResponse.json({ error: "Room code not found." }, { status: 404 });
    }

    if (roomResult.data.host_player_token !== playerToken) {
      return NextResponse.json({ error: "Only the host can open voting." }, { status: 403 });
    }

    const updateResult = await supabase
      .from("impostor_rooms")
      .update({ phase: "voting" })
      .eq("id", roomResult.data.id)
      .select("*")
      .single<ImpostorRoomRow>();

    if (updateResult.error) {
      throw updateResult.error;
    }

    return NextResponse.json({ success: true, room: updateResult.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to open voting.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
