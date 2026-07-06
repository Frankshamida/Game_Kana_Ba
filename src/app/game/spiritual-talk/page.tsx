"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AnimatedBackground } from "@/components/game/animated-background";
import { PlayerListEditor } from "@/components/game/player-list-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SpiritualQuestionStyle, SpiritualTalkSession } from "@/lib/types";

const QUESTION_STYLES: Array<{
  value: SpiritualQuestionStyle;
  label: string;
  helper: string;
}> = [
  { value: "mixed", label: "Mixed", helper: "Balanced mix of all emotions." },
  {
    value: "deep",
    label: "Deep",
    helper: "Hard and impactful faith questions.",
  },
  {
    value: "struggle",
    label: "Struggle",
    helper: "Honest questions about pain and temptations.",
  },
  { value: "joy", label: "Joy", helper: "Hopeful and grateful life moments." },
  {
    value: "personal",
    label: "Personal",
    helper: "Personal life and relationship questions.",
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

export default function SpiritualTalkSetupPage() {
  const router = useRouter();
  const [players, setPlayers] = useState(["", ""]);
  const [questionStyle, setQuestionStyle] =
    useState<SpiritualQuestionStyle>("mixed");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validationError = useMemo(() => validatePlayers(players), [players]);

  const startSession = () => {
    const safePlayers = players.map((name) => name.trim());
    const preError = validatePlayers(safePlayers);

    if (preError) {
      setError(preError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sessionPayload: SpiritualTalkSession = {
        players: safePlayers,
        currentTurn: 0,
        questionStyle,
        scores: Object.fromEntries(safePlayers.map((name) => [name, 0])),
        currentPrompt: null,
        history: [],
      };

      sessionStorage.setItem(
        "spiritualTalkSession",
        JSON.stringify(sessionPayload),
      );
      router.push("/game/spiritual-talk/play");
    } catch {
      setError("Could not start spiritual talk session.");
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
            Let&apos;s Talk: Spiritual Life
          </h1>
          <p className="mt-2 text-muted-foreground">
            Add at least 2 players for emotional and spiritually reflective
            questions.
          </p>

          <div className="mt-6">
            <PlayerListEditor players={players} onChange={setPlayers} />
          </div>

          <div className="mt-5 rounded-2xl border border-white/60 bg-white/60 p-4 dark:border-slate-700/80 dark:bg-slate-900/70">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Session focus
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Questions may cover prayer life, devotions, testimony moments,
              temptations, healing, gratitude, and relational spiritual growth.
            </p>

            <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Question style
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {QUESTION_STYLES.map((style) => (
                <Button
                  key={style.value}
                  type="button"
                  size="default"
                  variant={
                    questionStyle === style.value ? "default" : "secondary"
                  }
                  onClick={() => setQuestionStyle(style.value)}
                >
                  {style.label}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {
                QUESTION_STYLES.find((style) => style.value === questionStyle)
                  ?.helper
              }
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
              onClick={startSession}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Starting
                  Session...
                </>
              ) : (
                "Start Spiritual Talk"
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
