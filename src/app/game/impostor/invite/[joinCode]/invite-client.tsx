"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { AnimatedBackground } from "@/components/game/animated-background";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  RemoteImpostorSession,
  type JoinImpostorRoomResponse,
} from "@/lib/types";

type InviteClientProps = {
  joinCode: string;
  roomName: string;
  invitedBy: string;
};

export function InviteClient({
  joinCode,
  roomName,
  invitedBy,
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

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8">
      <AnimatedBackground />
      <div className="container mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center justify-center">
        <Card className="w-full overflow-hidden border-white/80 bg-white/85 p-0 shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur dark:border-slate-700/80 dark:bg-slate-950/75">
          <div className="grid gap-0 md:grid-cols-[1.05fr_0.95fr]">
            <div className="relative overflow-hidden bg-gradient-to-br from-cyan-700 via-sky-700 to-blue-950 p-8 text-white">
              <div className="absolute inset-0 opacity-30">
                <div className="absolute -left-16 top-0 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-cyan-300/20 blur-3xl" />
              </div>
              <div className="relative flex h-full flex-col justify-between gap-10">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-100/90">
                    Game Invite
                  </p>
                  <h1 className="mt-3 font-display text-4xl font-black leading-tight md:text-5xl">
                    {invitedBy} invited you to join
                  </h1>
                  <p className="mt-3 text-lg font-semibold text-cyan-50/90">
                    {roomName}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/20 bg-white/10 p-5 shadow-[0_18px_50px_rgba(2,6,23,0.28)] backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white/15 p-3">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-100/80">
                        Ready to play
                      </p>
                      <p className="mt-1 text-sm text-cyan-50/85">
                        Enter your name and the room will take you straight into
                        the game.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-300">
                    Join Now
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-slate-50">
                    Choose your name
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    This keeps the invite clean and mobile-friendly while
                    showing the room name clearly.
                  </p>
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
                    onClick={() => void joinInvite()}
                    disabled={joining}
                  >
                    {joining ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      <>
                        Join Game <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="secondary"
                    onClick={() => router.push("/game/impostor/join")}
                  >
                    Back
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
