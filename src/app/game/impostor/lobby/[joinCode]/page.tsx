"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Copy, Loader2, Radio, Users } from "lucide-react";
import { AnimatedBackground } from "@/components/game/animated-background";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  mapPlayerRow,
  mapRoomRow,
  type ImpostorRoomPlayerRow,
  type ImpostorRoomRow,
} from "@/lib/impostor-room";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import {
  ImpostorRoom,
  ImpostorRoomPlayer,
  RemoteImpostorSession,
} from "@/lib/types";

export default function ImpostorLobbyPage() {
  const params = useParams<{ joinCode: string }>();
  const router = useRouter();
  const joinCode = String(params?.joinCode ?? "").toUpperCase();
  const [room, setRoom] = useState<ImpostorRoom | null>(null);
  const [players, setPlayers] = useState<ImpostorRoomPlayer[]>([]);
  const [playerToken, setPlayerToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPlayer = useMemo(
    () => players.find((player) => player.playerToken === playerToken) ?? null,
    [playerToken, players],
  );

  const isHost = currentPlayer?.isHost ?? false;
  const readyCount = players.filter(
    (player) => player.readyForNextRound,
  ).length;
  const allReady = players.length > 0 && readyCount === players.length;

  const refreshRoom = async () => {
    const response = await fetch(`/api/impostor/rooms/${joinCode}`, {
      cache: "no-store",
    });
    const body = await response
      .json()
      .catch(() => ({ error: "Failed to load room." }));

    if (!response.ok) {
      throw new Error(body.error ?? "Failed to load room.");
    }

    setRoom(body.room as ImpostorRoom);
    setPlayers(body.players as ImpostorRoomPlayer[]);
  };

  useEffect(() => {
    const raw = sessionStorage.getItem("remoteImpostorSession");
    if (!raw) {
      router.replace("/game/impostor");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as RemoteImpostorSession;
      if (!parsed.playerToken || parsed.roomCode.toUpperCase() !== joinCode) {
        router.replace("/game/impostor");
        return;
      }

      setPlayerToken(parsed.playerToken);
    } catch {
      router.replace("/game/impostor");
    }
  }, [joinCode, router]);

  useEffect(() => {
    if (!playerToken) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        await refreshRoom();
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load lobby.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [playerToken]);

  useEffect(() => {
    if (!room) return;

    if (room.phase === "role_reveal" || room.phase === "voting") {
      router.replace(`/game/impostor/remote/${joinCode}`);
    }
  }, [joinCode, room, router]);

  useEffect(() => {
    if (!room) return;

    const supabase = getBrowserSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel(`impostor-room-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "impostor_rooms",
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          if (payload.new) {
            setRoom(mapRoomRow(payload.new as ImpostorRoomRow));
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "impostor_room_players",
          filter: `room_id=eq.${room.id}`,
        },
        async () => {
          try {
            await refreshRoom();
          } catch {
            // Keep current snapshot if refresh fails temporarily.
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [room]);

  const startRoom = async () => {
    setStarting(true);
    setError(null);

    try {
      const response = await fetch("/api/impostor/rooms/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode, playerToken }),
      });

      const body = await response
        .json()
        .catch(() => ({ error: "Failed to start room." }));

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to start room.");
      }

      router.replace(`/game/impostor/remote/${joinCode}`);
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Failed to start room.",
      );
    } finally {
      setStarting(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(joinCode);
    } catch {
      // Ignore clipboard failures.
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8">
      <AnimatedBackground />
      <div className="container mx-auto max-w-3xl">
        <Card className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Remote Lobby
              </p>
              <h1 className="font-display text-4xl font-extrabold">
                Join Code {joinCode}
              </h1>
              <p className="mt-2 text-muted-foreground">
                Invite friends, then wait for the host to start the game.
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={copyCode}>
              <Copy className="mr-2 h-4 w-4" /> Copy Code
            </Button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/70 bg-white/75 p-8 text-center dark:border-slate-700/80 dark:bg-slate-900/75">
              <Loader2 className="mx-auto h-6 w-6 animate-spin" />
              <p className="mt-3 font-semibold">Loading room...</p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-white/70 bg-white/75 p-4 dark:border-slate-700/80 dark:bg-slate-900/75">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  You Joined As
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
                  {currentPlayer?.playerName ?? "Unknown Player"}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {isHost
                    ? "Host controls the start of the match."
                    : "Waiting for the host to begin."}
                </p>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white/75 p-4 dark:border-slate-700/80 dark:bg-slate-900/75">
                <p className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-200">
                  <Users className="h-4 w-4" /> Players in Room
                </p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {players.map((player) => (
                    <li
                      key={player.id}
                      className="flex items-center justify-between rounded-xl border border-white/75 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700/80 dark:bg-slate-950/65 dark:text-slate-100"
                    >
                      <span>{player.playerName}</span>
                      {player.isHost && (
                        <span className="rounded-md bg-sky-100 px-2 py-1 text-xs font-bold text-sky-800 dark:bg-sky-950/60 dark:text-sky-200">
                          Host
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white/75 p-4 dark:border-slate-700/80 dark:bg-slate-900/75">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <Radio className="h-4 w-4" />
                  {room?.phase === "results"
                    ? "Round finished. Ready up for the next game."
                    : room?.status === "waiting"
                      ? "Room is live and waiting for the host."
                      : "Game is starting..."}
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {room?.phase === "results"
                    ? allReady
                      ? "Everyone is ready. The host can start the next round."
                      : `The game cannot continue yet. ${Math.max(0, players.length - readyCount)} player(s) still need to ready up.`
                    : `Minimum players to start: 3. Current players: ${players.length}.`}
                </p>
                {room?.phase === "results" && (
                  <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Ready for next round: {readyCount}/{players.length}
                  </p>
                )}
              </div>
            </>
          )}

          {error && (
            <p className="rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-800 dark:bg-red-950/55 dark:text-red-200">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            {isHost ? (
              <Button
                size="lg"
                onClick={startRoom}
                disabled={
                  starting ||
                  players.length < 3 ||
                  loading ||
                  (room?.status === "finished" && !allReady)
                }
              >
                {starting
                  ? "Starting..."
                  : room?.status === "finished"
                    ? "Start Next Round"
                    : "Start Remote Game"}
              </Button>
            ) : (
              <Button size="lg" disabled>
                Waiting For Host
              </Button>
            )}
            <Button
              size="lg"
              variant="ghost"
              onClick={() => router.push("/game/impostor")}
            >
              Back
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
