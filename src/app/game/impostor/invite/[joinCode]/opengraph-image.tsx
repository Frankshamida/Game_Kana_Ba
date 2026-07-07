import { ImageResponse } from "next/og";
import { getImpostorInviteDetails } from "@/lib/impostor-invite";

export const runtime = "nodejs";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

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
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px",
        background:
          "radial-gradient(circle at top left, rgba(125, 211, 252, 0.32), transparent 42%), linear-gradient(135deg, #07111f 0%, #0b4b7a 52%, #0ea5e9 100%)",
        color: "white",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0))",
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
            gap: 16,
            padding: "14px 18px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              background: "#67e8f9",
              boxShadow: "0 0 20px rgba(103,232,249,0.85)",
            }}
          />
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 2,
            }}
          >
            GatherUp
          </span>
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "rgba(224, 242, 254, 0.92)",
          }}
        >
          Join invite
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 48,
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            flex: 1.1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#bae6fd",
              marginBottom: 18,
            }}
          >
            {invite ? "Game Invite" : "Room Not Found"}
          </div>
          <div
            style={{
              fontSize: 66,
              lineHeight: 1.02,
              fontWeight: 900,
              marginBottom: 18,
              maxWidth: 700,
            }}
          >
            {invite ? roomName : "Game Room Not Found"}
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "rgba(226,232,240,0.96)",
              maxWidth: 780,
            }}
          >
            {invite
              ? `${inviterName} invited you to play Impostor.`
              : "This game room no longer exists."}
          </div>
        </div>

        <div
          style={{
            width: 350,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderRadius: 36,
            padding: 28,
            background:
              "linear-gradient(180deg, rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.45))",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 30px 80px rgba(2, 6, 23, 0.35)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                width: "100%",
                height: 210,
                borderRadius: 28,
                background:
                  "linear-gradient(135deg, rgba(34, 211, 238, 0.18), rgba(59, 130, 246, 0.3)), radial-gradient(circle at top right, rgba(255,255,255,0.22), transparent 35%), linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
                border: "1px solid rgba(255,255,255,0.14)",
                display: "flex",
                alignItems: "flex-end",
                padding: 20,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#ecfeff",
                  textShadow: "0 10px 30px rgba(0,0,0,0.35)",
                }}
              >
                {isJoinable ? "Tap to join the room" : "Invite unavailable"}
              </div>
            </div>

            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "rgba(224,242,254,0.9)",
                marginBottom: 10,
              }}
            >
              {isJoinable ? "Enter your name and jump in" : "Create a new room"}
            </div>
            <div
              style={{
                fontSize: 16,
                color: "rgba(186,230,253,0.85)",
                lineHeight: 1.5,
              }}
            >
              {invite
                ? `Players ${playerCount}/${maxPlayers || "--"} · ${invite.isPublic ? "Public" : "Private"}`
                : "This game room is no longer available."}
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px 20px",
              borderRadius: 18,
              background: "#0ea5e9",
              color: "white",
              fontSize: 20,
              fontWeight: 800,
              boxShadow: "0 18px 40px rgba(14,165,233,0.35)",
            }}
          >
            {isJoinable ? "Join now" : "Return home"}
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
