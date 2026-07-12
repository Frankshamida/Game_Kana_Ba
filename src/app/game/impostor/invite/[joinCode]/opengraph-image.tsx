import { ImageResponse } from "next/og";
import { getImpostorInviteDetails } from "@/lib/impostor-invite";

export const runtime = "nodejs";
export const revalidate = 60;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

function PlayerSlots({
  playerCount,
  maxPlayers,
}: {
  playerCount: number;
  maxPlayers: number;
}) {
  const total = Math.max(maxPlayers, playerCount, 1);
  const visibleTotal = Math.min(total, 8);
  const filled = Math.min(playerCount, visibleTotal);
  const avatarColors = [
    "#f97316",
    "#22d3ee",
    "#a78bfa",
    "#f472b6",
    "#34d399",
    "#facc15",
    "#60a5fa",
    "#fb7185",
  ];

  return (
    <div style={{ display: "flex", gap: 10 }}>
      {Array.from({ length: visibleTotal }).map((_, index) => {
        const isFilled = index < filled;
        return (
          <div
            key={index}
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 800,
              color: isFilled ? "#052033" : "rgba(226,232,240,0.55)",
              background: isFilled
                ? avatarColors[index % avatarColors.length]
                : "rgba(255,255,255,0.08)",
              border: isFilled
                ? "2px solid rgba(255,255,255,0.65)"
                : "2px dashed rgba(255,255,255,0.28)",
            }}
          >
            {isFilled ? "🙂" : ""}
          </div>
        );
      })}
    </div>
  );
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ joinCode: string }>;
}) {
  const resolvedParams = await params;
  const joinCode = resolvedParams.joinCode.toUpperCase();
  const invite = await getImpostorInviteDetails(joinCode);
  const roomName = invite?.roomName ?? "Impostor Room";
  const inviterName = invite?.inviterName ?? "A friend";
  const playerCount = invite?.playerCount ?? 0;
  const maxPlayers = invite?.maxPlayers ?? 0;
  const isJoinable = invite?.isJoinable ?? false;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "60px 72px",
          background:
            "radial-gradient(circle at 12% 8%, rgba(56,189,248,0.35), transparent 40%), radial-gradient(circle at 92% 92%, rgba(217,70,239,0.28), transparent 45%), linear-gradient(160deg, #050b18 0%, #0a1f3d 48%, #072a4a 100%)",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -140,
            right: -100,
            width: 420,
            height: 420,
            borderRadius: 999,
            background:
              "radial-gradient(circle, rgba(56,189,248,0.35), transparent 70%)",
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 20px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 999,
                background: "#38bdf8",
                boxShadow: "0 0 18px rgba(56,189,248,0.9)",
              }}
            />
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2 }}>
              GATHERUP
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 20,
              fontWeight: 700,
              color: "rgba(224,242,254,0.85)",
            }}
          >
            🎭 Impostor Party Game
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 56,
            marginTop: 16,
          }}
        >
          <div style={{ fontSize: 168, lineHeight: 1, display: "flex" }}>
            {isJoinable ? "🎭" : "🔒"}
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 30,
                fontWeight: 800,
                color: "#7dd3fc",
              }}
            >
              {inviterName} invited you to play
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 72,
                fontWeight: 900,
                lineHeight: 1.05,
                maxWidth: 760,
              }}
            >
              {roomName}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                marginTop: 24,
              }}
            >
              {isJoinable ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "14px 26px",
                    borderRadius: 20,
                    background: "rgba(15,23,42,0.55)",
                    border: "2px solid rgba(56,189,248,0.55)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "rgba(186,230,253,0.85)",
                      letterSpacing: 1,
                    }}
                  >
                    CODE
                  </span>
                  <span
                    style={{
                      fontSize: 36,
                      fontWeight: 900,
                      letterSpacing: 6,
                      color: "#67e8f9",
                    }}
                  >
                    {joinCode}
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    fontSize: 28,
                    fontWeight: 700,
                    color: "rgba(226,232,240,0.75)",
                  }}
                >
                  This room is no longer joinable.
                </div>
              )}
            </div>

            {isJoinable ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  marginTop: 26,
                }}
              >
                <PlayerSlots playerCount={playerCount} maxPlayers={maxPlayers} />
                <span
                  style={{
                    display: "flex",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "rgba(226,232,240,0.85)",
                  }}
                >
                  {playerCount}/{maxPlayers || "--"} joined ·{" "}
                  {invite?.isPublic ? "Public" : "Private"}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            padding: "22px 0",
            borderRadius: 22,
            background: isJoinable
              ? "linear-gradient(90deg, #0ea5e9, #22d3ee)"
              : "rgba(255,255,255,0.12)",
            color: isJoinable ? "#04141f" : "rgba(226,232,240,0.85)",
            fontSize: 30,
            fontWeight: 900,
            boxShadow: isJoinable
              ? "0 20px 45px rgba(14,165,233,0.4)"
              : "none",
          }}
        >
          {isJoinable ? "🎮 Tap to join the room" : "Create your own room"}
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
