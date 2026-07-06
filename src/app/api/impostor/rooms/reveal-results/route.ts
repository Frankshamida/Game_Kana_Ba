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
      return NextResponse.json({ error: "Only the host can reveal results." }, { status: 403 });
    }

    const playersResult = await supabase
      .from("impostor_room_players")
      .select("*")
      .eq("room_id", roomResult.data.id)
      .returns<ImpostorRoomPlayerRow[]>();

    if (playersResult.error) {
      throw playersResult.error;
    }

    const players = playersResult.data ?? [];
    const voteCount = new Map<string, number>();
    for (const player of players) {
      if (!player.vote_target_player_id) continue;
      voteCount.set(
        player.vote_target_player_id,
        (voteCount.get(player.vote_target_player_id) ?? 0) + 1,
      );
    }

    const topVotes = Array.from(voteCount.entries()).sort((a, b) => b[1] - a[1]);
    const maxVotes = topVotes[0]?.[1] ?? 0;
    const topPlayerIds = topVotes.filter(([, count]) => count === maxVotes).map(([id]) => id);
    const hasMajority = maxVotes > Math.floor(players.length / 2);
    const majorityHitImpostor = hasMajority && players.some(
      (player) => topPlayerIds.includes(player.id) && player.is_impostor,
    );

    if (!roomResult.data.round_awarded) {
      for (const player of players) {
        const shouldAddPoint = majorityHitImpostor ? !player.is_impostor : Boolean(player.is_impostor);
        if (!shouldAddPoint) continue;

        const updateScoreResult = await supabase
          .from("impostor_room_players")
          .update({ score: player.score + 1 })
          .eq("id", player.id);

        if (updateScoreResult.error) {
          throw updateScoreResult.error;
        }
      }
    }

    for (const player of players) {
      const resetReadyResult = await supabase
        .from("impostor_room_players")
        .update({ ready_for_next_round: false })
        .eq("id", player.id);

      if (resetReadyResult.error) {
        throw resetReadyResult.error;
      }
    }

    const roomUpdate = await supabase
      .from("impostor_rooms")
      .update({ status: "finished", phase: "results", round_awarded: true })
      .eq("id", roomResult.data.id)
      .select("*")
      .single<ImpostorRoomRow>();

    if (roomUpdate.error) {
      throw roomUpdate.error;
    }

    return NextResponse.json({
      success: true,
      majorityHitImpostor,
      room: roomUpdate.data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reveal results.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
