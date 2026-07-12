"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  Loader2,
  Medal,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { AnimatedBackground } from "@/components/game/animated-background";
import { ExitGameModal } from "@/components/game/exit-game-modal";
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
  const [roleCardFlipped, setRoleCardFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [voteSubmitting, setVoteSubmitting] = useState(false);
  const [optimisticVoteTargetId, setOptimisticVoteTargetId] = useState<
    string | null
  >(null);
  const [showRevealPopup, setShowRevealPopup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exitTarget, setExitTarget] = useState<string | null>(null);

  const currentPlayer = useMemo(
    () => players.find((player) => player.playerToken === playerToken) ?? null,
    [playerToken, players],
  );

  const exitDescription = useMemo(() => {
    const remainingPlayers = players.filter(
      (player) => player.playerToken !== playerToken,
    );

    if (remainingPlayers.length === 0) {
      return "If you leave now, this room will be deleted automatically because no players will remain.";
    }

    if (currentPlayer?.isHost) {
      return `If you leave now, ${remainingPlayers[0].playerName} will become the new host.`;
    }

    return "If you leave now, the match will continue for the remaining players.";
  }, [currentPlayer?.isHost, playerToken, players]);

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

  const effectivePlayers = useMemo(() => {
    if (!currentPlayer || !optimisticVoteTargetId) return players;

    return players.map((player) =>
      player.id === currentPlayer.id
        ? { ...player, voteTargetPlayerId: optimisticVoteTargetId }
        : player,
    );
  }, [currentPlayer, optimisticVoteTargetId, players]);

  const impostors = players.filter((player) => player.isImpostor);
  const currentVoteTargetId =
    optimisticVoteTargetId ?? currentPlayer?.voteTargetPlayerId ?? null;
  const currentPlayerHasVoted = Boolean(currentVoteTargetId);
  const rankedPlayers = useMemo(
    () =>
      [...players].sort(
        (a, b) => b.score - a.score || a.playerName.localeCompare(b.playerName),
      ),
    [players],
  );
  const highestScore = rankedPlayers[0]?.score ?? 0;
  const impostorIds = useMemo(
    () => new Set(impostors.map((player) => player.id)),
    [impostors],
  );
  const playerCatchStatuses = useMemo(
    () =>
      players.map((player) => ({
        ...player,
        guessedCorrectly:
          !player.isImpostor &&
          Boolean(player.voteTargetPlayerId) &&
          impostorIds.has(player.voteTargetPlayerId as string),
      })),
    [impostorIds, players],
  );
  const currentPlayerCorrectGuess = Boolean(
    currentPlayer &&
    !currentPlayer.isImpostor &&
    currentPlayer.voteTargetPlayerId &&
    players.some(
      (player) =>
        player.id === currentPlayer.voteTargetPlayerId && player.isImpostor,
    ),
  );
  const currentPlayerWrongGuess = Boolean(
    currentPlayer &&
    !currentPlayer.isImpostor &&
    currentPlayerHasVoted &&
    !currentPlayerCorrectGuess,
  );

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
    const hasSeenRole = Boolean(currentPlayer?.hasSeenRole);
    setRevealed(hasSeenRole);
    setRoleCardFlipped(hasSeenRole);
  }, [currentPlayer?.hasSeenRole, room?.phase]);

  useEffect(() => {
    if (currentPlayer?.voteTargetPlayerId) {
      setOptimisticVoteTargetId(currentPlayer.voteTargetPlayerId);
      return;
    }

    setOptimisticVoteTargetId(null);
  }, [currentPlayer?.voteTargetPlayerId]);

  useEffect(() => {
    if (room?.phase === "results") {
      setShowRevealPopup(true);
      return;
    }

    setShowRevealPopup(false);
  }, [room?.phase]);

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
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/impostor/rooms/seen-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ joinCode, playerToken }),
      });

      const body = await response
        .json()
        .catch(() => ({ error: "Failed to mark role as seen." }));

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to mark role as seen.");
      }

      setRoleCardFlipped(true);
      await refreshRoom();
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
        cache: "no-store",
        body: JSON.stringify({ joinCode, playerToken }),
      });

      const body = await response
        .json()
        .catch(() => ({ error: "Failed to open voting." }));

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to open voting.");
      }

      await refreshRoom();
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
    if (currentPlayer && targetPlayerId === currentPlayer.id) {
      setError("You cannot vote for yourself.");
      return;
    }

    setVoteSubmitting(true);
    setError(null);
    setOptimisticVoteTargetId(targetPlayerId);

    try {
      const response = await fetch("/api/impostor/rooms/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ joinCode, playerToken, targetPlayerId }),
      });

      const body = await response
        .json()
        .catch(() => ({ error: "Failed to submit vote." }));

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to submit vote.");
      }

      await refreshRoom();
    } catch (voteError) {
      setOptimisticVoteTargetId(currentPlayer?.voteTargetPlayerId ?? null);
      setError(
        voteError instanceof Error
          ? voteError.message
          : "Failed to submit vote.",
      );
    } finally {
      setVoteSubmitting(false);
    }
  };

  const revealResults = async () => {
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/impostor/rooms/reveal-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ joinCode, playerToken }),
      });

      const body = await response
        .json()
        .catch(() => ({ error: "Failed to reveal results." }));

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to reveal results.");
      }

      await refreshRoom();
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
    setRevealed(false);
    setRoleCardFlipped(false);

    try {
      const response = await fetch("/api/impostor/rooms/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ joinCode, playerToken }),
      });

      const body = await response
        .json()
        .catch(() => ({ error: "Failed to start the next round." }));

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to start the next round.");
      }

      await refreshRoom();
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

  const handleRoleCardClick = async () => {
    if (actionLoading) return;

    if (!revealed) {
      await revealMyRole();
      return;
    }

    setRoleCardFlipped((current) => !current);
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

  const requestExit = (path: string) => {
    setExitTarget(path);
  };

  const confirmExit = async () => {
    if (!exitTarget) return;
    const target = exitTarget;
    setExitTarget(null);
    await leaveRoomAndNavigate(target);
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
              <button
                type="button"
                onClick={() => void handleRoleCardClick()}
                className="mx-auto block w-full max-w-xl rounded-3xl text-left"
              >
                <div
                  className={`card3d relative min-h-64 w-full ${roleCardFlipped ? "flipped" : ""}`}
                >
                  <div className="card3d-face absolute inset-0 rounded-3xl border border-border bg-card/80 p-6">
                    <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.22em] text-primary">
                      <Eye className="h-4 w-4" /> Tap Card To Reveal
                    </p>
                    <p className="mt-8 text-3xl font-black text-foreground">
                      Your Role Card
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Tap once to reveal. Tap again to flip back.
                    </p>
                  </div>

                  <div
                    className={`card3d-face card3d-back absolute inset-0 rounded-3xl border p-6 ${
                      currentPlayer.isImpostor
                        ? "border-red-200/70 bg-red-100/80 dark:border-red-900/70 dark:bg-red-950/40"
                        : "border-emerald-200/70 bg-emerald-100/80 dark:border-emerald-900/70 dark:bg-emerald-950/40"
                    }`}
                  >
                    {currentPlayer.isImpostor ? (
                      <>
                        <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.22em] text-red-700 dark:text-red-200">
                          <ShieldAlert className="h-4 w-4" /> You are the
                          Impostor
                        </p>
                        <p className="mt-4 text-3xl font-black text-foreground">
                          Blend in and listen carefully.
                        </p>
                        <p className="mt-3 text-base text-foreground">
                          {room.settings.hideHint || !room.hint
                            ? "No hint was enabled for this round."
                            : `Hint: ${room.hint}`}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-200">
                          <Sparkles className="h-4 w-4" /> Your Secret Word
                        </p>
                        <p className="mt-4 text-4xl font-black text-foreground">
                          {room.secretWord}
                        </p>
                        <p className="mt-3 text-base text-foreground">
                          Protect the word and find the impostor during
                          discussion.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </button>

              <div className="rounded-2xl border border-border bg-card/75 p-4 text-left">
                <p className="text-sm font-semibold text-foreground">
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
                  <p className="mt-2 text-sm text-muted-foreground">
                    className="mobile-top-chrome" Wait for the host to open the
                    voting once everyone has seen their role.
                  </p>
                )}
              </div>
            </>
          )}

          {room.phase === "voting" && (
            <div className="w-full space-y-4 text-left">
              <div className="rounded-3xl border border-border bg-card/80 p-6">
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-primary">
                  Realtime Voting
                </p>
                <p className="mt-3 text-lg font-semibold text-foreground">
                  Vote for the player you think is the impostor.
                </p>
                <p className="mt-4 text-sm text-muted-foreground">
                  {currentPlayerHasVoted
                    ? "Your vote is submitted. Please wait for everyone to finish."
                    : "Voting is secret. Pick one player in the voting modal."}
                </p>
                {isHost && !allVoted && (
                  <Button className="mt-4" size="lg" disabled>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Waiting For All Votes
                  </Button>
                )}
              </div>
            </div>
          )}

          {room.phase === "results" && (
            <div className="w-full space-y-4 text-left">
              <div className="rounded-3xl border border-border bg-card/80 p-6">
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-primary">
                  Results Revealed
                </p>
                <p className="mt-3 text-lg font-semibold text-foreground">
                  Impostor{impostors.length > 1 ? "s" : ""}:{" "}
                  {impostors.map((player) => player.playerName).join(", ")}
                </p>
                <p className="mt-2 text-3xl font-black text-foreground">
                  {impostors.map((player) => player.playerName).join(", ")}
                </p>
                <p className="mt-3 text-base text-foreground">
                  {currentPlayer?.isImpostor
                    ? "You were the impostor this round."
                    : currentPlayerCorrectGuess
                      ? "Great guess! You caught the impostor."
                      : currentPlayerWrongGuess
                        ? "Not this time. You did not guess the impostor."
                        : "Round completed."}
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-card/80 p-6">
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
                  Play Again
                </p>
                <p className="mt-3 text-base text-foreground">
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

          <div className="rounded-2xl border border-border bg-card/75 p-4 text-left">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-foreground">
              <Medal className="h-4 w-4" /> Score Ranking
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {rankedPlayers.map((player, index) => (
                <motion.li
                  key={player.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.05 }}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-black text-foreground">
                      {index + 1}
                    </span>
                    {index === 0
                      ? "🏆"
                      : index === 1
                        ? "🥈"
                        : index === 2
                          ? "🥉"
                          : ""}
                    {player.playerName}
                  </span>
                  <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-extrabold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                    {player.score} pt
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => requestExit("/")}
            >
              Back to Home
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => requestExit("/game/impostor/join")}
            >
              Leave Room
            </Button>
          </div>
        </Card>
      </div>

      <ExitGameModal
        open={Boolean(exitTarget)}
        title="Would you like to leave this room?"
        description={exitDescription}
        confirmLabel="Leave Room"
        onConfirm={() => void confirmExit()}
        onCancel={() => setExitTarget(null)}
      />

      {room.phase === "voting" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <Card className="w-full max-w-lg space-y-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
              Secret Vote
            </p>
            <h2 className="text-2xl font-black">
              Choose who you think is the impostor
            </h2>
            <p className="text-sm text-muted-foreground">
              {currentVoteTargetId
                ? `Your choice: ${players.find((player) => player.id === currentVoteTargetId)?.playerName ?? "Selected player"}`
                : "Pick one player. You cannot vote for yourself."}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {players.map((player) => (
                <Button
                  key={player.id}
                  type="button"
                  size="lg"
                  variant={
                    currentVoteTargetId === player.id ? "default" : "secondary"
                  }
                  className="justify-start"
                  onClick={() => submitVote(player.id)}
                  disabled={
                    voteSubmitting ||
                    player.id === currentPlayer.id ||
                    Boolean(currentVoteTargetId)
                  }
                >
                  {player.playerName}
                  {player.id === currentPlayer.id ? " (You)" : ""}
                </Button>
              ))}
            </div>
            {currentVoteTargetId && (
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Vote submitted. Waiting for other players.
              </p>
            )}
          </Card>
        </div>
      )}

      {room.phase === "voting" && isHost && allVoted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <Card className="w-full max-w-md space-y-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
              All Votes Submitted
            </p>
            <h2 className="text-2xl font-black">
              Ready to reveal the impostor?
            </h2>
            <Button size="lg" onClick={revealResults} disabled={actionLoading}>
              {actionLoading ? "Revealing..." : "Reveal Impostor"}
            </Button>
          </Card>
        </div>
      )}

      {room.phase === "results" && showRevealPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4">
          <Card className="w-full max-w-2xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                  Reveal Summary
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {currentPlayer?.isImpostor
                    ? "You were the impostor this round."
                    : currentPlayerCorrectGuess
                      ? "You have successfully caught the impostor!"
                      : "You did not catch the impostor this round."}
                </h2>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  Impostor:{" "}
                  {impostors.map((player) => player.playerName).join(", ") ||
                    "Unknown"}
                  .
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="default"
                onClick={() => setShowRevealPopup(false)}
              >
                Close
              </Button>
            </div>

            <div className="rounded-2xl border border-border bg-card/75 p-4">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-foreground">
                Who Caught The Impostor?
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {playerCatchStatuses.map((player) => (
                  <li
                    key={player.id}
                    className="rounded-xl border border-border bg-card/85 px-3 py-2 text-sm font-semibold text-foreground"
                  >
                    <span>{player.playerName}</span>
                    <span className="ml-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      {player.isImpostor
                        ? "Impostor"
                        : player.guessedCorrectly
                          ? "Caught"
                          : "Missed"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card/75 p-4">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-foreground">
                Rankings
              </p>
              <ul className="grid gap-2">
                {rankedPlayers.map((player, index) => {
                  const scoreDelta = Math.max(
                    0,
                    player.score - (highestScore - 2),
                  );
                  const restingLift = Math.min(18, scoreDelta * 3);
                  const bounce = Math.max(3, 9 - index);

                  return (
                    <motion.li
                      key={`reveal-rank-${player.id}`}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{
                        opacity: 1,
                        y: [-restingLift, -restingLift - bounce, -restingLift],
                      }}
                      transition={{
                        opacity: { duration: 0.25, delay: index * 0.06 },
                        y: {
                          duration: 1.25,
                          delay: index * 0.06,
                          repeat: Infinity,
                          repeatType: "mirror",
                          ease: "easeInOut",
                        },
                      }}
                      className="flex items-center justify-between rounded-xl border border-border bg-card/85 px-3 py-3 text-sm font-semibold text-foreground"
                    >
                      <span className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-black text-foreground">
                          {index + 1}
                        </span>
                        {index === 0
                          ? "🏆"
                          : index === 1
                            ? "🥈"
                            : index === 2
                              ? "🥉"
                              : ""}
                        {player.playerName}
                      </span>
                      <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-extrabold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                        {player.score} pt
                      </span>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}
