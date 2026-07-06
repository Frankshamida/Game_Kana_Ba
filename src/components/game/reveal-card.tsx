"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { playFlipSound } from "@/lib/sfx";

interface RevealCardProps {
  isImpostor: boolean;
  secretWord: string;
  hint: string;
  showHint: boolean;
  onHide: () => void;
}

export function RevealCard({
  isImpostor,
  secretWord,
  hint,
  showHint,
  onHide,
}: RevealCardProps) {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => {
    setFlipped(true);
    playFlipSound();
  };

  return (
    <div className="space-y-5">
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        className="w-full"
        onClick={handleFlip}
        disabled={flipped}
      >
        <div
          className={`card3d relative mx-auto h-72 w-full max-w-xl ${flipped ? "flipped" : ""}`}
        >
          <div className="card3d-face glass absolute inset-0 grid place-items-center rounded-3xl p-5">
            <div className="text-center">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                Tap to Reveal
              </p>
              <h3 className="mt-2 font-display text-3xl font-bold">
                Flip Card
              </h3>
            </div>
          </div>

          <div className="card3d-face card3d-back glass absolute inset-0 rounded-3xl p-6">
            {isImpostor ? (
              <div className="space-y-4 text-left">
                <h3 className="font-display text-2xl font-bold">
                  You are the IMPOSTOR!
                </h3>
                <p className="text-sm uppercase tracking-wider text-muted-foreground">
                  {showHint ? "Hint" : "No Hint"}
                </p>
                <p className="text-3xl font-extrabold">
                  {showHint ? hint : "No hint this round."}
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-left">
                <h3 className="font-display text-2xl font-bold">
                  Your Secret Word
                </h3>
                <p className="text-sm uppercase tracking-wider text-muted-foreground">
                  Word
                </p>
                <p className="text-3xl font-extrabold">{secretWord}</p>
              </div>
            )}
          </div>
        </div>
      </motion.button>

      <Button size="xl" className="w-full" disabled={!flipped} onClick={onHide}>
        Hide Card
      </Button>
    </div>
  );
}
