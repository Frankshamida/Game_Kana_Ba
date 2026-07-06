"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { playTimerEndSound } from "@/lib/sfx";

const presets = [0, 1, 2, 3, 5, 10];

interface DiscussionTimerProps {
  onFinished: () => void;
  disabled?: boolean;
}

export function DiscussionTimer({
  onFinished,
  disabled = false,
}: DiscussionTimerProps) {
  const [minutes, setMinutes] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [running, secondsLeft]);

  useEffect(() => {
    if (!running) return;
    if (secondsLeft === 0) {
      setRunning(false);
      playTimerEndSound();
      onFinished();
    }
  }, [secondsLeft, running, onFinished]);

  const formatted = useMemo(() => {
    const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const secs = String(secondsLeft % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }, [secondsLeft]);

  const startTimer = () => {
    if (minutes === 0) return;
    setSecondsLeft(minutes * 60);
    setRunning(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {presets.map((preset) => (
          <Button
            key={preset}
            type="button"
            variant={minutes === preset ? "default" : "secondary"}
            onClick={() => {
              setMinutes(preset);
              setRunning(false);
              setSecondsLeft(0);
            }}
            disabled={disabled}
          >
            {preset === 0
              ? "No Timer"
              : `${preset} Minute${preset > 1 ? "s" : ""}`}
          </Button>
        ))}
      </div>

      {minutes > 0 ? (
        <div className="text-center">
          <p className="font-display text-6xl font-extrabold tabular-nums">
            {formatted}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={startTimer} disabled={running || disabled}>
              Start
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setRunning(false);
                setSecondsLeft(0);
              }}
              disabled={disabled}
            >
              Reset
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Choose a timer preset or discuss without a countdown.
        </p>
      )}
    </div>
  );
}
