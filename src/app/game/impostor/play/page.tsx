"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Crown, ShieldAlert, Sparkles, Users } from "lucide-react";
import { AnimatedBackground } from "@/components/game/animated-background";
import { DiscussionTimer } from "@/components/game/discussion-timer";
import { ExitGameModal } from "@/components/game/exit-game-modal";
import { RevealCard } from "@/components/game/reveal-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HintDifficulty, ImpostorGameSession } from "@/lib/types";

const HINT_DIFFICULTIES: HintDifficulty[] = [
  "easy",
  "normal",
  "hard",
  "difficult",
];

type Phase =
  | "loading"
  | "reveal"
  | "discussion"
  | "timesup"
  | "voting"
  | "result";
type VoteMap = Record<string, string>;

export default function ImpostorPlayPage() {
  const router = useRouter();
  const [game, setGame] = useState<ImpostorGameSession | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [index, setIndex] = useState(0);
  const [showRevealCard, setShowRevealCard] = useState(false);
  const [votes, setVotes] = useState<VoteMap>({});
  const [currentVoterIndex, setCurrentVoterIndex] = useState(0);
  const [roundScored, setRoundScored] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [exitTarget, setExitTarget] = useState<string | null>(null);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (!storedTheme) return;

    document.documentElement.classList.toggle("dark", storedTheme === "dark");
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("impostorGame");
    if (!raw) {
      router.replace("/game/impostor");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<ImpostorGameSession>;
      if (!parsed || !Array.isArray(parsed.players)) {
        router.replace("/game/impostor");
        return;
      }

      const normalizedGame: ImpostorGameSession = {
        ...(parsed as Omit<ImpostorGameSession, "settings">),
        settings: {
          hideHint: Boolean(parsed.settings?.hideHint),
          impostorCount:
            typeof parsed.settings?.impostorCount === "number" &&
            Number.isFinite(parsed.settings.impostorCount)
              ? Math.min(
                  3,
                  Math.max(1, Math.trunc(parsed.settings.impostorCount)),
                )
              : 1,
          hintDifficulty: HINT_DIFFICULTIES.includes(
            parsed.settings?.hintDifficulty as HintDifficulty,
          )
            ? (parsed.settings?.hintDifficulty as HintDifficulty)
            : "normal",
          scores: Array.isArray(parsed.players)
            ? Object.fromEntries(
                parsed.players
                  .filter(
                    (player): player is { name: string; isImpostor: boolean } =>
                      typeof player?.name === "string",
                  )
                  .map((player) => [
                    player.name,
                    parsed.settings?.scores?.[player.name] ?? 0,
                  ]),
              )
            : {},
          usedWords: Array.isArray(parsed.settings?.usedWords)
            ? parsed.settings.usedWords
                .filter((word): word is string => typeof word === "string")
                .map((word) => word.trim())
                .filter(Boolean)
            : [String(parsed.secretWord ?? "").trim()].filter(Boolean),
        },
      };

      if (
        !normalizedGame.settings.usedWords.includes(normalizedGame.secretWord)
      ) {
        normalizedGame.settings.usedWords = [
          ...normalizedGame.settings.usedWords,
          normalizedGame.secretWord,
        ];
      }

      setGame(normalizedGame);
      setVotes({});
      setCurrentVoterIndex(0);
      setRoundScored(false);
      setPhase("reveal");
    } catch {
      router.replace("/game/impostor");
    }
  }, [router]);

  const currentPlayer = useMemo(
    () => game?.players[index] ?? null,
    [game, index],
  );

  const impostors = useMemo(
    () => game?.players.filter((player) => player.isImpostor) ?? [],
    [game],
  );

  const voteCounts = useMemo(() => {
    if (!game) return {} as Record<string, number>;

    const counts = Object.fromEntries(game.players.map((p) => [p.name, 0]));
    for (const votedName of Object.values(votes)) {
      if (votedName in counts) {
        counts[votedName] += 1;
      }
    }

    return counts;
  }, [game, votes]);

  const totalVotesCast = Object.keys(votes).length;
  const totalVoters = game?.players.length ?? 0;
  const votingComplete = totalVoters > 0 && totalVotesCast >= totalVoters;
  const maxVotes = Math.max(0, ...Object.values(voteCounts));
  const topVotedPlayers = Object.entries(voteCounts)
    .filter(([, count]) => count === maxVotes && count > 0)
    .map(([name]) => name);
  const hasMajority = maxVotes > Math.floor(totalVoters / 2);
  const majorityHitImpostor =
    hasMajority &&
    topVotedPlayers.some((name) =>
      impostors.some((impostor) => impostor.name === name),
    );

  useEffect(() => {
    if (!game || phase !== "result" || !votingComplete || roundScored) return;

    const nextScores = { ...game.settings.scores };
    for (const player of game.players) {
      if (!(player.name in nextScores)) {
        nextScores[player.name] = 0;
      }
    }

    if (majorityHitImpostor) {
      for (const player of game.players) {
        if (!player.isImpostor) {
          nextScores[player.name] += 1;
        }
      }
    } else {
      for (const player of game.players) {
        if (player.isImpostor) {
          nextScores[player.name] += 1;
        }
      }
    }

    const nextGame: ImpostorGameSession = {
      ...game,
      settings: {
        ...game.settings,
        scores: nextScores,
      },
    };

    setGame(nextGame);
    sessionStorage.setItem("impostorGame", JSON.stringify(nextGame));
    setRoundScored(true);
  }, [
    game,
    hasMajority,
    majorityHitImpostor,
    phase,
    roundScored,
    votingComplete,
  ]);

  if (!game || !currentPlayer) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <p className="text-lg font-semibold">Loading game...</p>
      </main>
    );
  }

  const goNext = () => {
    setShowRevealCard(false);
    if (index >= game.players.length - 1) {
      setPhase("discussion");
      return;
    }
    setIndex((v) => v + 1);
  };

  const startVoting = () => {
    setVotes({});
    setCurrentVoterIndex(0);
    setRoundScored(false);
    setPhase("voting");
  };

  const currentVoter = game.players[currentVoterIndex] ?? null;

  const castVote = (targetName: string) => {
    if (!currentVoter || votingComplete) return;

    setVotes((prev) => ({
      ...prev,
      [currentVoter.name]: targetName,
    }));

    setCurrentVoterIndex((prev) => Math.min(prev + 1, game.players.length));
  };

  const resetGameSamePlayers = async () => {
    setResetLoading(true);
    setResetError(null);

    try {
      const playerNames = game.players.map((player) => player.name);
      const response = await fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          players: playerNames,
          impostorCount: game.settings.impostorCount,
          hintDifficulty: game.settings.hintDifficulty,
          excludedWords: game.settings.usedWords,
        }),
      });

      if (!response.ok) {
        const body = await response
          .json()
          .catch(() => ({ error: "Failed to reset game." }));
        throw new Error(body.error ?? "Failed to reset game.");
      }

      const payload = (await response.json()) as Omit<
        ImpostorGameSession,
        "settings"
      >;
      const usedWordsSet = new Set(
        [...game.settings.usedWords, payload.secretWord].map((word) =>
          word.trim().toLowerCase(),
        ),
      );
      const mergedUsedWords: string[] = [];
      for (const word of [...game.settings.usedWords, payload.secretWord]) {
        const trimmed = word.trim();
        if (!trimmed) continue;
        const key = trimmed.toLowerCase();
        if (!usedWordsSet.has(key)) continue;
        if (mergedUsedWords.some((item) => item.toLowerCase() === key))
          continue;
        mergedUsedWords.push(trimmed);
      }

      const sessionPayload: ImpostorGameSession = {
        ...payload,
        settings: {
          ...game.settings,
          scores: game.settings.scores,
          usedWords: mergedUsedWords,
        },
      };

      sessionStorage.setItem("impostorGame", JSON.stringify(sessionPayload));
      setGame(sessionPayload);
      setIndex(0);
      setShowRevealCard(false);
      setVotes({});
      setCurrentVoterIndex(0);
      setRoundScored(false);
      setPhase("reveal");
    } catch (error) {
      setResetError(
        error instanceof Error ? error.message : "Failed to reset game.",
      );
    } finally {
      setResetLoading(false);
    }
  };

  const requestExit = (path: string) => {
    setExitTarget(path);
  };

  const confirmExit = () => {
    if (!exitTarget) return;
    router.push(exitTarget);
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8">
      <AnimatedBackground />
      <div className="container mx-auto max-w-3xl">
        <div className="mb-4 flex justify-start">
          <Button
            size="default"
            variant="ghost"
            className="mobile-top-chrome"
            onClick={() => requestExit("/")}
          >
            Back to Home
          </Button>
        </div>

        {phase === "reveal" && (
          <Card>
            {!showRevealCard ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 text-center"
              >
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                  Player {index + 1} of {game.players.length}
                </p>
                <h1 className="font-display text-4xl font-extrabold">
                  Pass the device to {currentPlayer.name}
                </h1>
                <Button
                  size="xl"
                  className="w-full"
                  onClick={() => setShowRevealCard(true)}
                >
                  Tap to Reveal
                </Button>
              </motion.div>
            ) : (
              <RevealCard
                isImpostor={currentPlayer.isImpostor}
                secretWord={game.secretWord}
                hint={game.hint}
                showHint={!game.settings.hideHint}
                onHide={goNext}
              />
            )}
          </Card>
        )}

        {phase === "discussion" && (
          <Card className="space-y-6 text-center">
            <h2 className="font-display text-4xl font-extrabold">
              Everyone knows their role!
            </h2>
            <p className="text-lg text-muted-foreground">Start discussing.</p>
            <DiscussionTimer onFinished={() => setPhase("timesup")} />
            <Button variant="secondary" size="lg" onClick={startVoting}>
              Start Voting
            </Button>
          </Card>
        )}

        {phase === "timesup" && (
          <Card className="space-y-5 text-center">
            <h2 className="font-display text-5xl font-extrabold">
              Time&apos;s Up!
            </h2>
            {resetError && (
              <p className="rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-800 dark:bg-red-950/55 dark:text-red-200">
                {resetError}
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" onClick={startVoting}>
                Go to Voting
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={resetGameSamePlayers}
                disabled={resetLoading}
              >
                {resetLoading ? "Resetting..." : "Play Again"}
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="mobile-top-chrome"
                onClick={() => requestExit("/")}
              >
                Back to Home
              </Button>
            </div>
          </Card>
        )}

        {phase === "voting" && (
          <Card className="space-y-5">
            <div className="text-center">
              <h2 className="font-display text-4xl font-extrabold">
                Voting Time
              </h2>
              <p className="mt-2 text-muted-foreground">
                Tap a name to vote for the impostor.
              </p>
            </div>
            {!votingComplete && currentVoter && (
              <div className="rounded-2xl border border-border bg-card/75 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Current Voter
                </p>
                <p className="mt-2 text-2xl font-black">{currentVoter.name}</p>
              </div>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {game.players.map((player) => (
                <Button
                  key={player.name}
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="justify-between"
                  onClick={() => castVote(player.name)}
                  disabled={!currentVoter || votingComplete}
                >
                  <span>{player.name}</span>
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-extrabold text-primary">
                    {voteCounts[player.name] ?? 0}
                  </span>
                </Button>
              ))}
            </div>
            className="mobile-top-chrome"
            <p className="text-sm text-muted-foreground">
              Votes submitted: {totalVotesCast}/{totalVoters}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={() => setPhase("result")}
                disabled={!votingComplete}
              >
                Reveal Result
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => setPhase("timesup")}
              >
                Back
              </Button>
            </div>
          </Card>
        )}

        {phase === "result" && (
          <Card className="space-y-6">
            <div className="rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-100/80 via-cyan-100/70 to-emerald-100/70 p-4 dark:border-sky-800/80 dark:from-sky-950/45 dark:via-cyan-950/35 dark:to-emerald-950/35">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-sky-900 dark:text-sky-100">
                <Crown className="h-4 w-4" /> Match Result
              </p>
              <h2 className="mt-2 font-display text-4xl font-extrabold">
                Reveal Results
              </h2>
              <p className="mt-2 text-base text-foreground">
                {impostors.length > 1 ? "Impostors" : "Impostor"}:{" "}
                <span className="font-bold text-foreground">
                  {impostors.length > 0
                    ? impostors.map((player) => player.name).join(", ")
                    : "Unknown"}
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card/75 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Voting Outcome
              </p>
              {!votingComplete ? (
                <p className="mt-2 font-semibold text-amber-700 dark:text-amber-300">
                  Voting was not completed, so no points were awarded.
                </p>
              ) : majorityHitImpostor ? (
                <p className="mt-2 font-semibold text-emerald-700 dark:text-emerald-300">
                  Majority caught the impostor. Non-impostor players gained +1
                  point.
                </p>
              ) : (
                <p className="mt-2 font-semibold text-red-700 dark:text-red-300">
                  The impostor avoided the majority vote. Impostor player(s)
                  gained +1 point.
                </p>
              )}
              <p className="mt-2 text-sm text-foreground">
                Top vote:{" "}
                {topVotedPlayers.length > 0
                  ? topVotedPlayers.join(", ")
                  : "No vote"}{" "}
                ({maxVotes} vote{maxVotes === 1 ? "" : "s"})
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card/75 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Language
                </p>
                <p className="mt-1 text-lg font-extrabold">{game.language}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card/75 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Impostor Count
                </p>
                <p className="mt-1 text-lg font-extrabold">
                  {game.settings.impostorCount}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card/75 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Difficulty
                </p>
                <p className="mt-1 flex items-center gap-2 text-lg font-extrabold capitalize">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {game.settings.hintDifficulty}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Secret Word
                </p>
                <p className="mt-2 text-xl font-black text-foreground">
                  {game.secretWord}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Hint
                </p>
                <p className="mt-2 text-base font-semibold text-foreground">
                  {game.settings.hideHint
                    ? "Hint was hidden in this round."
                    : game.hint}
                </p>
              </div>
            </div>

            {resetError && (
              <p className="rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-800 dark:bg-red-950/55 dark:text-red-200">
                {resetError}
              </p>
            )}

            <div className="rounded-2xl border border-border bg-card/75 p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-foreground">
                <Users className="h-4 w-4" /> Players
              </p>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {game.players.map((player) => (
                  <li
                    key={player.name}
                    className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground"
                  >
                    <div className="flex items-center gap-2">
                      <span>{player.name}</span>
                      {player.isImpostor && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-2 py-1 text-xs font-bold uppercase tracking-wider text-red-700 dark:bg-red-950/55 dark:text-red-200">
                          <ShieldAlert className="h-3.5 w-3.5" /> Impostor
                        </span>
                      )}
                    </div>
                    <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-extrabold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                      {game.settings.scores[player.name] ?? 0} pt
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-start">
              <Button
                size="lg"
                onClick={resetGameSamePlayers}
                disabled={resetLoading}
                className="sm:min-w-40"
              >
                {resetLoading ? "Resetting..." : "Play Again"}
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => requestExit("/")}
                className="sm:min-w-40"
              >
                Back to Home
              </Button>
            </div>
          </Card>
        )}
      </div>

      <ExitGameModal
        open={Boolean(exitTarget)}
        title="Leave this Impostor game?"
        description="If you exit now, your current round progress may be lost."
        confirmLabel="Leave Game"
        onConfirm={confirmExit}
        onCancel={() => setExitTarget(null)}
      />
    </main>
  );
}
