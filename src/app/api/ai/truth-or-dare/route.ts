import { NextRequest, NextResponse } from "next/server";
import { generateTruthOrDareQuestion } from "@/lib/ai";
import { HintDifficulty, TruthOrDareMode } from "@/lib/types";

const DIFFICULTIES: HintDifficulty[] = ["easy", "normal", "hard", "difficult"];

const FALLBACK_PROMPTS: Record<
  HintDifficulty,
  Record<TruthOrDareMode, string>
> = {
  easy: {
    truth: "{name}, what is a simple thing that makes you happy today?",
    dare: "{name}, do your best happy dance for five seconds.",
  },
  normal: {
    truth: "{name}, what is one thing you want to improve this month?",
    dare: "{name}, act like your favorite animal for ten seconds.",
  },
  hard: {
    truth: "{name}, what is a fear you are working to overcome?",
    dare: "{name}, tell a dramatic story in 20 seconds with a serious face.",
  },
  difficult: {
    truth: "{name}, what is one honest truth about yourself that people rarely hear?",
    dare: "{name}, freestyle a mini motivational speech for 20 seconds without stopping.",
  },
};

export async function POST(request: NextRequest) {
  let playerName = "Player";
  let difficulty: HintDifficulty = "normal";
  let mode: TruthOrDareMode | "random" = "random";

  try {
    const body = await request.json();

    if (typeof body?.playerName === "string" && body.playerName.trim()) {
      playerName = body.playerName.trim();
    }

    if (DIFFICULTIES.includes(body?.difficulty)) {
      difficulty = body.difficulty as HintDifficulty;
    }

    if (body?.mode === "truth" || body?.mode === "dare") {
      mode = body.mode;
    }
  } catch {
    // Keep defaults when body is malformed.
  }

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const payload = await generateTruthOrDareQuestion({
        playerName,
        difficulty,
        mode,
      });

      return NextResponse.json(payload);
    } catch (error) {
      if (attempt === maxAttempts) {
        const fallbackMode: TruthOrDareMode =
          mode === "random"
            ? Math.random() > 0.5
              ? "truth"
              : "dare"
            : mode;

        const template = FALLBACK_PROMPTS[difficulty][fallbackMode];
        const question = template.replace("{name}", playerName);

        return NextResponse.json(
          {
            language: "English",
            mode: fallbackMode,
            question,
            warning:
              error instanceof Error
                ? error.message
                : "Could not generate AI Truth or Dare prompt",
          },
          { status: 200 },
        );
      }
    }
  }

  return NextResponse.json(
    { error: "Unexpected Truth or Dare generation error" },
    { status: 500 },
  );
}
