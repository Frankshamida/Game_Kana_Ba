"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, HeartHandshake, RotateCcw, XCircle } from "lucide-react";
import { AnimatedBackground } from "@/components/game/animated-background";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AISpiritualTalkPayload,
  SpiritualTalkPrompt,
  SpiritualTalkSession,
} from "@/lib/types";

const SWIPE_THRESHOLD = 120;

export default function SpiritualTalkPlayPage() {
  const router = useRouter();
  const [session, setSession] = useState<SpiritualTalkSession | null>(null);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      document.documentElement.classList.toggle("dark", storedTheme === "dark");
    }

    const raw = sessionStorage.getItem("spiritualTalkSession");
    if (!raw) {
      router.replace("/game/spiritual-talk");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as SpiritualTalkSession;
      if (
        !parsed ||
        !Array.isArray(parsed.players) ||
        parsed.players.length < 2
      ) {
        router.replace("/game/spiritual-talk");
        return;
      }

      if (!parsed.questionStyle) {
        parsed.questionStyle = "mixed";
      }

      setSession(parsed);
    } catch {
      router.replace("/game/spiritual-talk");
    }
  }, [router]);

  const currentPlayer = useMemo(() => {
    if (!session || session.players.length === 0) return null;
    const index = session.currentTurn % session.players.length;
    return session.players[index] ?? null;
  }, [session]);

  const saveSession = (next: SpiritualTalkSession) => {
    setSession(next);
    sessionStorage.setItem("spiritualTalkSession", JSON.stringify(next));
  };

  const fetchPrompt = async (targetPlayer: string) => {
    if (!session) return;

    setLoadingPrompt(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/spiritual-talk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: targetPlayer,
          players: session.players,
          questionStyle: session.questionStyle,
        }),
      });

      if (!response.ok) {
        const body = await response
          .json()
          .catch(() => ({ error: "Failed to generate spiritual prompt." }));
        throw new Error(body.error ?? "Failed to generate spiritual prompt.");
      }

      const payload = (await response.json()) as AISpiritualTalkPayload;
      const prompt: SpiritualTalkPrompt = {
        playerName: targetPlayer,
        question: payload.question,
        language: payload.language,
        achieved: null,
      };

      saveSession({
        ...session,
        currentPrompt: prompt,
      });
    } catch (promptError) {
      setError(
        promptError instanceof Error
          ? promptError.message
          : "Could not generate spiritual reflection prompt.",
      );
    } finally {
      setLoadingPrompt(false);
    }
  };

  useEffect(() => {
    if (!session || !currentPlayer || session.currentPrompt || loadingPrompt)
      return;
    void fetchPrompt(currentPlayer);
  }, [currentPlayer, loadingPrompt, session]);

  const submitPromptResult = (achieved: boolean) => {
    if (!session || !session.currentPrompt) return;

    const resolved: SpiritualTalkPrompt = {
      ...session.currentPrompt,
      achieved,
    };

    const nextScores = { ...session.scores };
    if (achieved) {
      nextScores[resolved.playerName] =
        (nextScores[resolved.playerName] ?? 0) + 1;
    }

    const nextSession: SpiritualTalkSession = {
      ...session,
      currentTurn: session.currentTurn + 1,
      scores: nextScores,
      currentPrompt: null,
      history: [resolved, ...session.history].slice(0, 20),
    };

    saveSession(nextSession);
  };

  const onCardDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number } },
  ) => {
    if (info.offset.x >= SWIPE_THRESHOLD) {
      submitPromptResult(true);
      return;
    }

    if (info.offset.x <= -SWIPE_THRESHOLD) {
      submitPromptResult(false);
    }
  };

  if (!session || !currentPlayer) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <p className="text-lg font-semibold">Loading spiritual session...</p>
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
                Let&apos;s Talk: Spiritual Life
              </p>
              <h1 className="font-display text-4xl font-extrabold">
                Reflection Swipe
              </h1>
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Swipe left if player passed, right if player shared
            </p>
          </div>

          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Style: <span className="capitalize">{session.questionStyle}</span>
          </p>

          <div className="rounded-2xl border border-white/70 bg-white/75 p-4 dark:border-slate-700/80 dark:bg-slate-900/75">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Sharing Person
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

          {!session.currentPrompt || loadingPrompt ? (
            <div className="rounded-2xl border border-white/70 bg-white/75 p-8 text-center dark:border-slate-700/80 dark:bg-slate-900/75">
              <p className="text-lg font-semibold">
                Generating a spiritual reflection question...
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
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
                  Spiritual Reflection
                </p>
                <p className="mt-4 text-2xl font-bold leading-relaxed text-slate-900 dark:text-slate-100">
                  {session.currentPrompt.question}
                </p>
                <p className="mt-4 text-sm text-muted-foreground">
                  Swipe left if player passed, swipe right if player shared.
                </p>
              </div>
            </motion.div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => submitPromptResult(false)}
              disabled={!session.currentPrompt || loadingPrompt}
            >
              <XCircle className="mr-2 h-5 w-5" /> Pass for Now
            </Button>
            <Button
              size="lg"
              onClick={() => submitPromptResult(true)}
              disabled={!session.currentPrompt || loadingPrompt}
            >
              <CheckCircle2 className="mr-2 h-5 w-5" /> Shared Answer
            </Button>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              size="lg"
              variant="ghost"
              onClick={() => router.push("/game/spiritual-talk")}
            >
              <RotateCcw className="mr-2 h-5 w-5" /> Back to Setup
            </Button>
            <Button size="lg" variant="ghost" onClick={() => router.push("/")}>
              Back to Home
            </Button>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
            <HeartHandshake className="h-6 w-6" /> Growth Scoreboard
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {session.players.map((name) => (
              <li
                key={name}
                className="flex items-center justify-between rounded-xl border border-white/70 bg-white/75 px-3 py-2 font-semibold dark:border-slate-700/80 dark:bg-slate-900/75"
              >
                <span>{name}</span>
                <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-extrabold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                  {session.scores[name] ?? 0} pt
                </span>
              </li>
            ))}
          </ul>

          <h3 className="pt-2 text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Recent Reflections
          </h3>
          <ul className="space-y-2">
            {session.history.length === 0 && (
              <li className="text-sm text-muted-foreground">
                No completed reflections yet.
              </li>
            )}
            {session.history.slice(0, 5).map((item, index) => (
              <li
                key={`${item.playerName}-${index}`}
                className="rounded-xl border border-white/70 bg-white/75 px-3 py-2 text-sm dark:border-slate-700/80 dark:bg-slate-900/75"
              >
                <p className="font-semibold">{item.playerName}</p>
                <p className="text-slate-700 dark:text-slate-200">
                  {item.question}
                </p>
                <p className="mt-1 font-semibold">
                  {item.achieved ? "Shared Answer" : "Pass for Now"}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </main>
  );
}
