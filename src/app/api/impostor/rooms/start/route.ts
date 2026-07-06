import { NextRequest, NextResponse } from "next/server";
import { createImpostorRound } from "@/app/game/impostor/actions";
import { type ImpostorRoomPlayerRow, type ImpostorRoomRow, mapPlayerRow, mapRoomRow } from "@/lib/impostor-room";
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

    const room = mapRoomRow(roomResult.data);
    if (room.hostPlayerToken !== playerToken) {
      return NextResponse.json({ error: "Only the host can start this game." }, { status: 403 });
    }

    if (room.status !== "waiting" && room.status !== "finished") {
      return NextResponse.json({ error: "This room is already in progress." }, { status: 400 });
    }

    const playersResult = await supabase
      .from("impostor_room_players")
      .select("*")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true })
      .returns<ImpostorRoomPlayerRow[]>();

    if (playersResult.error) {
      throw playersResult.error;
    }

    const playerRows = playersResult.data ?? [];
    if (playerRows.length < 3) {
      return NextResponse.json({ error: "At least 3 players are required to start." }, { status: 400 });
    }

    if (room.status === "finished" && playerRows.some((player) => !player.ready_for_next_round)) {
      return NextResponse.json({ error: "All players must be ready before starting the next round." }, { status: 400 });
    }

    const round = await createImpostorRound(
      playerRows.map((player) => player.player_name),
      room.settings.impostorCount,
      [],
      room.settings.hintDifficulty,
    );

    const updateRoomResult = await supabase
      .from("impostor_rooms")
      .update({
        status: "started",
        phase: "role_reveal",
        language: round.language,
        secret_word: round.secretWord,
        hint: round.hint,
        round_awarded: false,
      })
      .eq("id", room.id)
      .select("*")
      .single<ImpostorRoomRow>();

    if (updateRoomResult.error) {
      throw updateRoomResult.error;
    }

    for (const player of round.players) {
      const matching = playerRows.find((row) => row.player_name === player.name);
      if (!matching) continue;

      const updatePlayerResult = await supabase
        .from("impostor_room_players")
        .update({
          is_impostor: player.isImpostor,
          has_seen_role: false,
          ready_for_next_round: false,
          vote_target_player_id: null,
        })
        .eq("id", matching.id);

      if (updatePlayerResult.error) {
        throw updatePlayerResult.error;
      }
    }

    const refreshedPlayers = await supabase
      .from("impostor_room_players")
      .select("*")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true })
      .returns<ImpostorRoomPlayerRow[]>();

    if (refreshedPlayers.error) {
      throw refreshedPlayers.error;
    }

    return NextResponse.json({
      room: mapRoomRow(updateRoomResult.data),
      players: (refreshedPlayers.data ?? []).map(mapPlayerRow),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start room.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
