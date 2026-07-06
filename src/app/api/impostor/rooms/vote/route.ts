import { NextRequest, NextResponse } from "next/server";
import { type ImpostorRoomPlayerRow, type ImpostorRoomRow } from "@/lib/impostor-room";
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
    const targetPlayerId = typeof body?.targetPlayerId === "string" ? body.targetPlayerId.trim() : "";

    if (!joinCode || !playerToken || !targetPlayerId) {
      return NextResponse.json({ error: "Join code, player token, and vote target are required." }, { status: 400 });
    }

    const roomResult = await supabase
      .from("impostor_rooms")
      .select("*")
      .eq("join_code", joinCode)
      .single<ImpostorRoomRow>();

    if (roomResult.error || !roomResult.data) {
      return NextResponse.json({ error: "Room code not found." }, { status: 404 });
    }

    if (roomResult.data.phase !== "voting") {
      return NextResponse.json({ error: "Voting is not open yet." }, { status: 400 });
    }

    const playerResult = await supabase
      .from("impostor_room_players")
      .select("*")
      .eq("room_id", roomResult.data.id)
      .eq("player_token", playerToken)
      .single<ImpostorRoomPlayerRow>();

    if (playerResult.error || !playerResult.data) {
      return NextResponse.json({ error: "Player not found in room." }, { status: 404 });
    }

    const targetResult = await supabase
      .from("impostor_room_players")
      .select("id")
      .eq("room_id", roomResult.data.id)
      .eq("id", targetPlayerId)
      .single();

    if (targetResult.error || !targetResult.data) {
      return NextResponse.json({ error: "Vote target was not found in this room." }, { status: 404 });
    }

    const updateResult = await supabase
      .from("impostor_room_players")
      .update({ vote_target_player_id: targetPlayerId })
      .eq("id", playerResult.data.id)
      .select("*")
      .single<ImpostorRoomPlayerRow>();

    if (updateResult.error) {
      throw updateResult.error;
    }

    return NextResponse.json({ success: true, player: updateResult.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit vote.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
