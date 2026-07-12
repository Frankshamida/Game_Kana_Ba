"use client";

import { useEffect, useMemo, useState } from "react";
import { WifiOff, SignalHigh, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ConnectionQuality = {
  offline: boolean;
  slow: boolean;
  label: string;
  detail: string;
};

type NetworkNavigator = Navigator & {
  connection?: {
    effectiveType?: string;
    saveData?: boolean;
    downlink?: number;
    addEventListener?: (type: string, listener: () => void) => void;
    removeEventListener?: (type: string, listener: () => void) => void;
  };
  mozConnection?: {
    effectiveType?: string;
    saveData?: boolean;
    downlink?: number;
    addEventListener?: (type: string, listener: () => void) => void;
    removeEventListener?: (type: string, listener: () => void) => void;
  };
  webkitConnection?: {
    effectiveType?: string;
    saveData?: boolean;
    downlink?: number;
    addEventListener?: (type: string, listener: () => void) => void;
    removeEventListener?: (type: string, listener: () => void) => void;
  };
};

const HIDE_KEY = "network-status-dismissed";

function getConnectionQuality(): ConnectionQuality {
  if (typeof navigator === "undefined") {
    return {
      offline: false,
      slow: false,
      label: "Checking connection...",
      detail: "",
    };
  }

  const offline = !navigator.onLine;
  const nav = navigator as NetworkNavigator;
  const connection =
    nav.connection ?? nav.mozConnection ?? nav.webkitConnection ?? null;

  const effectiveType = connection?.effectiveType ?? "unknown";
  const saveData = Boolean(connection?.saveData);
  const downlink = connection?.downlink ?? 10;

  const slow =
    !offline &&
    (saveData ||
      effectiveType === "slow-2g" ||
      effectiveType === "2g" ||
      downlink < 1.2);

  if (offline) {
    return {
      offline: true,
      slow: false,
      label: "No internet connection",
      detail:
        "Your device looks offline. The app will keep running, but live rooms and AI features may not load until you reconnect.",
    };
  }

  if (slow) {
    return {
      offline: false,
      slow: true,
      label: "Slow internet detected",
      detail:
        "Your connection looks weak or data-saving mode is on. Expect slower loading on rooms, images, and AI requests.",
    };
  }

  return {
    offline: false,
    slow: false,
    label: "",
    detail: "",
  };
}

const INITIAL_QUALITY: ConnectionQuality = {
  offline: false,
  slow: false,
  label: "",
  detail: "",
};

export function NetworkStatusModal() {
  const [quality, setQuality] = useState<ConnectionQuality>(INITIAL_QUALITY);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(HIDE_KEY);
    setDismissed(stored === "true");

    const update = () => setQuality(getConnectionQuality());
    update();

    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    const nav = navigator as NetworkNavigator;
    const connection =
      nav.connection ?? nav.mozConnection ?? nav.webkitConnection ?? null;

    connection?.addEventListener?.("change", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      connection?.removeEventListener?.("change", update);
    };
  }, []);

  const shouldShow = useMemo(
    () => !dismissed && (quality.offline || quality.slow),
    [dismissed, quality.offline, quality.slow],
  );

  useEffect(() => {
    if (!quality.offline && !quality.slow) {
      setDismissed(false);
      window.localStorage.removeItem(HIDE_KEY);
    }
  }, [quality.offline, quality.slow]);

  if (!shouldShow) return null;

  const Icon = quality.offline
    ? WifiOff
    : quality.slow
      ? SignalHigh
      : TriangleAlert;

  const dismiss = () => {
    setDismissed(true);
    window.localStorage.setItem(HIDE_KEY, "true");
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 px-4 pb-4 pt-24 backdrop-blur-sm md:items-start md:pt-6">
      <Card className="w-full max-w-md space-y-4 border-white/70 bg-slate-950/95 p-5 text-white shadow-[0_24px_70px_rgba(2,6,23,0.45)] dark:border-primary/20">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white/10 p-2 ring-1 ring-white/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">
              Connection check
            </p>
            <h2 className="text-lg font-black">{quality.label}</h2>
            <p className="text-sm text-slate-200/90">{quality.detail}</p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full p-1 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Dismiss network warning"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => window.location.reload()}
          >
            Try again
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={dismiss}
          >
            Continue
          </Button>
        </div>
      </Card>
    </div>
  );
}
