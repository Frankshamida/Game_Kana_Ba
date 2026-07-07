import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/site-url";
import { getImpostorInviteDetails } from "@/lib/impostor-invite";
import { InviteClient } from "./invite-client";

const siteUrl = getSiteUrl();
const applicationName = "GatherUp";

type InvitePageProps = {
  params: Promise<{ joinCode: string }>;
};

function buildInviteMetadata(
  joinCode: string,
  invite: Awaited<ReturnType<typeof getImpostorInviteDetails>>,
): Metadata {
  const roomName = invite?.roomName ?? "Impostor Room";
  const invitedBy = invite?.inviterName ?? "A friend";
  const isJoinable = invite?.isJoinable ?? false;

  const title = invite
    ? isJoinable
      ? `🎭 Join \"${roomName}\"`
      : `Room Expired | ${roomName}`
    : "Room Not Found";

  const description = invite
    ? isJoinable
      ? `${invitedBy} invited you to join ${roomName}. Tap this link to join instantly.`
      : `${roomName} is no longer joinable. Create your own room and invite your friends.`
    : "This game room no longer exists. Create your own room and invite your friends.";

  return {
    metadataBase: new URL(siteUrl),
    applicationName,
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/game/impostor/invite/${joinCode}`,
    },
    keywords: [
      "Impostor",
      "game invite",
      "open graph",
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
      url: `${siteUrl}/game/impostor/invite/${joinCode}`,
      type: "website",
      siteName: applicationName,
      images: [
        {
          url: `${siteUrl}/game/impostor/invite/${joinCode}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: invite
            ? `${roomName} invite preview`
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
}: InvitePageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const joinCode = resolvedParams.joinCode.toUpperCase();
  const invite = await getImpostorInviteDetails(joinCode);
  return buildInviteMetadata(joinCode, invite);
}

export default async function InvitePage({ params }: InvitePageProps) {
  const resolvedParams = await params;
  const joinCode = resolvedParams.joinCode.toUpperCase();
  const invite = await getImpostorInviteDetails(joinCode);

  if (!joinCode) {
    redirect("/game/impostor/join");
  }

  if (!invite) {
    notFound();
  }

  return (
    <InviteClient
      joinCode={joinCode}
      roomName={invite.roomName}
      invitedBy={invite.inviterName}
      playerCount={invite.playerCount}
      maxPlayers={invite.maxPlayers}
      isPublic={invite.isPublic}
      isJoinable={invite.isJoinable}
    />
  );
}
