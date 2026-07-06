import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function GameCard() {
  return (
    <div className="grid gap-5">
      <Card className="relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-300/40 blur-2xl" />
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Featured Game
        </p>
        <h3 className="mt-2 font-display text-3xl font-bold">
          Who&apos;s the Impostor?
        </h3>
        <p className="mt-3 text-muted-foreground">
          One clue. One impostor. Outsmart your friends before time runs out,
          whether you play locally or on separate phones.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button asChild size="xl" className="w-full sm:w-auto">
            <Link href="/game/impostor">
              Play <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            asChild
            size="xl"
            variant="secondary"
            className="w-full sm:w-auto"
          >
            <Link href="/game/impostor#create-game">Create Game</Link>
          </Button>
          <Button
            asChild
            size="xl"
            variant="ghost"
            className="w-full sm:w-auto"
          >
            <Link href="/game/impostor#join-game">Join A Game</Link>
          </Button>
        </div>
      </Card>

      <Card className="relative overflow-hidden">
        <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-amber-300/35 blur-2xl" />
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          New Game
        </p>
        <h3 className="mt-2 font-display text-3xl font-bold">Truth or Dare</h3>
        <p className="mt-3 text-muted-foreground">
          Brave dares, real truths, and nonstop laughs. Swipe left for not
          achieved, right for achieved.
        </p>
        <Button asChild size="xl" className="mt-6 w-full sm:w-auto">
          <Link href="/game/truth-or-dare">
            Play <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </Card>

      <Card className="relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-emerald-300/35 blur-2xl" />
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Reflection Session
        </p>
        <h3 className="mt-2 font-display text-3xl font-bold">
          Let&apos;s Talk: Spiritual Life
        </h3>
        <p className="mt-3 text-muted-foreground">
          Deep, heartfelt questions that spark honest stories, healing moments,
          and stronger connections.
        </p>
        <Button asChild size="xl" className="mt-6 w-full sm:w-auto">
          <Link href="/game/spiritual-talk">
            Play <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </Card>
    </div>
  );
}
