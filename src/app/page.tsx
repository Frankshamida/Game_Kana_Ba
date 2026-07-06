"use client";

import { motion } from "framer-motion";
import { AnimatedBackground } from "@/components/game/animated-background";
import { GameCard } from "@/components/game/game-card";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-10 sm:px-6">
      <AnimatedBackground />
      <div className="container max-w-5xl">
        <section className="mx-auto max-w-3xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-5xl font-extrabold tracking-tight sm:text-6xl"
          >
            GatherUp
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground"
          >
            Play. Laugh. Connect.
          </motion.p>
        </section>

        <section className="mx-auto mt-10 max-w-3xl">
          <GameCard />
        </section>
      </div>
    </main>
  );
}
