import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildJoinResponse, mapRoomRow, type ImpostorRoomPlayerRow, type ImpostorRoomRow } from "@/lib/impostor-room";
import { getServiceSupabase } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase server configuration is missing." }, { status: 500 });
  }

  try {
    const body = await request.json();
    const playerName = typeof body?.playerName === "string" ? body.playerName.trim() : "";
    const joinCode = typeof body?.joinCode === "string" ? body.joinCode.trim().toUpperCase() : "";
    const roomId = typeof body?.roomId === "string" ? body.roomId.trim() : "";

    if (!playerName || (!joinCode && !roomId)) {
      return NextResponse.json({ error: "Player name and room code are required." }, { status: 400 });
    }

    const roomQuery = supabase.from("impostor_rooms").select("*");
    const roomResult = roomId
      ? await roomQuery.eq("id", roomId).single<ImpostorRoomRow>()
      : await roomQuery.eq("join_code", joinCode).single<ImpostorRoomRow>();

    if (roomResult.error || !roomResult.data) {
      return NextResponse.json({ error: "Room code not found." }, { status: 404 });
    }

    const room = mapRoomRow(roomResult.data);
    if (room.status !== "waiting") {
      return NextResponse.json({ error: "This room has already started." }, { status: 400 });
    }

    const playersResult = await supabase
      .from("impostor_room_players")
      .select("*")
      .eq("room_id", room.id)
      .returns<ImpostorRoomPlayerRow[]>();

    if (playersResult.error) {
      throw playersResult.error;
    }

    const existingPlayers = playersResult.data ?? [];
    if (existingPlayers.length >= room.maxPlayers) {
      return NextResponse.json({ error: "This room is already full." }, { status: 400 });
    }

    if (
      existingPlayers.some(
        (player) => player.player_name.trim().toLowerCase() === playerName.toLowerCase(),
      )
    ) {
      return NextResponse.json({ error: "That player name is already in the room." }, { status: 400 });
    }

    const playerInsert = await supabase
      .from("impostor_room_players")
      .insert({
        room_id: room.id,
        player_name: playerName,
        player_token: randomUUID(),
        is_host: false,
        ready_for_next_round: false,
      })
      .select("*")
      .single<ImpostorRoomPlayerRow>();

    if (playerInsert.error) {
      throw playerInsert.error;
    }

    return NextResponse.json(buildJoinResponse(roomResult.data, playerInsert.data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to join room.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
