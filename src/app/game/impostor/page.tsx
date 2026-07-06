"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AnimatedBackground } from "@/components/game/animated-background";
import { PlayerListEditor } from "@/components/game/player-list-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GameStartResponse, ImpostorGameSession } from "@/lib/types";

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
  const [hideHint, setHideHint] = useState(false);
  const [impostorCount, setImpostorCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validationError = useMemo(() => validatePlayers(players), [players]);
  const maxImpostors = Math.min(3, Math.max(1, players.length - 1));
  const effectiveImpostorCount = Math.min(impostorCount, maxImpostors);

  const handlePlayersChange = (nextPlayers: string[]) => {
    setPlayers(nextPlayers);
    setImpostorCount((current) => {
      const nextMaxImpostors = Math.min(3, Math.max(1, nextPlayers.length - 1));
      return Math.min(current, nextMaxImpostors);
    });
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

          {(error || validationError) && (
            <p className="mt-4 rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-800 dark:bg-red-950/55 dark:text-red-200">
              {error || validationError}
            </p>
          )}

          <div className="mt-6">
            <PlayerListEditor
              players={players}
              onChange={handlePlayersChange}
            />
          </div>

          <div className="mt-5 rounded-2xl border border-white/70 bg-white/60 p-4 dark:border-slate-700/80 dark:bg-slate-900/70">
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

          <div className="mt-4 rounded-2xl border border-white/70 bg-white/60 p-4 dark:border-slate-700/80 dark:bg-slate-900/70">
            <p className="text-sm font-semibold">Number of impostors</p>
            <div className="mt-3 flex gap-2">
              {[1, 2, 3].map((count) => {
                const disabled = count > maxImpostors;
                const active = count === effectiveImpostorCount;

                return (
                  <Button
                    key={count}
                    type="button"
                    size="default"
                    variant={active ? "default" : "secondary"}
                    disabled={disabled}
                    onClick={() =>
                      setImpostorCount(Math.min(count, maxImpostors))
                    }
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

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              size="xl"
              className="sm:flex-1"
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
            <Button
              type="button"
              size="xl"
              variant="ghost"
              onClick={() => router.push("/")}
            >
              Back Home
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
