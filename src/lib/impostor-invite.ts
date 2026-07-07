import { mapRoomRow, type ImpostorRoomPlayerRow, type ImpostorRoomRow } from "@/lib/impostor-room";
import { getServiceSupabase } from "@/lib/supabase-server";

export interface ImpostorInviteDetails {
  joinCode: string;
  roomName: string;
  inviterName: string;
}

export async function getImpostorInviteDetails(joinCode: string) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return null;
  }

  const safeJoinCode = joinCode.trim().toUpperCase();
  if (!safeJoinCode) {
    return null;
  }

  const roomResult = await supabase
    .from("impostor_rooms")
    .select("*")
    .eq("join_code", safeJoinCode)
    .single<ImpostorRoomRow>();

  if (roomResult.error || !roomResult.data) {
    return null;
  }

  const playersResult = await supabase
    .from("impostor_room_players")
    .select("*")
    .eq("room_id", roomResult.data.id)
    .returns<ImpostorRoomPlayerRow[]>();

  if (playersResult.error) {
    return null;
  }

  const players = playersResult.data ?? [];
  const room = mapRoomRow(roomResult.data);
  const currentHost = players.find(
    (player) => player.is_host && player.player_token === room.hostPlayerToken,
  );
  const inviterName = currentHost?.player_name ?? players[0]?.player_name ?? "A friend";

  return {
    joinCode: safeJoinCode,
    roomName: room.roomName,
    inviterName,
  } satisfies ImpostorInviteDetails;
}