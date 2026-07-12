"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Sparkles } from "lucide-react";
import { AnimatedBackground } from "@/components/game/animated-background";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  type JoinImpostorRoomResponse,
  type RemoteImpostorSession,
} from "@/lib/types";

type InviteClientProps = {
  joinCode: string;
  roomName: string;
  invitedBy: string;
  playerCount: number;
  maxPlayers: number;
  isPublic: boolean;
  isJoinable: boolean;
};

export function InviteClient({
  joinCode,
  roomName,
  invitedBy,
  playerCount,
  maxPlayers,
  isPublic,
  isJoinable,
}: InviteClientProps) {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveRemoteSession = (roomCode: string, playerToken: string) => {
    const session: RemoteImpostorSession = {
      roomCode,
      playerToken,
    };

    sessionStorage.setItem("remoteImpostorSession", JSON.stringify(session));
  };

  const joinInvite = async () => {
    const safeName = playerName.trim();
    if (!safeName) {
      setError("Your name is required before joining.");
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const response = await fetch("/api/impostor/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ joinCode, playerName: safeName }),
      });

      const body = (await response.json().catch(() => null)) as
        | JoinImpostorRoomResponse
        | { error?: string }
        | null;

      if (!response.ok || !body || !("room" in body) || !("player" in body)) {
        throw new Error(
          body && "error" in body
            ? (body.error ?? "Failed to join room.")
            : "Failed to join room.",
        );
      }

      saveRemoteSession(body.room.joinCode, body.player.playerToken);
      router.push(`/game/impostor/lobby/${body.room.joinCode}`);
    } catch (joinError) {
      setError(
        joinError instanceof Error ? joinError.message : "Failed to join room.",
      );
    } finally {
      setJoining(false);
    }
  };

  if (!isJoinable) {
    return (
      <main className="relative min-h-screen overflow-hidden px-4 py-8">
        <AnimatedBackground />
        <div className="container mx-auto flex min-h-[calc(100dvh-4rem)] max-w-3xl items-center justify-center">
          <Card className="w-full max-w-xl space-y-5 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-700 dark:text-red-300">
              <Crown className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-red-700 dark:text-red-300">
                Room Expired
              </p>
              <h1 className="font-display text-4xl font-black text-foreground">
                {roomName}
              </h1>
              <p className="text-sm text-muted-foreground">
                This game room is no longer joinable.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-muted p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Players
                </p>
                <p className="mt-1 text-lg font-black text-foreground">
                  {playerCount}/{maxPlayers}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Visibility
                </p>
                <p className="mt-1 text-lg font-black text-foreground">
                  {isPublic ? "Public" : "Private"}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Join Code
                </p>
                <p className="mt-1 text-lg font-black text-foreground">
                  {joinCode}
                </p>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <Button
                type="button"
                size="lg"
                variant="secondary"
                className="mobile-top-chrome"
                onClick={() => router.push("/game/impostor/join")}
              >
                Return Home
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
      <div className="container mx-auto flex min-h-[calc(100dvh-4rem)] max-w-3xl items-center justify-center">
        <Card className="w-full overflow-hidden p-0">
          <div className="grid gap-0 md:grid-cols-[1.05fr_0.95fr]">
            <div className="relative overflow-hidden bg-gradient-to-br from-cyan-700 via-sky-700 to-blue-950 p-8 text-white">
              <div className="absolute inset-0 opacity-30">
                <div className="absolute -left-16 top-0 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl" />
              </div>

              <div className="relative space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-cyan-100/80">
                  <Sparkles className="h-3.5 w-3.5" /> Invite Link
                </div>
                <h1 className="font-display text-4xl font-black leading-tight">
                  Share the room with friends
                </h1>
                <p className="max-w-md text-sm text-cyan-50/85">
                  Anyone with this link can join the lobby instantly. You can
                  copy it and send it through chat apps, text, or QR sharing.
                </p>
              </div>

              <div className="relative mt-10 grid gap-4 rounded-3xl border border-white/15 bg-white/10 p-5 shadow-[0_18px_50px_rgba(2,6,23,0.28)] backdrop-blur">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/75">
                    Room Name
                  </p>
                  <p className="mt-1 text-lg font-bold">{roomName}</p>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/75">
                    Join Code
                  </p>
                  <p className="mt-1 text-lg font-black text-white">
                    {joinCode}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex justify-center gap-3">
                <Button
                  type="button"
                  size="lg"
                  variant="secondary"
                  className="mobile-top-chrome"
                  onClick={() => router.push("/")}
                >
                  Return Home
                </Button>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">
                    Join Now
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-foreground">
                    Choose your name
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This keeps the invite clean and mobile-friendly while
                    showing the room name clearly.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-muted p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      Players
                    </p>
                    <p className="mt-1 text-lg font-black text-foreground">
                      {playerCount}/{maxPlayers}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      Visibility
                    </p>
                    <p className="mt-1 text-lg font-black text-foreground">
                      {isPublic ? "Public" : "Private"}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold">Your name</label>
                  <Input
                    className="mt-2"
                    value={playerName}
                    onChange={(event) => setPlayerName(event.target.value)}
                    placeholder="Enter your name"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-800 dark:bg-red-950/55 dark:text-red-200">
                    {error}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="lg"
                    className="flex-1 shadow-[0_12px_30px_rgba(14,165,233,0.28)]"
                    disabled={joining}
                    onClick={() => void joinInvite()}
                  >
                    {joining ? "Joining..." : "Join Game"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
