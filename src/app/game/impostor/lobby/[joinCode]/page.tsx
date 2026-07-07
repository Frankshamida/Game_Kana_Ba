"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, Copy, Link2, Loader2, Radio, Users } from "lucide-react";
import { AnimatedBackground } from "@/components/game/animated-background";
import { ExitGameModal } from "@/components/game/exit-game-modal";
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
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [readyLoading, setReadyLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playerToken = useMemo(() => {
    if (typeof window === "undefined") return "";

    const raw = sessionStorage.getItem("remoteImpostorSession");
    if (!raw) return "";

    try {
      const parsed = JSON.parse(raw) as RemoteImpostorSession;
      if (!parsed.playerToken || parsed.roomCode.toUpperCase() !== joinCode) {
        return "";
      }

      return parsed.playerToken;
    } catch {
      return "";
    }
  }, [joinCode]);

  const currentPlayer = useMemo(
    () => players.find((player) => player.playerToken === playerToken) ?? null,
    [playerToken, players],
  );

  const exitDescription = useMemo(() => {
    const remainingPlayers = players.filter(
      (player) => player.playerToken !== playerToken,
    );

    if (remainingPlayers.length === 0) {
      return "If you leave now, the room will be deleted automatically because no players will remain.";
    }

    if (currentPlayer?.isHost) {
      return `If you leave now, ${remainingPlayers[0].playerName} will become the new host.`;
    }

    return "If you leave now, the room will continue for the remaining players.";
  }, [currentPlayer?.isHost, playerToken, players]);

  const isHost = currentPlayer?.isHost ?? false;
  const readyCount = players.filter(
    (player) => player.readyForNextRound,
  ).length;
  const allReady = players.length > 0 && readyCount === players.length;
  const inviteLabel = currentPlayer?.playerName ?? "A friend";

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
    if (!playerToken) {
      router.replace("/game/impostor");
    }
  }, [playerToken, router]);

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
        cache: "no-store",
        body: JSON.stringify({ joinCode, playerToken }),
      });

      const body = await response
        .json()
        .catch(() => ({ error: "Failed to start room." }));

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to start room.");
      }

      await refreshRoom();
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

  const copyInviteLink = async () => {
    if (!room || typeof window === "undefined") return;

    try {
      const inviteUrl = new URL(
        `/game/impostor/invite/${joinCode}`,
        window.location.origin,
      );
      inviteUrl.searchParams.set("joinCode", joinCode);
      inviteUrl.searchParams.set("roomName", room.roomName);
      inviteUrl.searchParams.set("invitedBy", inviteLabel);

      await navigator.clipboard.writeText(inviteUrl.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore clipboard failures.
    }
  };

  const setReadyForNextRound = async (ready: boolean) => {
    setReadyLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/impostor/rooms/ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ joinCode, playerToken, ready }),
      });

      const body = await response
        .json()
        .catch(() => ({ error: "Failed to update ready state." }));

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to update ready state.");
      }

      await refreshRoom();
    } catch (readyError) {
      setError(
        readyError instanceof Error
          ? readyError.message
          : "Failed to update ready state.",
      );
    } finally {
      setReadyLoading(false);
    }
  };

  const leaveRoomAndNavigate = async (path: string) => {
    if (!playerToken) {
      router.push(path);
      return;
    }

    try {
      await fetch("/api/impostor/rooms/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ joinCode, playerToken }),
      });
    } catch {
      // Allow navigation even if leave request fails.
    } finally {
      sessionStorage.removeItem("remoteImpostorSession");
      router.push(path);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8">
      <AnimatedBackground />
      <div className="container mx-auto max-w-3xl">
        <Card className="space-y-5 border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur dark:border-slate-700/80 dark:bg-slate-950/70">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(16rem,18rem)]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Remote Lobby
              </p>
              <h1 className="font-display text-4xl font-extrabold">
                {room?.roomName ?? "Impostor Room"}
              </h1>
              {room?.isPublic ? (
                <p className="mt-2 inline-flex items-center rounded-full border border-emerald-300/70 bg-emerald-100/80 px-3 py-1 text-sm font-bold text-emerald-900 shadow-sm dark:border-emerald-800/70 dark:bg-emerald-950/45 dark:text-emerald-100">
                  Public Room
                </p>
              ) : (
                <p className="mt-2 inline-flex items-center rounded-full border border-cyan-300/70 bg-cyan-100/80 px-4 py-1 text-lg font-black tracking-[0.25em] text-cyan-900 shadow-sm dark:border-cyan-800/70 dark:bg-cyan-950/45 dark:text-cyan-100">
                  {joinCode}
                </p>
              )}
              <p className="mt-2 text-muted-foreground">
                Invite friends, then wait for the host to start the game.
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Players: {players.length}/{room?.maxPlayers ?? 20}
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-200/80 bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-4 shadow-[0_14px_30px_rgba(8,145,178,0.12)] dark:border-cyan-900/40 dark:from-cyan-950/45 dark:via-slate-950 dark:to-blue-950/45">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-200">
                  <Link2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-800 dark:text-cyan-200">
                    Invite Players
                  </p>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                    Share a link that opens the join screen with the room name
                    ready to go.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="lg"
                className="mt-4 w-full shadow-[0_12px_28px_rgba(14,165,233,0.28)]"
                onClick={() => void copyInviteLink()}
                disabled={!room}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" /> Invite Link Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" /> Copy Invite Link
                  </>
                )}
              </Button>
              <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                {room?.isPublic
                  ? "Public rooms still use the invite link so guests land in the right place."
                  : "Private rooms need the invite link so guests can join with the code automatically."}
              </p>
            </div>
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
                      <div className="flex items-center gap-2">
                        {room?.status === "finished" && (
                          <span
                            className={`rounded-md px-2 py-1 text-xs font-bold ${
                              player.readyForNextRound
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
                                : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            }`}
                          >
                            {player.readyForNextRound ? "Ready" : "Not Ready"}
                          </span>
                        )}
                        {player.isHost && (
                          <span className="rounded-md bg-sky-100 px-2 py-1 text-xs font-bold text-sky-800 dark:bg-sky-950/60 dark:text-sky-200">
                            Host
                          </span>
                        )}
                      </div>
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
                    : `Minimum players to start: 3. Current players: ${players.length}/${room?.maxPlayers ?? 20}.`}
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
            {room?.status === "finished" && currentPlayer && (
              <Button
                size="lg"
                variant={
                  currentPlayer.readyForNextRound ? "secondary" : "default"
                }
                onClick={() =>
                  setReadyForNextRound(!currentPlayer.readyForNextRound)
                }
                disabled={readyLoading || loading}
              >
                {readyLoading
                  ? "Updating..."
                  : currentPlayer.readyForNextRound
                    ? "Marked Ready"
                    : "Ready For Next Round"}
              </Button>
            )}
            {isHost ? (
              <Button
                size="lg"
                onClick={startRoom}
                disabled={
                  starting ||
                  readyLoading ||
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
              onClick={() => setShowExitModal(true)}
            >
              Back
            </Button>
          </div>
        </Card>
      </div>

      <ExitGameModal
        open={showExitModal}
        title="Would you like to leave this room?"
        description={exitDescription}
        confirmLabel="Leave Room"
        cancelLabel="Cancel"
        onConfirm={() => void leaveRoomAndNavigate("/game/impostor/join")}
        onCancel={() => setShowExitModal(false)}
      />
    </main>
  );
}
