"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AnimatedBackground } from "@/components/game/animated-background";
import { PlayerListEditor } from "@/components/game/player-list-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CreateImpostorRoomResponse,
  GameStartResponse,
  ImpostorGameSession,
  JoinImpostorRoomResponse,
  RemoteImpostorSession,
} from "@/lib/types";

function validatePlayers(players: string[]): string | null {
  const trimmed = players.map((name) => name.trim());

  if (trimmed.some((name) => !name)) return "All player names are required.";

  const unique = new Set(trimmed.map((p) => p.toLowerCase()));
  if (unique.size !== trimmed.length) return "Player names must be unique.";

  if (trimmed.length < 3 || trimmed.length > 20) {
    return "Player count must be between 3 and 20.";
  }

  return null;
}

export default function ImpostorSetupPage() {
  const router = useRouter();
  const [players, setPlayers] = useState(["", "", ""]);
  const [darkMode, setDarkMode] = useState(false);
  const [hideHint, setHideHint] = useState(false);
  const [impostorCount, setImpostorCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteHostName, setRemoteHostName] = useState("");
  const [remoteJoinName, setRemoteJoinName] = useState("");
  const [remoteJoinCode, setRemoteJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);

  const validationError = useMemo(() => validatePlayers(players), [players]);
  const maxImpostors = Math.min(3, Math.max(1, players.length - 1));

  useEffect(() => {
    setImpostorCount((current) => Math.min(current, maxImpostors));
  }, [maxImpostors]);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const saveRemoteSession = (roomCode: string, playerToken: string) => {
    const session: RemoteImpostorSession = {
      roomCode,
      playerToken,
    };

    sessionStorage.setItem("remoteImpostorSession", JSON.stringify(session));
  };

  const startGame = async () => {
    const safePlayers = players.map((p) => p.trim());
    const safeImpostorCount = Math.min(
      impostorCount,
      Math.max(1, safePlayers.length - 1),
    );
    const preError = validatePlayers(safePlayers);
    if (preError) {
      setError(preError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          players: safePlayers,
          impostorCount: safeImpostorCount,
        }),
      });

      if (!response.ok) {
        const body = await response
          .json()
          .catch(() => ({ error: "Failed to start game." }));
        throw new Error(body.error ?? "Failed to start game.");
      }

      const payload = (await response.json()) as GameStartResponse;
      const sessionPayload: ImpostorGameSession = {
        ...payload,
        settings: {
          hideHint,
          impostorCount: safeImpostorCount,
          hintDifficulty: payload.hintDifficulty,
          scores: Object.fromEntries(
            safePlayers.map((playerName) => [playerName, 0]),
          ),
          usedWords: [payload.secretWord],
        },
      };
      sessionStorage.setItem("impostorGame", JSON.stringify(sessionPayload));
      router.push("/game/impostor/play");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start game.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const createRemoteGame = async () => {
    const playerName = remoteHostName.trim();
    if (!playerName) {
      setRemoteError("Host name is required.");
      return;
    }

    setRemoteLoading(true);
    setRemoteError(null);

    try {
      const response = await fetch("/api/impostor/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName,
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
      setRemoteError(
        createError instanceof Error
          ? createError.message
          : "Failed to create room.",
      );
    } finally {
      setRemoteLoading(false);
    }
  };

  const joinRemoteGame = async () => {
    const playerName = remoteJoinName.trim();
    const joinCode = remoteJoinCode.trim().toUpperCase();

    if (!playerName || !joinCode) {
      setRemoteError("Player name and join code are required.");
      return;
    }

    setRemoteLoading(true);
    setRemoteError(null);

    try {
      const response = await fetch("/api/impostor/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName, joinCode }),
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
      setRemoteError(
        joinError instanceof Error ? joinError.message : "Failed to join room.",
      );
    } finally {
      setRemoteLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8">
      <AnimatedBackground />
      <div className="container mx-auto max-w-3xl">
        <Card>
          <h1 className="font-display text-4xl font-extrabold">
            Who&apos;s the Impostor?
          </h1>
          <p className="mt-2 text-muted-foreground">
            Add 3 to 20 unique player names, then start the game.
          </p>

          <section
            id="create-game"
            className="mt-6 rounded-3xl border border-cyan-200/70 bg-cyan-50/70 p-5 dark:border-cyan-900/50 dark:bg-cyan-950/20"
          >
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">
              Create Game
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-50">
              Host a room for friends on their phones
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Enter your name, create a code, then wait in the lobby until you
              start the match.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input
                value={remoteHostName}
                onChange={(event) => setRemoteHostName(event.target.value)}
                placeholder="Host name"
              />
              <Button
                type="button"
                size="xl"
                onClick={createRemoteGame}
                disabled={remoteLoading}
              >
                {remoteLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />{" "}
                    Creating...
                  </>
                ) : (
                  "Create Game"
                )}
              </Button>
            </div>
          </section>

          <section
            id="join-game"
            className="mt-4 rounded-3xl border border-emerald-200/70 bg-emerald-50/70 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20"
          >
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
              Join A Game
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-50">
              Enter a code and wait for the host
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Join from your phone, then stay in the lobby until the host starts
              the game.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input
                value={remoteJoinName}
                onChange={(event) => setRemoteJoinName(event.target.value)}
                placeholder="Your name"
              />
              <Input
                value={remoteJoinCode}
                onChange={(event) =>
                  setRemoteJoinCode(event.target.value.toUpperCase())
                }
                placeholder="Room code"
                maxLength={6}
              />
            </div>
            <Button
              type="button"
              size="xl"
              className="mt-4 w-full"
              onClick={joinRemoteGame}
              disabled={remoteLoading}
            >
              {remoteLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Joining...
                </>
              ) : (
                "Join A Game"
              )}
            </Button>
          </section>

          {(remoteError || error || validationError) && (
            <p className="mt-4 rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-800">
              {remoteError || error || validationError}
            </p>
          )}

          <div className="mt-6">
            <PlayerListEditor players={players} onChange={setPlayers} />
          </div>

          <div className="mt-5 rounded-2xl bg-white/60 p-4">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              Dark mode
            </label>
            <p className="mt-2 text-sm text-muted-foreground">
              Switch the game UI to a darker theme.
            </p>
          </div>

          <div className="mt-4 rounded-2xl bg-white/60 p-4">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={hideHint}
                onChange={(e) => setHideHint(e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              Hide hint for the impostor
            </label>
            <p className="mt-2 text-sm text-muted-foreground">
              Turn this on if you want no hint shown during reveal.
            </p>
          </div>

          <div className="mt-4 rounded-2xl bg-white/60 p-4">
            <p className="text-sm font-semibold">Number of impostors</p>
            <div className="mt-3 flex gap-2">
              {[1, 2, 3].map((count) => {
                const disabled = count > maxImpostors;
                const active = count === impostorCount;

                return (
                  <Button
                    key={count}
                    type="button"
                    size="default"
                    variant={active ? "default" : "secondary"}
                    disabled={disabled}
                    onClick={() => setImpostorCount(count)}
                  >
                    {count}
                  </Button>
                );
              })}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose 1 to 3 impostors. Max now: {maxImpostors}.
            </p>
          </div>

          <Button
            size="xl"
            className="mt-6 w-full"
            disabled={loading || Boolean(validationError)}
            onClick={startGame}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Starting
                Game...
              </>
            ) : (
              "Start Game"
            )}
          </Button>
        </Card>
      </div>
    </main>
  );
}
