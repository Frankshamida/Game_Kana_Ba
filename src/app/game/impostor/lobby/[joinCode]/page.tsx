import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSiteUrl } from "@/lib/site-url";
import { getImpostorInviteDetails } from "@/lib/impostor-invite";
import { LobbyClient } from "./lobby-client";

const siteUrl = getSiteUrl();
const applicationName = "GatherUp";

type LobbyPageProps = {
  params: Promise<{ joinCode: string }>;
};

function buildLobbyMetadata(
  joinCode: string,
  invite: Awaited<ReturnType<typeof getImpostorInviteDetails>>,
): Metadata {
  const roomName = invite?.roomName ?? "Impostor Room";
  const invitedBy = invite?.inviterName ?? "A friend";
  const isJoinable = invite?.isJoinable ?? false;

  const title = invite
    ? isJoinable
      ? `${roomName} - Lobby`
      : `Room Expired | ${roomName}`
    : "Room Not Found";

  const description = invite
    ? isJoinable
      ? `${invitedBy} is hosting ${roomName}. Open this lobby to join the room.`
      : `${roomName} is no longer joinable. Create a new room and invite your friends.`
    : "This game room no longer exists. Create your own room and invite your friends.";

  return {
    metadataBase: new URL(siteUrl),
    applicationName,
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/game/impostor/lobby/${joinCode}`,
    },
    keywords: [
      "Impostor",
      "lobby",
      "game room",
      "multiplayer",
      "join room",
      roomName,
      joinCode,
      invitedBy,
    ],
    authors: [{ name: "Frank Gomes", url: siteUrl }],
    robots: invite?.isJoinable
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/game/impostor/lobby/${joinCode}`,
      type: "website",
      siteName: applicationName,
      images: [
        {
          url: `${siteUrl}/game/impostor/invite/${joinCode}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: invite
            ? `${roomName} lobby preview`
            : "Game room not found preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: "@frankshamida",
      images: [`${siteUrl}/game/impostor/invite/${joinCode}/opengraph-image`],
    },
  };
}

export async function generateMetadata({
  params,
}: LobbyPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const joinCode = resolvedParams.joinCode.toUpperCase();
  const invite = await getImpostorInviteDetails(joinCode);
  return buildLobbyMetadata(joinCode, invite);
}

export default async function ImpostorLobbyPage({ params }: LobbyPageProps) {
  const resolvedParams = await params;
  const joinCode = resolvedParams.joinCode.toUpperCase();
  if (!joinCode) {
    return notFound();
  }

  return <LobbyClient joinCode={joinCode} />;
}
