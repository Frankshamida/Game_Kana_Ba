import { NextRequest, NextResponse } from "next/server";
import { type ImpostorRoomPlayerRow, type ImpostorRoomRow } from "@/lib/impostor-room";
import { getServiceSupabase } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase server configuration is missing." },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const joinCode =
      typeof body?.joinCode === "string"
        ? body.joinCode.trim().toUpperCase()
        : "";
    const playerToken =
      typeof body?.playerToken === "string" ? body.playerToken.trim() : "";

    if (!joinCode || !playerToken) {
      return NextResponse.json(
        { error: "Join code and player token are required." },
        { status: 400 },
      );
    }

    const roomResult = await supabase
      .from("impostor_rooms")
      .select("*")
      .eq("join_code", joinCode)
      .single<ImpostorRoomRow>();

    if (roomResult.error || !roomResult.data) {
      return NextResponse.json({ success: true, roomDeleted: true });
    }

    const playersResult = await supabase
      .from("impostor_room_players")
      .select("*")
      .eq("room_id", roomResult.data.id)
      .order("created_at", { ascending: true })
      .returns<ImpostorRoomPlayerRow[]>();

    if (playersResult.error) {
      throw playersResult.error;
    }

    const players = playersResult.data ?? [];
    const leavingPlayer = players.find(
      (player) => player.player_token === playerToken,
    );

    if (!leavingPlayer) {
      return NextResponse.json({ success: true, roomDeleted: false });
    }

    const deletePlayerResult = await supabase
      .from("impostor_room_players")
      .delete()
      .eq("id", leavingPlayer.id);

    if (deletePlayerResult.error) {
      throw deletePlayerResult.error;
    }

    const remainingPlayers = players.filter(
      (player) => player.id !== leavingPlayer.id,
    );

    if (remainingPlayers.length === 0) {
      const deleteRoomResult = await supabase
        .from("impostor_rooms")
        .delete()
        .eq("id", roomResult.data.id);

      if (deleteRoomResult.error) {
        throw deleteRoomResult.error;
      }

      return NextResponse.json({ success: true, roomDeleted: true });
    }

    const wasHost =
      leavingPlayer.is_host ||
      roomResult.data.host_player_token === leavingPlayer.player_token;

    if (wasHost) {
      const nextHost = remainingPlayers[0];

      const clearHostResult = await supabase
        .from("impostor_room_players")
        .update({ is_host: false })
        .eq("room_id", roomResult.data.id);

      if (clearHostResult.error) {
        throw clearHostResult.error;
      }

      const setHostResult = await supabase
        .from("impostor_room_players")
        .update({ is_host: true })
        .eq("id", nextHost.id);

      if (setHostResult.error) {
        throw setHostResult.error;
      }

      const updateRoomResult = await supabase
        .from("impostor_rooms")
        .update({ host_player_token: nextHost.player_token })
        .eq("id", roomResult.data.id);

      if (updateRoomResult.error) {
        throw updateRoomResult.error;
      }

      return NextResponse.json({
        success: true,
        roomDeleted: false,
        hostChanged: true,
        newHostName: nextHost.player_name,
      });
    }

    return NextResponse.json({ success: true, roomDeleted: false, hostChanged: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to leave room.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
