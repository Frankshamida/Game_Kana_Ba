"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Gamepad2, Home, Info, Settings, Users } from "lucide-react";
import { ExitGameModal } from "@/components/game/exit-game-modal";
import {
  type ImpostorRoomPlayer,
  type RemoteImpostorSession,
} from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (pathname: string) => boolean;
}

function isRoomPath(pathname: string) {
  return (
    pathname.startsWith("/game/impostor/join") ||
    pathname.startsWith("/game/impostor/lobby") ||
    pathname.startsWith("/game/impostor/remote") ||
    pathname.startsWith("/game/impostor/create")
  );
}

const navItems: NavItem[] = [
  {
    href: "/game",
    label: "Games",
    icon: Gamepad2,
    match: (pathname) => pathname.startsWith("/game") && !isRoomPath(pathname),
  },
  {
    href: "/about",
    label: "About",
    icon: Info,
    match: (pathname) => pathname === "/about",
  },
  {
    href: "/",
    label: "Home",
    icon: Home,
    match: (pathname) => pathname === "/",
  },
  {
    href: "/game/impostor/join",
    label: "Rooms",
    icon: Users,
    match: (pathname) => isRoomPath(pathname),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    match: (pathname) => pathname === "/settings",
  },
];

export function MobileNavbar() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [exitMessage, setExitMessage] = useState<string | null>(null);

  const inRemoteRoom =
    pathname.startsWith("/game/impostor/lobby") ||
    pathname.startsWith("/game/impostor/remote");

  const inLocalPlay =
    pathname.startsWith("/game/impostor/play") ||
    pathname.startsWith("/game/truth-or-dare/play") ||
    pathname.startsWith("/game/spiritual-talk/play");

  const shouldTrapExit = inRemoteRoom || inLocalPlay;

  const handleNavClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (!shouldTrapExit || href === pathname) return;

    event.preventDefault();
    setPendingHref(href);

    if (inRemoteRoom) {
      void loadRoomExitMessage();
      return;
    }

    setExitMessage(null);
  };

  const loadRoomExitMessage = async () => {
    try {
      const roomRaw = sessionStorage.getItem("remoteImpostorSession");
      if (!roomRaw) {
        setExitMessage(null);
        return;
      }

      const parsed = JSON.parse(roomRaw) as RemoteImpostorSession;
      if (!parsed?.roomCode || !parsed?.playerToken) {
        setExitMessage(null);
        return;
      }

      const response = await fetch(
        `/api/impostor/rooms/${parsed.roomCode.toUpperCase()}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        setExitMessage(null);
        return;
      }

      const body = (await response.json()) as {
        players?: ImpostorRoomPlayer[];
      };
      const players = Array.isArray(body.players) ? body.players : [];

      const currentPlayer = players.find(
        (player) => player.playerToken === parsed.playerToken,
      );
      const remainingPlayers = players.filter(
        (player) => player.playerToken !== parsed.playerToken,
      );

      if (remainingPlayers.length === 0) {
        setExitMessage(
          "If you leave now, the room will be deleted automatically because no players will remain.",
        );
        return;
      }

      if (currentPlayer?.isHost) {
        setExitMessage(
          `If you leave now, ${remainingPlayers[0].playerName} will become the new host.`,
        );
        return;
      }

      setExitMessage(
        "If you leave now, the room will continue for the remaining players.",
      );
    } catch {
      setExitMessage(null);
    }
  };

  const confirmExitNavigation = async () => {
    if (!pendingHref) return;

    const target = pendingHref;
    setLeaving(true);

    try {
      const roomRaw = sessionStorage.getItem("remoteImpostorSession");
      if (roomRaw) {
        const parsed = JSON.parse(roomRaw) as RemoteImpostorSession;
        if (parsed?.roomCode && parsed?.playerToken) {
          await fetch("/api/impostor/rooms/leave", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({
              joinCode: parsed.roomCode,
              playerToken: parsed.playerToken,
            }),
          });
        }
      }
    } catch {
      // Continue navigation even if leave call fails.
    } finally {
      sessionStorage.removeItem("remoteImpostorSession");
      sessionStorage.removeItem("impostorGame");
      sessionStorage.removeItem("truthOrDareGame");
      sessionStorage.removeItem("spiritualTalkSession");

      setPendingHref(null);
      setLeaving(false);
      setExitMessage(null);
      router.push(target);
    }
  };

  return (
    <>
      <nav
        className="animate-fade-in fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 lg:hidden"
        aria-label="Mobile navigation"
      >
        <div className="glass relative rounded-2xl px-2 pb-2 pt-3">
          <ul className="grid grid-cols-5 items-end">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = item.match(pathname);
              const isCenter = index === 2;

              if (isCenter) {
                return (
                  <li key={item.href} className="relative flex justify-center">
                    <Link
                      href={item.href}
                      onClick={(event) => handleNavClick(event, item.href)}
                      aria-current={isActive ? "page" : undefined}
                      className="-mt-8 flex h-16 w-16 flex-col items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition-transform duration-300 ease-smooth hover:scale-105 active:scale-90"
                    >
                      <Icon className="h-6 w-6" />
                      <span className="mt-1 text-[10px] font-semibold">
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              }

              return (
                <li key={item.href} className="flex justify-center">
                  <Link
                    href={item.href}
                    onClick={(event) => handleNavClick(event, item.href)}
                    aria-current={isActive ? "page" : undefined}
                    className={`group flex min-h-12 w-full flex-col items-center justify-center rounded-xl px-1 text-[11px] font-medium transition-all duration-300 ease-smooth active:scale-90 ${
                      isActive
                        ? "-translate-y-0.5 bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon
                      className={`h-[18px] w-[18px] transition-transform duration-300 ease-smooth group-hover:-translate-y-0.5 ${
                        isActive ? "-translate-y-0.5" : ""
                      }`}
                    />
                    <span className="mt-1">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <ExitGameModal
        open={Boolean(pendingHref)}
        title={inRemoteRoom ? "Leave this room?" : "Leave this game?"}
        description={
          inRemoteRoom
            ? (exitMessage ??
              "If you leave now, this room may be deleted or transferred to another host.")
            : "If you leave now, your current game progress may be lost."
        }
        confirmLabel={leaving ? "Leaving..." : "Confirm Leave"}
        cancelLabel="Cancel"
        onConfirm={() => void confirmExitNavigation()}
        onCancel={() => {
          setPendingHref(null);
          setExitMessage(null);
        }}
      />
    </>
  );
}
