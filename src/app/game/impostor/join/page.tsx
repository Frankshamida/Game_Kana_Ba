"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, RefreshCw, X } from "lucide-react";
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

const ROOM_LIST_CACHE_KEY = "impostorRoomListCacheV1";
const ROOM_LIST_CACHE_TTL_MS = 12_000;

export default function ImpostorJoinPage() {
  const router = useRouter();

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

          <section className="rounded-2xl border border-white/70 bg-white/70 p-4 dark:border-slate-700/80 dark:bg-slate-900/70">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-200">
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

            <p className="text-sm text-slate-600 dark:text-slate-300">
              {roomCountLabel}
            </p>

            {loadingRooms ? (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Loading rooms...
              </p>
            ) : rooms.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                No public rooms are open yet.
              </p>
            ) : (
              <ul className="mt-3 grid gap-3">
                {rooms.map((item) => (
                  <li
                    key={item.room.id}
                    className="rounded-xl border border-white/75 bg-white/85 p-3 dark:border-slate-700/80 dark:bg-slate-950/65"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-lg font-black text-slate-900 dark:text-slate-100">
                          {item.room.roomName}
                        </p>
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                          {item.room.isPublic ? "Public" : "Private"}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          Host: {item.hostName}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          Players: {item.playerCount}/{item.room.maxPlayers}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="lg"
                        onClick={() => {
                          setSelectedRoom(item);
                          setJoinPlayerName("");
                          setSelectedRoomJoinCode("");
                          setError(null);
                        }}
                        disabled={
                          joiningRoomId === item.room.id ||
                          item.playerCount >= item.room.maxPlayers
                        }
                      >
                        {joiningRoomId === item.room.id
                          ? "Joining..."
                          : item.playerCount >= item.room.maxPlayers
                            ? "Room Full"
                            : "Join Room"}
                      </Button>
                    </div>
                  </li>
                ))}
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
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-700 dark:text-slate-200">
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
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">
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

              <div className="rounded-2xl bg-white/60 p-4 dark:bg-slate-900/55">
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
      </div>
    </main>
  );
}
