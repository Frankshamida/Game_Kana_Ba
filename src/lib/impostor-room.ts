import {
  CreateImpostorRoomResponse,
  ImpostorRoom,
  ImpostorRoomPlayer,
  ImpostorRoomSettings,
  JoinImpostorRoomResponse,
} from "@/lib/types";

export interface ImpostorRoomRow {
  id: string;
  created_at: string;
  join_code: string;
  room_name?: string | null;
  max_players?: number | null;
  is_public?: boolean | null;
  status: "waiting" | "started" | "finished";
  phase: "lobby" | "role_reveal" | "voting" | "results";
  host_player_token: string;
  hide_hint: boolean;
  impostor_count: number;
  hint_difficulty: ImpostorRoomSettings["hintDifficulty"];
  language: ImpostorRoom["language"];
  secret_word: string | null;
  hint: string | null;
  round_awarded: boolean;
}

export interface ImpostorRoomPlayerRow {
  id: string;
  room_id: string;
  created_at: string;
  player_name: string;
  player_token: string;
  is_host: boolean;
  is_impostor: boolean | null;
  has_seen_role: boolean;
  ready_for_next_round: boolean;
  score: number;
  vote_target_player_id: string | null;
}

export function createJoinCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export function mapRoomRow(row: ImpostorRoomRow): ImpostorRoom {
  const safeMaxPlayers =
    typeof row.max_players === "number" && Number.isFinite(row.max_players)
      ? Math.max(3, Math.min(20, Math.trunc(row.max_players)))
      : 20;

  return {
    id: row.id,
    joinCode: row.join_code,
    roomName: (row.room_name ?? "Impostor Room").trim() || "Impostor Room",
    maxPlayers: safeMaxPlayers,
    isPublic: row.is_public ?? true,
    status: row.status,
    phase: row.phase,
    hostPlayerToken: row.host_player_token,
    createdAt: row.created_at,
    language: row.language,
    secretWord: row.secret_word,
    hint: row.hint,
    roundAwarded: row.round_awarded,
    settings: {
      hideHint: row.hide_hint,
      impostorCount: row.impostor_count,
      hintDifficulty: row.hint_difficulty,
    },
  };
}

export function mapPlayerRow(row: ImpostorRoomPlayerRow): ImpostorRoomPlayer {
  return {
    id: row.id,
    roomId: row.room_id,
    playerName: row.player_name,
    playerToken: row.player_token,
    isHost: row.is_host,
    isImpostor: row.is_impostor,
    hasSeenRole: row.has_seen_role,
    readyForNextRound: row.ready_for_next_round,
    score: row.score,
    voteTargetPlayerId: row.vote_target_player_id,
    joinedAt: row.created_at,
  };
}

export function buildRoomResponse(
  room: ImpostorRoomRow,
  player: ImpostorRoomPlayerRow,
): CreateImpostorRoomResponse {
  return {
    room: mapRoomRow(room),
    player: mapPlayerRow(player),
  };
}

export function buildJoinResponse(
  room: ImpostorRoomRow,
  player: ImpostorRoomPlayerRow,
): JoinImpostorRoomResponse {
  return {
    room: mapRoomRow(room),
    player: mapPlayerRow(player),
  };
}
