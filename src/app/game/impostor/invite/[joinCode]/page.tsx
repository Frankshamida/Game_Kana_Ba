import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/site-url";
import { getImpostorInviteDetails } from "@/lib/impostor-invite";
import { InviteClient } from "./invite-client";

const siteUrl = getSiteUrl();
const applicationName = "GatherUp";

type InvitePageProps = {
  params: Promise<{ joinCode: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type InvitePreviewParams = {
  roomName?: string;
  invitedBy?: string;
};

function getPreviewValue(
  value: string | string[] | undefined,
  fallback: string,
) {
  if (Array.isArray(value)) {
    return value[0]?.trim() || fallback;
  }

  return value?.trim() || fallback;
}

function getInvitePreviewParams(
  searchParams: Record<string, string | string[] | undefined>,
): InvitePreviewParams {
  return {
    roomName: getPreviewValue(searchParams.roomName, ""),
    invitedBy: getPreviewValue(searchParams.invitedBy, ""),
  };
}

function buildInviteMetadata(
  joinCode: string,
  invite: Awaited<ReturnType<typeof getImpostorInviteDetails>>,
  previewParams: InvitePreviewParams,
): Metadata {
  const roomName =
    previewParams.roomName || invite?.roomName || "Impostor Room";
  const invitedBy =
    previewParams.invitedBy || invite?.inviterName || "A friend";
  const isJoinable = invite?.isJoinable ?? Boolean(previewParams.roomName);
  const previewImageUrl = new URL(
    `/game/impostor/invite/${joinCode}/opengraph-image`,
    siteUrl,
  );

  if (previewParams.roomName) {
    previewImageUrl.searchParams.set("roomName", previewParams.roomName);
  }

  if (previewParams.invitedBy) {
    previewImageUrl.searchParams.set("invitedBy", previewParams.invitedBy);
  }

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
          url: previewImageUrl.toString(),
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
      images: [previewImageUrl.toString()],
    },
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: InvitePageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const joinCode = resolvedParams.joinCode.toUpperCase();
  const previewParams = getInvitePreviewParams(resolvedSearchParams);
  const invite =
    previewParams.roomName && previewParams.invitedBy
      ? null
      : await getImpostorInviteDetails(joinCode);

  return buildInviteMetadata(joinCode, invite, previewParams);
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
