import { AnimatedBackground } from "@/components/game/animated-background";
import { GameCard } from "@/components/game/game-card";

export default function GamesPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-10 sm:px-6">
      <AnimatedBackground />
      <div className="container mx-auto max-w-4xl">
        <section className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">
            Games
          </p>
          <h1 className="mt-2 font-display text-5xl font-extrabold tracking-tight sm:text-6xl">
            Choose Your Game
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Pick one and start playing with your friends.
          </p>
        </section>

        <section className="mx-auto mt-10 max-w-3xl">
          <GameCard />
        </section>
      </div>
    </main>
  );
}
