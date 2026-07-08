"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { usePathname } from "next/navigation";

const SWIPE_THRESHOLD = 48;
const AUTO_HIDE_MS = 5000;

export function MobileChromeController() {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [topOpen, setTopOpen] = useState(false);
  const [bottomOpen, setBottomOpen] = useState(false);
  const [topStartY, setTopStartY] = useState<number | null>(null);
  const [bottomStartY, setBottomStartY] = useState<number | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");

    const sync = () => setIsMobile(query.matches);
    sync();

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", sync);
      return () => query.removeEventListener("change", sync);
    }

    query.addListener(sync);
    return () => query.removeListener(sync);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setTopOpen(true);
      setBottomOpen(true);
      return;
    }

    setTopOpen(false);
    setBottomOpen(false);
  }, [isMobile, pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.body.dataset.mobileTopChrome =
      isMobile && !topOpen ? "closed" : "open";
    document.body.dataset.mobileBottomChrome =
      isMobile && !bottomOpen ? "closed" : "open";
  }, [isMobile, topOpen, bottomOpen]);

  useEffect(() => {
    if (!isMobile) return;

    if (topOpen) {
      const timeout = window.setTimeout(() => setTopOpen(false), AUTO_HIDE_MS);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [isMobile, topOpen]);

  useEffect(() => {
    if (!isMobile) return;

    if (bottomOpen) {
      const timeout = window.setTimeout(
        () => setBottomOpen(false),
        AUTO_HIDE_MS,
      );
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [isMobile, bottomOpen]);

  if (!isMobile) return null;

  const revealTopChrome = () => setTopOpen(true);
  const revealBottomChrome = () => setBottomOpen(true);

  return (
    <>
      <div
        className="fixed inset-x-0 top-0 z-[55] flex h-10 items-start justify-center md:hidden"
        aria-hidden="true"
        onTouchStart={(event) =>
          setTopStartY(event.touches[0]?.clientY ?? null)
        }
        onTouchEnd={(event) => {
          const endY = event.changedTouches[0]?.clientY;

          if (
            topStartY !== null &&
            endY !== undefined &&
            endY - topStartY > SWIPE_THRESHOLD
          ) {
            revealTopChrome();
          }

          setTopStartY(null);
        }}
        onClick={revealTopChrome}
      >
        <div className="mt-2 flex items-center gap-2 rounded-full border border-white/35 bg-slate-950/55 px-3 py-1 text-[11px] font-semibold text-white/70 shadow-lg backdrop-blur-md">
          <ChevronDown className="h-3.5 w-3.5" />
          Swipe down
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-[55] flex h-14 items-end justify-center md:hidden"
        aria-hidden="true"
        onTouchStart={(event) =>
          setBottomStartY(event.touches[0]?.clientY ?? null)
        }
        onTouchEnd={(event) => {
          const endY = event.changedTouches[0]?.clientY;

          if (
            bottomStartY !== null &&
            endY !== undefined &&
            bottomStartY - endY > SWIPE_THRESHOLD
          ) {
            revealBottomChrome();
          }

          setBottomStartY(null);
        }}
        onClick={revealBottomChrome}
      >
        <div className="mb-[calc(env(safe-area-inset-bottom)+0.5rem)] flex items-center gap-2 rounded-full border border-white/35 bg-slate-950/55 px-3 py-1 text-[11px] font-semibold text-white/70 shadow-lg backdrop-blur-md">
          <ChevronUp className="h-3.5 w-3.5" />
          Swipe up
        </div>
      </div>
    </>
  );
}
