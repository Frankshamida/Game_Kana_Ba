"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const registerServiceWorker = async () => {
      if (!("serviceWorker" in navigator)) {
        return;
      }

      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        // PWA still works as a normal website if the service worker fails.
      }
    };

    void registerServiceWorker();
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    if (isIos && !isStandalone) {
      setVisible(true);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (installed || !visible) {
    return null;
  }

  const installApp = async () => {
    if (!deferredPrompt) {
      setVisible(false);
      return;
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  const isIos = /iphone|ipad|ipod/i.test(
    typeof navigator !== "undefined" ? navigator.userAgent : "",
  );

  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-4">
      <div className="w-full max-w-md rounded-3xl border border-cyan-200/70 bg-slate-950/95 p-4 text-white shadow-[0_24px_70px_rgba(2,6,23,0.45)] backdrop-blur-xl dark:border-cyan-500/20">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-cyan-400/15 p-2 text-cyan-200">
            <Download className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200/90">
              Install GatherUp
            </p>
            <p className="text-sm text-slate-200/90">
              {isIos
                ? "On iPhone or iPad, tap Share and choose Add to Home Screen."
                : "Install this app for a faster, home-screen experience on your device."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="rounded-full p-1 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex gap-3">
          <Button
            type="button"
            className="flex-1 bg-cyan-500 text-slate-950 hover:bg-cyan-400"
            onClick={() => void installApp()}
            disabled={isIos && !deferredPrompt}
          >
            {isIos && !deferredPrompt ? "Use Share Menu" : "Install App"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => setVisible(false)}
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}
