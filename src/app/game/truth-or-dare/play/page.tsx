"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { AnimatedBackground } from "@/components/game/animated-background";
import { ExitGameModal } from "@/components/game/exit-game-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AITruthOrDarePayload,
  TruthOrDareChallenge,
  TruthOrDareGameSession,
} from "@/lib/types";

const SWIPE_THRESHOLD = 120;

export default function TruthOrDarePlayPage() {
  const router = useRouter();
  const [game, setGame] = useState<TruthOrDareGameSession | null>(null);
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exitTarget, setExitTarget] = useState<string | null>(null);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      document.documentElement.classList.toggle("dark", storedTheme === "dark");
    }

    const raw = sessionStorage.getItem("truthOrDareGame");
    if (!raw) {
      router.replace("/game/truth-or-dare");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as TruthOrDareGameSession;
      if (
        !parsed ||
        !Array.isArray(parsed.players) ||
        parsed.players.length < 2
      ) {
        router.replace("/game/truth-or-dare");
        return;
      }

      setGame(parsed);
    } catch {
      router.replace("/game/truth-or-dare");
    }
  }, [router]);

  const currentPlayer = useMemo(() => {
    if (!game || game.players.length === 0) return null;
    const index = game.currentTurn % game.players.length;
    return game.players[index] ?? null;
  }, [game]);

  const saveGame = (nextGame: TruthOrDareGameSession) => {
    setGame(nextGame);
    sessionStorage.setItem("truthOrDareGame", JSON.stringify(nextGame));
  };

  const fetchChallenge = async (targetPlayer: string) => {
    if (!game) return;

    setLoadingChallenge(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/truth-or-dare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: targetPlayer,
          difficulty: game.settings.difficulty,
          mode: "random",
        }),
      });

      if (!response.ok) {
        const body = await response
          .json()
          .catch(() => ({ error: "Failed to generate prompt." }));
        throw new Error(body.error ?? "Failed to generate prompt.");
      }

      const payload = (await response.json()) as AITruthOrDarePayload;
      const challenge: TruthOrDareChallenge = {
        playerName: targetPlayer,
        mode: payload.mode,
        question: payload.question,
        language: payload.language,
        achieved: null,
      };

      saveGame({
        ...game,
        currentChallenge: challenge,
      });
    } catch (challengeError) {
      setError(
        challengeError instanceof Error
          ? challengeError.message
          : "Could not generate Truth or Dare prompt.",
      );
    } finally {
      setLoadingChallenge(false);
    }
  };

  useEffect(() => {
    if (!game || !currentPlayer || game.currentChallenge || loadingChallenge)
      return;
    void fetchChallenge(currentPlayer);
  }, [currentPlayer, game, loadingChallenge]);

  const submitChallengeResult = (achieved: boolean) => {
    if (!game || !game.currentChallenge) return;

    const resolvedChallenge: TruthOrDareChallenge = {
      ...game.currentChallenge,
      achieved,
    };

    const nextScores = { ...game.settings.scores };
    if (achieved) {
      nextScores[resolvedChallenge.playerName] =
        (nextScores[resolvedChallenge.playerName] ?? 0) + 1;
    }

    const nextGame: TruthOrDareGameSession = {
      ...game,
      currentTurn: game.currentTurn + 1,
      settings: {
        ...game.settings,
        scores: nextScores,
      },
      currentChallenge: null,
      history: [resolvedChallenge, ...game.history].slice(0, 20),
    };

    saveGame(nextGame);
  };

  const onCardDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number } },
  ) => {
    if (info.offset.x >= SWIPE_THRESHOLD) {
      submitChallengeResult(true);
      return;
    }

    if (info.offset.x <= -SWIPE_THRESHOLD) {
      submitChallengeResult(false);
    }
  };

  const requestExit = (path: string) => {
    setExitTarget(path);
  };

  const confirmExit = () => {
    if (!exitTarget) return;
    router.push(exitTarget);
  };

  if (!game || !currentPlayer) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <p className="text-lg font-semibold">Loading Truth or Dare...</p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8">
      <AnimatedBackground />
      <div className="container mx-auto max-w-4xl space-y-6">
        <Card className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Truth or Dare
              </p>
              <h1 className="font-display text-4xl font-extrabold">
                Swipe Challenge
              </h1>
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Difficulty:{" "}
              <span className="capitalize">{game.settings.difficulty}</span>
            </p>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/75 p-4 dark:border-slate-700/80 dark:bg-slate-900/75">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Current Player
            </p>
            <p className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">
              {currentPlayer}
            </p>
          </div>

          {error && (
            <p className="rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-800 dark:bg-red-950/55 dark:text-red-200">
              {error}
            </p>
          )}

          {!game.currentChallenge || loadingChallenge ? (
            <div className="rounded-2xl border border-white/70 bg-white/75 p-8 text-center dark:border-slate-700/80 dark:bg-slate-900/75">
              <p className="text-lg font-semibold">
                Generating a new prompt...
              </p>
            </div>
          ) : (
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={onCardDragEnd}
              className="cursor-grab active:cursor-grabbing"
            >
              <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-xl dark:border-slate-700/80 dark:bg-slate-900/80">
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">
                  {game.currentChallenge.mode}
                </p>
                <p className="mt-4 text-2xl font-bold leading-relaxed text-slate-900 dark:text-slate-100">
                  {game.currentChallenge.question}
                </p>
                <p className="mt-4 text-sm text-muted-foreground">
                  Swipe left if not achieved. Swipe right if achieved.
                </p>
              </div>
            </motion.div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => submitChallengeResult(false)}
              disabled={!game.currentChallenge || loadingChallenge}
            >
              <XCircle className="mr-2 h-5 w-5" /> Not Achieved
            </Button>
            <Button
              size="lg"
              className="mobile-top-chrome"
              onClick={() => submitChallengeResult(true)}
              disabled={!game.currentChallenge || loadingChallenge}
            >
              <CheckCircle2 className="mr-2 h-5 w-5" /> Achieved
            </Button>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              size="lg"
              variant="ghost"
              onClick={() => requestExit("/game/truth-or-dare")}
            >
              <RotateCcw className="mr-2 h-5 w-5" /> Back to Setup
            </Button>
            <Button size="lg" variant="ghost" onClick={() => requestExit("/")}>
              Back to Home
            </Button>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-display text-2xl font-bold">Scoreboard</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {game.players.map((name) => (
              <li
                key={name}
                className="flex items-center justify-between rounded-xl border border-white/70 bg-white/75 px-3 py-2 font-semibold dark:border-slate-700/80 dark:bg-slate-900/75"
              >
                <span>{name}</span>
                <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-extrabold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                  {game.settings.scores[name] ?? 0} pt
                </span>
              </li>
            ))}
          </ul>

          <h3 className="pt-2 text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Recent Prompts
          </h3>
          <ul className="space-y-2">
            {game.history.length === 0 && (
              <li className="text-sm text-muted-foreground">
                No completed prompts yet.
              </li>
            )}
            {game.history.slice(0, 5).map((item, index) => (
              <li
                key={`${item.playerName}-${index}`}
                className="rounded-xl border border-white/70 bg-white/75 px-3 py-2 text-sm dark:border-slate-700/80 dark:bg-slate-900/75"
              >
                <p className="font-semibold">
                  {item.playerName} - {item.mode}
                </p>
                <p className="text-slate-700 dark:text-slate-200">
                  {item.question}
                </p>
                <p className="mt-1 font-semibold">
                  {item.achieved ? "Achieved" : "Not achieved"}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <ExitGameModal
        open={Boolean(exitTarget)}
        title="Leave Truth or Dare?"
        description="Leaving now may discard the current challenge progress."
        confirmLabel="Leave Game"
        onConfirm={confirmExit}
        onCancel={() => setExitTarget(null)}
      />
    </main>
  );
}
