import { NextRequest, NextResponse } from "next/server";
import { generateSpiritualTalkQuestion } from "@/lib/ai";
import { SpiritualQuestionStyle } from "@/lib/types";

const STYLES: SpiritualQuestionStyle[] = [
  "mixed",
  "deep",
  "struggle",
  "joy",
  "personal",
];

const FALLBACKS: Record<SpiritualQuestionStyle, string[]> = {
  mixed: [
    "{name}, when did you feel closest to God this month?",
    "{name}, where do you need God's help most right now?",
    "{name}, what is one joyful answer to prayer you remember?",
  ],
  deep: [
    "{name}, when did you feel you could not feel God anymore?",
    "{name}, what truth about your soul is hardest to admit today?",
    "{name}, what fear keeps you from deeper obedience to God?",
  ],
  struggle: [
    "{name}, what temptation keeps returning in your private life?",
    "{name}, where do you feel spiritually tired or numb?",
    "{name}, what part of pain has pushed you away from prayer?",
  ],
  joy: [
    "{name}, what happy moment made you thank God deeply?",
    "{name}, what blessing made your faith stronger this week?",
    "{name}, what joyful memory with God still warms your heart?",
  ],
  personal: [
    "{name}, what personal habit helps your devotion stay real?",
    "{name}, would you do devotion with {other}, and why?",
    "{name}, what relationship needs God's healing in your life?",
  ],
};

export async function POST(request: NextRequest) {
  let playerName = "Player";
  let players: string[] = [];
  let questionStyle: SpiritualQuestionStyle = "mixed";

  try {
    const body = await request.json();

    if (typeof body?.playerName === "string" && body.playerName.trim()) {
      playerName = body.playerName.trim();
    }

    if (Array.isArray(body?.players)) {
      players = body.players
        .filter((value: unknown): value is string => typeof value === "string")
        .map((name: string) => name.trim())
        .filter(Boolean);
    }

    if (STYLES.includes(body?.questionStyle)) {
      questionStyle = body.questionStyle as SpiritualQuestionStyle;
    }
  } catch {
    // Keep defaults on malformed body.
  }

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const payload = await generateSpiritualTalkQuestion({
        playerName,
        allPlayers: players,
        style: questionStyle,
      });

      return NextResponse.json(payload);
    } catch (error) {
      if (attempt === maxAttempts) {
        const otherPlayer =
          players.find((name) => name.toLowerCase() !== playerName.toLowerCase()) ??
          "a friend";
        const fallbackByStyle = FALLBACKS[questionStyle];
        const template =
          fallbackByStyle[Math.floor(Math.random() * fallbackByStyle.length)];
        const question = template
          .replaceAll("{name}", playerName)
          .replaceAll("{other}", otherPlayer);

        return NextResponse.json(
          {
            language: "English",
            question,
            warning:
              error instanceof Error
                ? error.message
                : "Could not generate AI spiritual reflection question",
          },
          { status: 200 },
        );
      }
    }
  }

  return NextResponse.json(
    { error: "Unexpected spiritual question generation error" },
    { status: 500 },
  );
}
