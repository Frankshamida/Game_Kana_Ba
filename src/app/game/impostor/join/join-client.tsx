"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, RefreshCw, User, Users, X } from "lucide-react";
import { AnimatedBackground } from "@/components/game/animated-background";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CreateImpostorRoomResponse,
  HintDifficulty,
  JoinImpostorRoomResponse,
  ImpostorRoom,
  RemoteImpostorSession,
} from "@/lib/types";

interface PublicRoomListItem {
  room: ImpostorRoom;
  hostName: string;
  playerCount: number;
}

function getRoomStatusLabel(room: ImpostorRoom) {
  if (room.status === "started") {
    return "Started";
  }

  if (room.status === "finished") {
    return "Finished";
  }

  return room.phase === "lobby" ? "Open" : "Waiting";
}

const ROOM_LIST_CACHE_KEY = "impostorRoomListCacheV1";
const ROOM_LIST_CACHE_TTL_MS = 12_000;

export function JoinClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const inviteDetails = useMemo(() => {
    const inviteJoinCode =
      searchParams?.get("joinCode")?.trim().toUpperCase() ?? "";

    return {
      joinCode: inviteJoinCode,
      roomName: searchParams?.get("roomName")?.trim() ?? "Impostor Room",
      inviterName: searchParams?.get("invitedBy")?.trim() ?? "A friend",
      showInviteModal: Boolean(inviteJoinCode),
    };
  }, [searchParams]);

  const [selectedRoom, setSelectedRoom] = useState<PublicRoomListItem | null>(
    null,
  );
  const [joinPlayerName, setJoinPlayerName] = useState("");
  const [selectedRoomJoinCode, setSelectedRoomJoinCode] = useState("");
  const [privateJoinPlayerName, setPrivateJoinPlayerName] = useState("");
  const [privateJoinCode, setPrivateJoinCode] = useState("");

  const [roomName, setRoomName] = useState("My Impostor Room");
  const [hostName, setHostName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [isPublic, setIsPublic] = useState(true);
  const [hideHint, setHideHint] = useState(false);
  const [impostorCount, setImpostorCount] = useState(1);

  const [rooms, setRooms] = useState<PublicRoomListItem[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [joiningPrivate, setJoiningPrivate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPrivateJoinModal, setShowPrivateJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(() =>
    Boolean(searchParams?.get("joinCode")?.trim()),
  );
  const [invitePlayerName, setInvitePlayerName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hintDifficulty: HintDifficulty = "normal";

  const roomCountLabel = useMemo(
    () => `${rooms.length} room${rooms.length === 1 ? "" : "s"}`,
    [rooms.length],
  );

  const saveRemoteSession = (roomCode: string, playerToken: string) => {
    const session: RemoteImpostorSession = {
      roomCode,
      playerToken,
    };

    sessionStorage.setItem("remoteImpostorSession", JSON.stringify(session));
  };

  const loadPublicRooms = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        const cachedRaw = sessionStorage.getItem(ROOM_LIST_CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw) as {
            timestamp: number;
            rooms: PublicRoomListItem[];
          };

          if (
            cached &&
            typeof cached.timestamp === "number" &&
            Array.isArray(cached.rooms) &&
            Date.now() - cached.timestamp < ROOM_LIST_CACHE_TTL_MS
          ) {
            setRooms(cached.rooms);
            setLoadingRooms(false);
            return;
          }
        }
      }

      setLoadingRooms(true);
      const response = await fetch("/api/impostor/rooms/public");

      const body = (await response.json().catch(() => null)) as {
        rooms?: PublicRoomListItem[];
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Failed to load public rooms.");
      }

      const nextRooms = Array.isArray(body?.rooms) ? body.rooms : [];
      setRooms(nextRooms);
      sessionStorage.setItem(
        ROOM_LIST_CACHE_KEY,
        JSON.stringify({ timestamp: Date.now(), rooms: nextRooms }),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load public rooms.",
      );
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      void loadPublicRooms();
    });
  }, []);

  const joinRoom = async (payload: {
    roomId?: string;
    joinCode?: string;
    playerName: string;
  }) => {
    const safeName = payload.playerName.trim();
    if (!safeName) {
      setError("Your name is required before joining a room.");
      return;
    }

    setError(null);

    if (payload.roomId) {
      setJoiningRoomId(payload.roomId);
    } else {
      setJoiningPrivate(true);
    }

    try {
      const response = await fetch("/api/impostor/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          playerName: safeName,
          roomId: payload.roomId,
          joinCode: payload.joinCode,
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | JoinImpostorRoomResponse
        | { error?: string }
        | null;

      if (!response.ok || !body || !("room" in body) || !("player" in body)) {
        throw new Error(
          body && "error" in body
            ? (body.error ?? "Failed to join room.")
            : "Failed to join room.",
        );
      }

      saveRemoteSession(body.room.joinCode, body.player.playerToken);
      router.push(`/game/impostor/lobby/${body.room.joinCode}`);
    } catch (joinError) {
      setError(
        joinError instanceof Error ? joinError.message : "Failed to join room.",
      );
    } finally {
      setJoiningRoomId(null);
      setJoiningPrivate(false);
    }
  };

  const joinPrivateRoom = async () => {
    const safeCode = privateJoinCode.trim().toUpperCase();
    if (!safeCode) {
      setError("Private room code is required.");
      return;
    }

    await joinRoom({
      joinCode: safeCode,
      playerName: privateJoinPlayerName,
    });
  };

  const joinInviteRoom = async () => {
    await joinRoom({
      joinCode: inviteDetails.joinCode,
      playerName: invitePlayerName,
    });
  };

  const joinSelectedRoom = async () => {
    if (!selectedRoom) return;

    if (selectedRoom.room.isPublic) {
      await joinRoom({
        roomId: selectedRoom.room.id,
        playerName: joinPlayerName,
      });
      return;
    }

    const safeCode = selectedRoomJoinCode.trim().toUpperCase();
    if (!safeCode) {
      setError("Private room code is required.");
      return;
    }

    await joinRoom({
      joinCode: safeCode,
      playerName: joinPlayerName,
    });
  };

  const createRoom = async () => {
    const safeRoomName = roomName.trim();
    const safeHostName = hostName.trim();

    if (!safeRoomName) {
      setError("Room name is required.");
      return;
    }

    if (!safeHostName) {
      setError("Host name is required.");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/impostor/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          roomName: safeRoomName,
          playerName: safeHostName,
          maxPlayers,
          isPublic,
          hideHint,
          impostorCount,
          hintDifficulty,
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | CreateImpostorRoomResponse
        | { error?: string }
        | null;

      if (!response.ok || !body || !("room" in body) || !("player" in body)) {
        throw new Error(
          body && "error" in body
            ? (body.error ?? "Failed to create room.")
            : "Failed to create room.",
        );
      }

      saveRemoteSession(body.room.joinCode, body.player.playerToken);
      router.push(`/game/impostor/lobby/${body.room.joinCode}`);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create room.",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8">
      <AnimatedBackground />
      <div className="container mx-auto max-w-3xl">
        <Card className="space-y-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
              Join Online
            </p>
            <h1 className="mt-2 font-display text-4xl font-extrabold">
              Join Or Create A Room
            </h1>
            <p className="mt-2 text-muted-foreground">
              Browse game rooms, join with a code, or create your own room as
              public or private.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="sm:flex-1"
              onClick={() => {
                setShowPrivateJoinModal(true);
                setError(null);
              }}
            >
              Join Private Room
            </Button>
            <Button
              type="button"
              size="lg"
              className="sm:flex-1"
              onClick={() => {
                setShowCreateModal(true);
                setError(null);
              }}
            >
              Create Room
            </Button>
          </div>

          <section className="glass rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-foreground">
                Game Rooms
              </p>
              <Button
                type="button"
                size="default"
                variant="secondary"
                onClick={() => void loadPublicRooms(true)}
                disabled={loadingRooms}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${loadingRooms ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              {roomCountLabel}
            </p>

            {loadingRooms ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Loading rooms...
              </p>
            ) : rooms.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No public rooms are open yet.
              </p>
            ) : (
              <ul className="mt-3 grid gap-3">
                {rooms.map((item) => {
                  const isJoinable =
                    item.room.status === "waiting" &&
                    item.room.phase === "lobby" &&
                    item.playerCount < item.room.maxPlayers;

                  return (
                    <li
                      key={item.room.id}
                      className={`group relative overflow-hidden rounded-xl border p-3 shadow-[0_8px_24px_rgba(14,165,233,0.12)] transition dark:border-cyan-500/25 dark:from-slate-900/85 dark:via-slate-900/90 dark:to-blue-950/55 ${
                        isJoinable
                          ? "border-cyan-200/70 bg-gradient-to-br from-cyan-50/90 via-white/90 to-blue-50/90 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(14,165,233,0.2)]"
                          : "border-border bg-muted opacity-90"
                      }`}
                    >
                      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-400/15 blur-xl" />
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1.5">
                          <p className="text-lg font-black text-foreground">
                            {item.room.roomName}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-cyan-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-800 dark:bg-cyan-400/20 dark:text-cyan-200">
                              {item.room.isPublic ? "Public" : "Private"}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${
                                item.room.status === "started"
                                  ? "bg-amber-500/15 text-amber-800 dark:bg-amber-400/20 dark:text-amber-200"
                                  : "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-200"
                              }`}
                            >
                              {getRoomStatusLabel(item.room)}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                              <User className="h-3.5 w-3.5" />
                              Host: {item.hostName}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-400/20 dark:text-blue-200">
                              <Users className="h-3.5 w-3.5" />
                              {item.playerCount}/{item.room.maxPlayers}
                            </span>
                          </div>
                          <div className="pt-0.5">
                            <div className="h-1.5 w-full rounded-full bg-muted">
                              <div
                                className="h-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    item.room.maxPlayers > 0
                                      ? Math.round(
                                          (item.playerCount /
                                            item.room.maxPlayers) *
                                            100,
                                        )
                                      : 0,
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="lg"
                          className="min-w-36 shadow-[0_8px_22px_rgba(14,165,233,0.32)]"
                          onClick={() => {
                            setSelectedRoom(item);
                            setJoinPlayerName("");
                            setSelectedRoomJoinCode("");
                            setError(null);
                          }}
                          disabled={
                            !isJoinable || joiningRoomId === item.room.id
                          }
                        >
                          {joiningRoomId === item.room.id
                            ? "Joining..."
                            : !isJoinable
                              ? "Started"
                              : item.playerCount >= item.room.maxPlayers
                                ? "Room Full"
                                : "Join Room"}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {error && !selectedRoom && !showPrivateJoinModal && (
            <p className="rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-800 dark:bg-red-950/50 dark:text-red-200">
              {error}
            </p>
          )}

          <div className="flex justify-start">
            <Button
              type="button"
              size="lg"
              variant="ghost"
              className="mobile-top-chrome"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back Home
            </Button>
          </div>
        </Card>

        {selectedRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
            <Card className="w-full max-w-md space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
                    Join Room
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    {selectedRoom.room.roomName}
                  </h2>
                </div>
                <Button
                  type="button"
                  size="default"
                  variant="ghost"
                  onClick={() => setSelectedRoom(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <label className="text-sm font-semibold">Your name</label>
                <Input
                  className="mt-2"
                  value={joinPlayerName}
                  onChange={(event) => setJoinPlayerName(event.target.value)}
                  placeholder="Enter your name"
                />
              </div>

              {!selectedRoom.room.isPublic && (
                <div>
                  <label className="text-sm font-semibold">Room code</label>
                  <Input
                    className="mt-2"
                    value={selectedRoomJoinCode}
                    onChange={(event) =>
                      setSelectedRoomJoinCode(event.target.value.toUpperCase())
                    }
                    placeholder="Enter private room code"
                    maxLength={6}
                  />
                  {error && (
                    <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-300">
                      {error}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  size="lg"
                  className="flex-1"
                  onClick={() => void joinSelectedRoom()}
                  disabled={joiningRoomId === selectedRoom.room.id}
                >
                  {joiningRoomId === selectedRoom.room.id
                    ? "Joining..."
                    : "Join Room"}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="ghost"
                  onClick={() => setSelectedRoom(null)}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        )}

        {showPrivateJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
            <Card className="w-full max-w-md space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-foreground">
                    Join Private Room
                  </p>
                  <h2 className="mt-1 text-2xl font-black">Enter Room Code</h2>
                </div>
                <Button
                  type="button"
                  size="default"
                  variant="ghost"
                  onClick={() => setShowPrivateJoinModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <label className="text-sm font-semibold">Your name</label>
                <Input
                  className="mt-2"
                  value={privateJoinPlayerName}
                  onChange={(event) =>
                    setPrivateJoinPlayerName(event.target.value)
                  }
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">Room code</label>
                <Input
                  className="mt-2"
                  value={privateJoinCode}
                  onChange={(event) =>
                    setPrivateJoinCode(event.target.value.toUpperCase())
                  }
                  placeholder="ABC123"
                  maxLength={6}
                />
                {error && (
                  <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-300">
                    {error}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  size="lg"
                  className="flex-1"
                  onClick={() => void joinPrivateRoom()}
                  disabled={joiningPrivate}
                >
                  {joiningPrivate ? "Joining..." : "Join With Code"}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="ghost"
                  onClick={() => setShowPrivateJoinModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
            <Card className="w-full max-w-xl space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">
                    Create Room
                  </p>
                  <h2 className="mt-1 text-2xl font-black">New Online Room</h2>
                </div>
                <Button
                  type="button"
                  size="default"
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold">Room Name</label>
                  <Input
                    className="mt-2"
                    value={roomName}
                    onChange={(event) => setRoomName(event.target.value)}
                    placeholder="Room name"
                    maxLength={40}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold">Host Name</label>
                  <Input
                    className="mt-2"
                    value={hostName}
                    onChange={(event) => setHostName(event.target.value)}
                    placeholder="Your name"
                    maxLength={30}
                  />
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Number of players in room
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[4, 6, 8, 10, 12, 16, 20].map((count) => (
                    <Button
                      key={count}
                      type="button"
                      size="default"
                      variant={count === maxPlayers ? "default" : "secondary"}
                      onClick={() => setMaxPlayers(count)}
                    >
                      {count}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold">Visibility</p>
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    size="default"
                    variant={isPublic ? "default" : "secondary"}
                    onClick={() => setIsPublic(true)}
                  >
                    Public (No Code)
                  </Button>
                  <Button
                    type="button"
                    size="default"
                    variant={!isPublic ? "default" : "secondary"}
                    onClick={() => setIsPublic(false)}
                  >
                    Private (With Code)
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl bg-muted p-4">
                <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={hideHint}
                    onChange={(event) => setHideHint(event.target.checked)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Hide hint for the impostor
                </label>
              </div>

              <div>
                <p className="text-sm font-semibold">Number of impostors</p>
                <div className="mt-2 flex gap-2">
                  {[1, 2, 3].map((count) => (
                    <Button
                      key={count}
                      type="button"
                      size="default"
                      variant={
                        count === impostorCount ? "default" : "secondary"
                      }
                      onClick={() => setImpostorCount(count)}
                    >
                      {count}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  size="lg"
                  className="flex-1"
                  onClick={createRoom}
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Room"
                  )}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        )}

        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <Card className="glass w-full max-w-md space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">
                  Invite Received
                </p>
                <h2 className="text-3xl font-black leading-tight text-foreground">
                  {inviteDetails.inviterName} invited you to Join
                </h2>
                <p className="text-lg font-semibold text-muted-foreground">
                  {inviteDetails.roomName}
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold">Your name</label>
                <Input
                  className="mt-2"
                  value={invitePlayerName}
                  onChange={(event) => setInvitePlayerName(event.target.value)}
                  placeholder="Enter your name"
                  autoFocus
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-800 dark:bg-red-950/55 dark:text-red-200">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  size="lg"
                  className="flex-1"
                  onClick={() => void joinInviteRoom()}
                  disabled={joiningPrivate}
                >
                  {joiningPrivate ? "Joining..." : "Join Game"}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="ghost"
                  onClick={() => {
                    setShowInviteModal(false);
                    setError(null);
                    router.replace("/game/impostor/join");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
