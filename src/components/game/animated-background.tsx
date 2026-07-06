"use client";

import { motion, useReducedMotion } from "framer-motion";

export function AnimatedBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute -left-16 top-8 h-56 w-56 rounded-full bg-cyan-300/45 blur-3xl"
        animate={
          reduceMotion ? undefined : { x: [0, 30, -20, 0], y: [0, -20, 10, 0] }
        }
        transition={
          reduceMotion ? undefined : { duration: 14, repeat: Infinity }
        }
      />
      <motion.div
        className="absolute right-0 top-1/4 h-72 w-72 rounded-full bg-emerald-300/35 blur-3xl max-sm:hidden"
        animate={
          reduceMotion ? undefined : { x: [0, -30, 10, 0], y: [0, 25, -15, 0] }
        }
        transition={
          reduceMotion ? undefined : { duration: 16, repeat: Infinity }
        }
      />
      <motion.div
        className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-amber-300/35 blur-3xl max-sm:hidden"
        animate={
          reduceMotion ? undefined : { x: [0, 30, -20, 0], y: [0, -20, 15, 0] }
        }
        transition={
          reduceMotion ? undefined : { duration: 13, repeat: Infinity }
        }
      />
    </div>
  );
}
