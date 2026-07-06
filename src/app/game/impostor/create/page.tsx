"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AnimatedBackground } from "@/components/game/animated-background";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CreateImpostorRoomResponse, RemoteImpostorSession } from "@/lib/types";

export default function ImpostorCreatePage() {
  const router = useRouter();
  const [roomName, setRoomName] = useState("My Impostor Room");
  const [playerName, setPlayerName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [hideHint, setHideHint] = useState(false);
  const [impostorCount, setImpostorCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveRemoteSession = (roomCode: string, playerToken: string) => {
    const session: RemoteImpostorSession = {
      roomCode,
      playerToken,
    };

    sessionStorage.setItem("remoteImpostorSession", JSON.stringify(session));
  };

  const createRoom = async () => {
    const safeName = playerName.trim();
    const safeRoomName = roomName.trim();
    if (!safeName) {
      setError("Host name is required.");
      return;
    }

    if (!safeRoomName) {
      setError("Room name is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/impostor/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          playerName: safeName,
          roomName: safeRoomName,
          maxPlayers,
          hideHint,
          impostorCount,
          hintDifficulty: "normal",
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | CreateImpostorRoomResponse
        | { error?: string }
        | null;

      if (!response.ok || !body || !("room" in body) || !("player" in body)) {
        throw new Error(
          body && "error" in body
            ? (body.error ?? "Failed to create room.")
            : "Failed to create room.",
        );
      }

      saveRemoteSession(body.room.joinCode, body.player.playerToken);
      router.push(`/game/impostor/lobby/${body.room.joinCode}`);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create room.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8">
      <AnimatedBackground />
      <div className="container mx-auto max-w-2xl">
        <Card className="space-y-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">
              Create Game
            </p>
            <h1 className="mt-2 font-display text-4xl font-extrabold">
              Host A Remote Match
            </h1>
            <p className="mt-2 text-muted-foreground">
              Create a new room and share the join code with everyone.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold">Room name</label>
            <Input
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder="Enter room name"
              maxLength={40}
            />

            <label className="text-sm font-semibold">Host name</label>
            <Input
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              placeholder="Enter your name"
            />
          </div>

          <div className="rounded-2xl bg-white/60 p-4 dark:bg-slate-900/55">
            <p className="text-sm font-semibold">Max players in room</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[4, 6, 8, 10, 12, 16, 20].map((count) => (
                <Button
                  key={count}
                  type="button"
                  size="default"
                  variant={count === maxPlayers ? "default" : "secondary"}
                  onClick={() => setMaxPlayers(count)}
                >
                  {count}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white/60 p-4 dark:bg-slate-900/55">
            <p className="text-sm font-semibold">Number of impostors</p>
            <div className="mt-3 flex gap-2">
              {[1, 2, 3].map((count) => (
                <Button
                  key={count}
                  type="button"
                  size="default"
                  variant={count === impostorCount ? "default" : "secondary"}
                  onClick={() => setImpostorCount(count)}
                >
                  {count}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white/60 p-4 dark:bg-slate-900/55">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={hideHint}
                onChange={(event) => setHideHint(event.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              Hide hint for the impostor
            </label>
          </div>

          {error && (
            <p className="rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-800 dark:bg-red-950/50 dark:text-red-200">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="xl"
              className="sm:flex-1"
              onClick={createRoom}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating...
                </>
              ) : (
                "Create Room"
              )}
            </Button>
            <Button
              type="button"
              size="xl"
              variant="ghost"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
