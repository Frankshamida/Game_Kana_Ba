"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  type ImpostorRoom,
  type ImpostorRoomPlayer,
  type RemoteImpostorSession,
} from "@/lib/types";

type LobbyClientProps = {
  joinCode: string;
};

export function LobbyClient({ joinCode }: LobbyClientProps) {
  const router = useRouter();
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

  const refreshRoom = useCallback(async () => {
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
  }, [joinCode]);

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
  }, [playerToken, refreshRoom, router]);

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
  }, [refreshRoom, room]);

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
        .catch(() => ({ error: "Failed to update ready status." }));

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to update ready status.");
      }

      await refreshRoom();
    } catch (readyError) {
      setError(
        readyError instanceof Error
          ? readyError.message
          : "Failed to update ready status.",
      );
    } finally {
      setReadyLoading(false);
    }
  };

  const leaveRoom = async () => {
    try {
      const response = await fetch("/api/impostor/rooms/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ joinCode, playerToken }),
      });

      if (response.ok) {
        sessionStorage.removeItem("remoteImpostorSession");
        router.replace("/game/impostor");
      }
    } catch {
      // Ignore leave errors when navigating away.
    }
  };

  if (loading) {
    return (
      <main className="relative min-h-screen overflow-hidden px-4 py-8">
        <AnimatedBackground />
        <div className="container mx-auto flex min-h-[calc(100dvh-4rem)] max-w-5xl items-center justify-center">
          <Card className="w-full max-w-xl space-y-4 p-8 text-center shadow-[0_24px_80px_rgba(14,165,233,0.12)]">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <div>
              <h1 className="font-display text-3xl font-black">
                Loading lobby
              </h1>
              <p className="mt-2 text-muted-foreground">
                Connecting to room {joinCode}...
              </p>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="relative min-h-screen overflow-hidden px-4 py-8">
        <AnimatedBackground />
        <div className="container mx-auto flex min-h-[calc(100dvh-4rem)] max-w-5xl items-center justify-center">
          <Card className="w-full max-w-xl space-y-4 p-8 text-center shadow-[0_24px_80px_rgba(14,165,233,0.12)]">
            <h1 className="font-display text-3xl font-black">
              Lobby unavailable
            </h1>
            <p className="mt-2 text-muted-foreground">
              We could not load this room.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button
                className="mobile-top-chrome"
                onClick={() => router.push("/game/impostor/join")}
              >
                Back to Join
              </Button>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8">
      <AnimatedBackground />
      <div className="container mx-auto max-w-5xl space-y-6">
        <Card className="overflow-hidden p-0 shadow-[0_24px_80px_rgba(8,145,178,0.18)]">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6 bg-gradient-to-br from-cyan-600 via-sky-700 to-blue-950 p-6 text-white md:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-100/80">
                    Remote Lobby
                  </p>
                  <h1 className="mt-2 font-display text-4xl font-black md:text-5xl">
                    {room.roomName}
                  </h1>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-right backdrop-blur">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-100/80">
                    Room Code
                  </p>
                  <p className="mt-1 text-xl font-black tracking-[0.18em]">
                    {joinCode}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100/80">
                    Players
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    {players.length}/{room.maxPlayers}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100/80">
                    Visibility
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    {room.isPublic ? "Public" : "Private"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100/80">
                    Ready
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    {readyCount}/{players.length || 1}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white/15 p-3">
                    <Radio className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-100/80">
                      Invite Link
                    </p>
                    <p className="mt-1 text-sm text-cyan-50/85">
                      Share this room link so friends can join the lobby
                      directly.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  className="mt-4 border-white/20 bg-white/15 text-white hover:bg-white/20"
                  variant="secondary"
                  onClick={() => void copyInviteLink()}
                >
                  {copied ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {copied ? "Copied" : "Copy Invite Link"}
                </Button>
              </div>
            </div>

            <div className="space-y-5 p-6 md:p-8">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">
                  Lobby Controls
                </p>
                <h2 className="mt-2 text-3xl font-black text-foreground">
                  Players Ready To Start
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {isHost
                    ? "You can start the room once everyone is ready."
                    : "Wait for the host to begin the round."}
                </p>
              </div>

              <div className="grid gap-3 rounded-3xl border border-border bg-muted/80 p-4">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
                  >
                    <div>
                      <p className="font-bold text-foreground">
                        {player.playerName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {player.isHost ? "Host" : "Player"}
                      </p>
                    </div>
                    <div className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]">
                      {player.readyForNextRound ? "Ready" : "Waiting"}
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <p className="rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-800 dark:bg-red-950/50 dark:text-red-200">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                {isHost && (
                  <Button
                    type="button"
                    size="lg"
                    className="shadow-[0_12px_30px_rgba(14,165,233,0.28)]"
                    onClick={() => void startRoom()}
                    disabled={starting || !allReady}
                  >
                    {starting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      "Start Game"
                    )}
                  </Button>
                )}
                <Button
                  type="button"
                  size="lg"
                  variant={
                    currentPlayer?.readyForNextRound ? "secondary" : "default"
                  }
                  onClick={() =>
                    void setReadyForNextRound(!currentPlayer?.readyForNextRound)
                  }
                  disabled={readyLoading || !currentPlayer}
                >
                  {readyLoading
                    ? "Updating..."
                    : currentPlayer?.readyForNextRound
                      ? "Unready"
                      : "Ready Up"}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="ghost"
                  onClick={() => setShowExitModal(true)}
                >
                  Leave Room
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <ExitGameModal
        open={showExitModal}
        onConfirm={() => void leaveRoom()}
        onCancel={() => setShowExitModal(false)}
        description={exitDescription}
      />
    </main>
  );
}
