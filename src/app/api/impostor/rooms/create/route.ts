import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createJoinCode, buildRoomResponse, type ImpostorRoomPlayerRow, type ImpostorRoomRow } from "@/lib/impostor-room";
import { invalidateImpostorInvitePreviews } from "@/lib/impostor-invite";
import { getServiceSupabase } from "@/lib/supabase-server";
import { HintDifficulty } from "@/lib/types";

const HINT_DIFFICULTIES: HintDifficulty[] = ["easy", "normal", "hard", "difficult"];

export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase server configuration is missing." }, { status: 500 });
  }

  try {
    const body = await request.json();
    const playerName = typeof body?.playerName === "string" ? body.playerName.trim() : "";
    const roomName = typeof body?.roomName === "string" ? body.roomName.trim() : "";
    const isPublic = typeof body?.isPublic === "boolean" ? body.isPublic : true;
    const hideHint = Boolean(body?.hideHint);
    const impostorCount =
      typeof body?.impostorCount === "number" && Number.isFinite(body.impostorCount)
        ? Math.max(1, Math.min(3, Math.trunc(body.impostorCount)))
        : 1;
    const maxPlayers =
      typeof body?.maxPlayers === "number" && Number.isFinite(body.maxPlayers)
        ? Math.max(3, Math.min(20, Math.trunc(body.maxPlayers)))
        : 10;
    const hintDifficulty = HINT_DIFFICULTIES.includes(body?.hintDifficulty)
      ? (body.hintDifficulty as HintDifficulty)
      : "normal";

    if (!playerName) {
      return NextResponse.json({ error: "Host player name is required." }, { status: 400 });
    }

    if (!roomName) {
      return NextResponse.json({ error: "Room name is required." }, { status: 400 });
    }

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const joinCode = createJoinCode();
      const hostPlayerToken = randomUUID();

      const roomInsert = await supabase
        .from("impostor_rooms")
        .insert({
          join_code: joinCode,
          room_name: roomName,
          max_players: maxPlayers,
          is_public: isPublic,
          status: "waiting",
          phase: "lobby",
          host_player_token: hostPlayerToken,
          hide_hint: hideHint,
          impostor_count: impostorCount,
          hint_difficulty: hintDifficulty,
          round_awarded: false,
        })
        .select("*")
        .single<ImpostorRoomRow>();

      if (roomInsert.error) {
        if (roomInsert.error.code === "23505") {
          continue;
        }

        throw roomInsert.error;
      }

      const playerInsert = await supabase
        .from("impostor_room_players")
        .insert({
          room_id: roomInsert.data.id,
          player_name: playerName,
          player_token: hostPlayerToken,
          is_host: true,
          ready_for_next_round: false,
        })
        .select("*")
        .single<ImpostorRoomPlayerRow>();

      if (playerInsert.error) {
        await supabase.from("impostor_rooms").delete().eq("id", roomInsert.data.id);
        throw playerInsert.error;
      }

      invalidateImpostorInvitePreviews();

      return NextResponse.json(buildRoomResponse(roomInsert.data, playerInsert.data));
    }

    return NextResponse.json({ error: "Could not generate a unique join code." }, { status: 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create room.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
