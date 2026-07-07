import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/site-url";
import { InviteClient } from "./invite-client";

const siteUrl = getSiteUrl();

type InvitePageProps = {
  params: Promise<{ joinCode: string }>;
  searchParams: Promise<{
    roomName?: string;
    invitedBy?: string;
  }>;
};

const fallbackRoomName = "Impostor Room";
const fallbackInviterName = "A friend";

export async function generateMetadata({
  params,
  searchParams,
}: InvitePageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const roomName = resolvedSearchParams.roomName?.trim() || fallbackRoomName;
  const invitedBy =
    resolvedSearchParams.invitedBy?.trim() || fallbackInviterName;
  const joinCode = resolvedParams.joinCode.toUpperCase();
  const title = `${roomName} - Join Invite`;
  const description = `${invitedBy} invited you to join ${roomName}. Enter your name and jump into the match.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/game/impostor/invite/${joinCode}`,
      images: [
        {
          url: "/og-impostor-invite.svg",
          width: 1200,
          height: 630,
          alt: `${roomName} invite preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-impostor-invite.svg"],
    },
  };
}

export default async function InvitePage({
  params,
  searchParams,
}: InvitePageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const joinCode = resolvedParams.joinCode.toUpperCase();
  const roomName = resolvedSearchParams.roomName?.trim() || fallbackRoomName;
  const invitedBy =
    resolvedSearchParams.invitedBy?.trim() || fallbackInviterName;

  if (!joinCode) {
    redirect("/game/impostor/join");
  }

  return (
    <InviteClient
      joinCode={joinCode}
      roomName={roomName}
      invitedBy={invitedBy}
    />
  );
}
