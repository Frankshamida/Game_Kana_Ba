"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AnimatedBackground } from "@/components/game/animated-background";
import { PlayerListEditor } from "@/components/game/player-list-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HintDifficulty, TruthOrDareGameSession } from "@/lib/types";

const DIFFICULTIES: Array<{
  value: HintDifficulty;
  label: string;
  helper: string;
}> = [
  { value: "easy", label: "Easy", helper: "Light and fun questions." },
  { value: "normal", label: "Normal", helper: "Balanced challenge level." },
  { value: "hard", label: "Hard", helper: "More challenging prompts." },
  {
    value: "difficult",
    label: "Difficult",
    helper: "Most challenging family-friendly prompts.",
  },
];

function validatePlayers(players: string[]): string | null {
  const trimmed = players.map((name) => name.trim());

  if (trimmed.length < 2) return "At least 2 players are required.";
  if (trimmed.length > 20) return "Maximum player count is 20.";
  if (trimmed.some((name) => !name)) return "All player names are required.";

  const unique = new Set(trimmed.map((name) => name.toLowerCase()));
  if (unique.size !== trimmed.length) return "Player names must be unique.";

  return null;
}

export default function TruthOrDareSetupPage() {
  const router = useRouter();
  const [players, setPlayers] = useState(["", ""]);
  const [difficulty, setDifficulty] = useState<HintDifficulty>("normal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validationError = useMemo(() => validatePlayers(players), [players]);
  const selectedDifficulty = useMemo(
    () =>
      DIFFICULTIES.find((item) => item.value === difficulty) ?? DIFFICULTIES[1],
    [difficulty],
  );

  const startGame = () => {
    const safePlayers = players.map((name) => name.trim());
    const preError = validatePlayers(safePlayers);

    if (preError) {
      setError(preError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sessionPayload: TruthOrDareGameSession = {
        players: safePlayers,
        currentTurn: 0,
        settings: {
          difficulty,
          scores: Object.fromEntries(safePlayers.map((name) => [name, 0])),
        },
        currentChallenge: null,
        history: [],
      };

      sessionStorage.setItem("truthOrDareGame", JSON.stringify(sessionPayload));
      router.push("/game/truth-or-dare/play");
    } catch {
      setError("Could not start Truth or Dare game.");
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
            Truth or Dare
          </h1>
          <p className="mt-2 text-muted-foreground">
            Add at least 2 players, choose difficulty, and start swiping.
          </p>

          <div className="mt-6">
            <PlayerListEditor players={players} onChange={setPlayers} />
          </div>

          <div className="glass mt-5 rounded-2xl p-4">
            <p className="text-sm font-semibold text-foreground">
              Question difficulty
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DIFFICULTIES.map((item) => {
                const active = item.value === difficulty;

                return (
                  <Button
                    key={item.value}
                    type="button"
                    size="default"
                    variant={active ? "default" : "secondary"}
                    onClick={() => setDifficulty(item.value)}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {selectedDifficulty.helper}
            </p>
          </div>

          {(error || validationError) && (
            <p className="mt-4 rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-800 dark:bg-red-950/55 dark:text-red-200">
              {error || validationError}
            </p>
          )}

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
                "Start Truth or Dare"
              )}
            </Button>
            <Button
              type="button"
              size="xl"
              variant="ghost"
              className="mobile-top-chrome"
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
