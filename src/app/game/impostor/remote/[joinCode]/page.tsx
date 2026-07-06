"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  Loader2,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { AnimatedBackground } from "@/components/game/animated-background";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
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

export default function RemoteImpostorPage() {
  const params = useParams<{ joinCode: string }>();
  const router = useRouter();
  const joinCode = String(params?.joinCode ?? "").toUpperCase();
  const [room, setRoom] = useState<ImpostorRoom | null>(null);
  const [players, setPlayers] = useState<ImpostorRoomPlayer[]>([]);
  const [playerToken, setPlayerToken] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPlayer = useMemo(
    () => players.find((player) => player.playerToken === playerToken) ?? null,
    [playerToken, players],
  );

  const isHost = currentPlayer?.isHost ?? false;
  const seenCount = players.filter((player) => player.hasSeenRole).length;
  const allSeen = players.length > 0 && seenCount === players.length;
  const allVoted =
    players.length > 0 &&
    players.every((player) => Boolean(player.voteTargetPlayerId));
  const readyCount = players.filter(
    (player) => player.readyForNextRound,
  ).length;
  const allReady = players.length > 0 && readyCount === players.length;

  const voteCounts = useMemo(() => {
    const counts = Object.fromEntries(players.map((player) => [player.id, 0]));

    for (const player of players) {
      if (player.voteTargetPlayerId && player.voteTargetPlayerId in counts) {
        counts[player.voteTargetPlayerId] += 1;
      }
    }

    return counts;
  }, [players]);

  const topVoteCount = Math.max(0, ...Object.values(voteCounts));
  const topVotedPlayerIds = Object.entries(voteCounts)
    .filter(([, count]) => count === topVoteCount && count > 0)
    .map(([playerId]) => playerId);
  const majorityHitImpostor =
    topVoteCount > Math.floor(players.length / 2) &&
    players.some(
      (player) => topVotedPlayerIds.includes(player.id) && player.isImpostor,
    );
  const impostors = players.filter((player) => player.isImpostor);

  const refreshRoom = async () => {
    const response = await fetch(`/api/impostor/rooms/${joinCode}`, {
      cache: "no-store",
    });
    const body = await response
      .json()
      .catch(() => ({ error: "Failed to load remote game." }));

    if (!response.ok) {
      throw new Error(body.error ?? "Failed to load remote game.");
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

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        await refreshRoom();
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load remote game.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [joinCode, playerToken]);

  useEffect(() => {
    if (room?.phase === "lobby") {
      router.replace(`/game/impostor/lobby/${joinCode}`);
    }
  }, [joinCode, room, router]);

  useEffect(() => {
    if (currentPlayer?.hasSeenRole) {
      setRevealed(true);
    }
  }, [currentPlayer?.hasSeenRole]);

  useEffect(() => {
    if (!room) return;

    const supabase = getBrowserSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel(`impostor-remote-${room.id}`)
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
            // Keep current snapshot on transient refresh failures.
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [room]);

  const revealMyRole = async () => {
    setRevealed(true);
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/impostor/rooms/seen-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode, playerToken }),
      });

      const body = await response
        .json()
        .catch(() => ({ error: "Failed to mark role as seen." }));

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to mark role as seen.");
      }
    } catch (revealError) {
      setError(
        revealError instanceof Error
          ? revealError.message
          : "Failed to mark role as seen.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const openVoting = async () => {
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/impostor/rooms/open-voting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode, playerToken }),
      });

      const body = await response
        .json()
        .catch(() => ({ error: "Failed to open voting." }));

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to open voting.");
      }
    } catch (openError) {
      setError(
        openError instanceof Error
          ? openError.message
          : "Failed to open voting.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const submitVote = async (targetPlayerId: string) => {
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/impostor/rooms/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode, playerToken, targetPlayerId }),
      });

      const body = await response
        .json()
        .catch(() => ({ error: "Failed to submit vote." }));

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to submit vote.");
      }
    } catch (voteError) {
      setError(
        voteError instanceof Error
          ? voteError.message
          : "Failed to submit vote.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const revealResults = async () => {
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/impostor/rooms/reveal-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode, playerToken }),
      });

      const body = await response
        .json()
        .catch(() => ({ error: "Failed to reveal results." }));

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to reveal results.");
      }
    } catch (revealError) {
      setError(
        revealError instanceof Error
          ? revealError.message
          : "Failed to reveal results.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const setReadyForNextRound = async (ready: boolean) => {
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/impostor/rooms/ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode, playerToken, ready }),
      });

      const body = await response
        .json()
        .catch(() => ({ error: "Failed to update ready state." }));

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to update ready state.");
      }
    } catch (readyError) {
      setError(
        readyError instanceof Error
          ? readyError.message
          : "Failed to update ready state.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const playAgain = async () => {
    await setReadyForNextRound(true);
  };

  const backToLobby = async () => {
    await setReadyForNextRound(false);
    router.push(`/game/impostor/lobby/${joinCode}`);
  };

  const startNextRound = async () => {
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/impostor/rooms/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode, playerToken }),
      });

      const body = await response
        .json()
        .catch(() => ({ error: "Failed to start the next round." }));

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to start the next round.");
      }
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Failed to start the next round.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </main>
    );
  }

  if (!room || !currentPlayer) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <p className="text-lg font-semibold">
          {error ?? "Player session not found."}
        </p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8">
      <AnimatedBackground />
      <div className="container mx-auto max-w-3xl space-y-6">
        <Card className="space-y-5 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Remote Role Reveal
          </p>
          <h1 className="font-display text-4xl font-extrabold">
            {currentPlayer.playerName}, this phone is your role card
          </h1>
          <p className="text-muted-foreground">
            Open privately, reveal your role, then start discussing together in
            person.
          </p>

          {room.phase === "role_reveal" && (
            <>
              {!revealed ? (
                <Button
                  size="xl"
                  onClick={revealMyRole}
                  disabled={actionLoading}
                >
                  <Eye className="mr-2 h-5 w-5" /> Reveal My Role
                </Button>
              ) : currentPlayer.isImpostor ? (
                <div className="rounded-3xl border border-red-200/70 bg-red-100/80 p-6 text-left dark:border-red-900/70 dark:bg-red-950/40">
                  <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.22em] text-red-700 dark:text-red-200">
                    <ShieldAlert className="h-4 w-4" /> You are the Impostor
                  </p>
                  <p className="mt-4 text-2xl font-black text-slate-900 dark:text-slate-100">
                    Blend in and listen carefully.
                  </p>
                  <p className="mt-3 text-base text-slate-700 dark:text-slate-200">
                    {room.settings.hideHint || !room.hint
                      ? "No hint was enabled for this round."
                      : `Hint: ${room.hint}`}
                  </p>
                </div>
              ) : (
                <div className="rounded-3xl border border-emerald-200/70 bg-emerald-100/80 p-6 text-left dark:border-emerald-900/70 dark:bg-emerald-950/40">
                  <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-200">
                    <Sparkles className="h-4 w-4" /> Your Secret Word
                  </p>
                  <p className="mt-4 text-3xl font-black text-slate-900 dark:text-slate-100">
                    {room.secretWord}
                  </p>
                  <p className="mt-3 text-base text-slate-700 dark:text-slate-200">
                    Protect the word and find the impostor during discussion.
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-white/70 bg-white/75 p-4 text-left dark:border-slate-700/80 dark:bg-slate-900/75">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Players ready: {seenCount}/{players.length}
                </p>
                {isHost ? (
                  <Button
                    className="mt-3"
                    size="lg"
                    onClick={openVoting}
                    disabled={!allSeen || actionLoading}
                  >
                    {allSeen ? "Open Voting" : "Waiting For Everyone"}
                  </Button>
                ) : (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Wait for the host to open the voting once everyone has seen
                    their role.
                  </p>
                )}
              </div>
            </>
          )}

          {room.phase === "voting" && (
            <div className="w-full space-y-4 text-left">
              <div className="rounded-3xl border border-white/70 bg-white/80 p-6 dark:border-slate-700/80 dark:bg-slate-900/80">
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">
                  Realtime Voting
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Vote for the player you think is the impostor.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {players.map((player) => (
                    <Button
                      key={player.id}
                      type="button"
                      variant={
                        currentPlayer.voteTargetPlayerId === player.id
                          ? "default"
                          : "secondary"
                      }
                      size="lg"
                      className="justify-between"
                      onClick={() => submitVote(player.id)}
                      disabled={actionLoading}
                    >
                      <span>{player.playerName}</span>
                      <span>{voteCounts[player.id] ?? 0}</span>
                    </Button>
                  ))}
                </div>
                <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
                  Votes submitted:{" "}
                  {players.filter((player) => player.voteTargetPlayerId).length}
                  /{players.length}
                </p>
                {isHost && (
                  <Button
                    className="mt-4"
                    size="lg"
                    onClick={revealResults}
                    disabled={!allVoted || actionLoading}
                  >
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    {allVoted ? "Reveal Results" : "Waiting For All Votes"}
                  </Button>
                )}
              </div>
            </div>
          )}

          {room.phase === "results" && (
            <div className="w-full space-y-4 text-left">
              <div className="rounded-3xl border border-white/70 bg-white/80 p-6 dark:border-slate-700/80 dark:bg-slate-900/80">
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">
                  Results Revealed
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Impostor{impostors.length > 1 ? "s" : ""}:{" "}
                  {impostors.map((player) => player.playerName).join(", ")}
                </p>
                <p className="mt-3 text-base text-slate-700 dark:text-slate-200">
                  {majorityHitImpostor
                    ? "The group caught the impostor. Non-impostor players gained 1 point."
                    : "The impostor escaped the majority vote. Impostor player(s) gained 1 point."}
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Top voted:{" "}
                  {topVotedPlayerIds.length > 0
                    ? players
                        .filter((player) =>
                          topVotedPlayerIds.includes(player.id),
                        )
                        .map((player) => player.playerName)
                        .join(", ")
                    : "No vote"}
                </p>
              </div>

              <div className="rounded-3xl border border-white/70 bg-white/80 p-6 dark:border-slate-700/80 dark:bg-slate-900/80">
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
                  Play Again
                </p>
                <p className="mt-3 text-base text-slate-700 dark:text-slate-200">
                  {allReady
                    ? "Everyone is ready. The host can start the next round now."
                    : `Ready players: ${readyCount}/${players.length}. If someone goes back to the lobby, the next round will pause until they ready up again.`}
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    variant={
                      currentPlayer.readyForNextRound ? "secondary" : "default"
                    }
                    onClick={playAgain}
                    disabled={actionLoading || currentPlayer.readyForNextRound}
                  >
                    {currentPlayer.readyForNextRound
                      ? "Ready For Next Round"
                      : "Play Again"}
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    onClick={backToLobby}
                    disabled={actionLoading}
                  >
                    Back To Lobby
                  </Button>
                  {isHost && (
                    <Button
                      size="lg"
                      onClick={startNextRound}
                      disabled={actionLoading || !allReady}
                    >
                      {allReady
                        ? "Start Next Round"
                        : "Waiting For Everyone To Ready"}
                    </Button>
                  )}
                </div>
                {!allReady && (
                  <p className="mt-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
                    The room will not continue until everyone is ready.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-white/70 bg-white/75 p-4 text-left dark:border-slate-700/80 dark:bg-slate-900/75">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-200">
              <Users className="h-4 w-4" /> Players In This Match
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {players.map((player) => (
                <li
                  key={player.id}
                  className="flex items-center justify-between rounded-xl border border-white/75 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700/80 dark:bg-slate-950/65 dark:text-slate-100"
                >
                  <span>{player.playerName}</span>
                  <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-extrabold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                    {player.score} pt
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => router.push("/")}
            >
              Back to Home
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => router.push(`/game/impostor/lobby/${joinCode}`)}
            >
              Back to Lobby
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
