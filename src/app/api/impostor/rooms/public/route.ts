import { NextResponse } from "next/server";
import { mapRoomRow, type ImpostorRoomRow } from "@/lib/impostor-room";
import { invalidateImpostorInvitePreviews } from "@/lib/impostor-invite";
import { getServiceSupabase } from "@/lib/supabase-server";

interface PublicRoomPlayerRow {
  id: string;
  room_id: string;
  player_name: string;
  player_token: string;
  is_host: boolean;
  created_at: string;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase server configuration is missing." },
      { status: 500 },
    );
  }

  const roomsResult = await supabase
    .from("impostor_rooms")
    .select("*")
    .in("status", ["waiting", "started"])
    .order("created_at", { ascending: false })
    .limit(30)
    .returns<ImpostorRoomRow[]>();

  if (roomsResult.error) {
    return NextResponse.json({ error: roomsResult.error.message }, { status: 500 });
  }

  const rooms = roomsResult.data ?? [];
  if (rooms.length === 0) {
    return NextResponse.json({ rooms: [] });
  }

  const roomIds = rooms.map((room) => room.id);
  const playersResult = await supabase
    .from("impostor_room_players")
    .select("id, room_id, player_name, player_token, is_host, created_at")
    .in("room_id", roomIds)
    .order("created_at", { ascending: true })
    .returns<PublicRoomPlayerRow[]>();

  if (playersResult.error) {
    return NextResponse.json({ error: playersResult.error.message }, { status: 500 });
  }

  const playersByRoom = new Map<string, PublicRoomPlayerRow[]>();
  for (const player of playersResult.data ?? []) {
    const list = playersByRoom.get(player.room_id) ?? [];
    list.push(player);
    playersByRoom.set(player.room_id, list);
  }

  const payload: Array<{
    room: ReturnType<typeof mapRoomRow>;
    hostName: string;
    playerCount: number;
  }> = [];
  let didMutateRoom = false;

  for (const room of rooms) {
    const roomPlayers = playersByRoom.get(room.id) ?? [];

    if (roomPlayers.length === 0) {
      await supabase.from("impostor_rooms").delete().eq("id", room.id);
      didMutateRoom = true;
      continue;
    }

    const currentHost = roomPlayers.find(
      (player) =>
        player.is_host && player.player_token === room.host_player_token,
    );

    let effectiveRoom = room;
    let effectiveHostName =
      currentHost?.player_name ?? roomPlayers[0]?.player_name ?? "Host";

    if (!currentHost) {
      const newHost = roomPlayers[0];

      await supabase
        .from("impostor_room_players")
        .update({ is_host: false })
        .eq("room_id", room.id);

      await supabase
        .from("impostor_room_players")
        .update({ is_host: true })
        .eq("id", newHost.id);

      const roomUpdateResult = await supabase
        .from("impostor_rooms")
        .update({ host_player_token: newHost.player_token })
        .eq("id", room.id)
        .select("*")
        .single<ImpostorRoomRow>();

      if (!roomUpdateResult.error && roomUpdateResult.data) {
        effectiveRoom = roomUpdateResult.data;
      }

      effectiveHostName = newHost.player_name;
      didMutateRoom = true;
    }

    payload.push({
      room: mapRoomRow(effectiveRoom),
      hostName: effectiveHostName,
      playerCount: roomPlayers.length,
    });
  }

  if (didMutateRoom) {
    invalidateImpostorInvitePreviews();
  }

  return NextResponse.json(
    { rooms: payload },
    {
      headers: {
        "Cache-Control": "public, max-age=8, stale-while-revalidate=30",
      },
    },
  );
}
