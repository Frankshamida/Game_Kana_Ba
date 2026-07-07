import { ImageResponse } from "next/og";
import logo from "../public/Logo/GatherUp.webp";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top, rgba(14,165,233,0.22), transparent 45%), linear-gradient(180deg, #07111f 0%, #0b2540 100%)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
        }}
      >
        <img
          src={logo.src}
          alt="GatherUp"
          width="260"
          height="260"
          style={{
            width: 260,
            height: 260,
            objectFit: "cover",
            borderRadius: 48,
            boxShadow: "0 20px 60px rgba(2, 6, 23, 0.45)",
          }}
        />
        <div
          style={{
            color: "#e0f2fe",
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: 1,
          }}
        >
          GatherUp
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    },
  );
}
