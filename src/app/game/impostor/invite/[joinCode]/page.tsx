import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/site-url";
import { getImpostorInviteDetails } from "@/lib/impostor-invite";
import { InviteClient } from "./invite-client";

const siteUrl = getSiteUrl();

type InvitePageProps = {
  params: Promise<{ joinCode: string }>;
};

export async function generateMetadata({
  params,
}: InvitePageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const joinCode = resolvedParams.joinCode.toUpperCase();
  const invite = await getImpostorInviteDetails(joinCode);
  const roomName = invite?.roomName ?? "Impostor Room";
  const invitedBy = invite?.inviterName ?? "A friend";
  const title = `${roomName} - Join Invite`;
  const description = `${invitedBy} invited you to join ${roomName}. Enter your name and jump into the match.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/game/impostor/invite/${joinCode}`,
      siteName: "GatherUp",
      images: [
        {
          url: `${siteUrl}/game/impostor/invite/${joinCode}/opengraph-image`,
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
      images: [`${siteUrl}/game/impostor/invite/${joinCode}/opengraph-image`],
    },
  };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const resolvedParams = await params;
  const joinCode = resolvedParams.joinCode.toUpperCase();
  const invite = await getImpostorInviteDetails(joinCode);
  const roomName = invite?.roomName ?? "Impostor Room";
  const invitedBy = invite?.inviterName ?? "A friend";

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
