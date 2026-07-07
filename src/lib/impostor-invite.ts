import {
  mapRoomRow,
  type ImpostorRoomPlayerRow,
  type ImpostorRoomRow,
} from "@/lib/impostor-room";
import { revalidateTag, unstable_cache } from "next/cache";
import { getServiceSupabase } from "@/lib/supabase-server";

const INVITE_PREVIEW_TAG = "impostor-invite-preview";

export interface ImpostorInviteDetails {
  joinCode: string;
  roomName: string;
  inviterName: string;
  playerCount: number;
  maxPlayers: number;
  isPublic: boolean;
  roomStatus: ImpostorRoomRow["status"];
  roomPhase: ImpostorRoomRow["phase"];
  isJoinable: boolean;
}

async function fetchImpostorInviteDetails(joinCode: string) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return null;
  }

  const roomResult = await supabase
    .from("impostor_rooms")
    .select("*")
    .eq("join_code", joinCode)
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
  const inviterName =
    currentHost?.player_name ?? players[0]?.player_name ?? "A friend";
  const isJoinable = room.status === "waiting" && room.phase === "lobby";

  return {
    joinCode,
    roomName: room.roomName,
    inviterName,
    playerCount: players.length,
    maxPlayers: room.maxPlayers,
    isPublic: room.isPublic,
    roomStatus: room.status,
    roomPhase: room.phase,
    isJoinable,
  } satisfies ImpostorInviteDetails;
}

const cachedImpostorInviteDetails = unstable_cache(
  async (joinCode: string) => fetchImpostorInviteDetails(joinCode),
  ["impostor-invite-details"],
  {
    revalidate: 60,
    tags: [INVITE_PREVIEW_TAG],
  },
);

export async function getImpostorInviteDetails(joinCode: string) {
  const safeJoinCode = joinCode.trim().toUpperCase();
  if (!safeJoinCode) {
    return null;
  }

  return cachedImpostorInviteDetails(safeJoinCode);
}

export function invalidateImpostorInvitePreviews() {
  revalidateTag(INVITE_PREVIEW_TAG, "max");
}