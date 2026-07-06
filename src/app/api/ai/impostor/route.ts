import { NextResponse } from "next/server";
import { generateImpostorContent } from "@/lib/ai";
import { HintDifficulty } from "@/lib/types";

const HINT_DIFFICULTIES: HintDifficulty[] = ["easy", "normal", "hard", "difficult"];

export async function POST(request: Request) {
  let difficulty: HintDifficulty = "normal";

  try {
    const body = await request.json();
    if (HINT_DIFFICULTIES.includes(body?.hintDifficulty)) {
      difficulty = body.hintDifficulty as HintDifficulty;
    }
  } catch {
    // Keep default difficulty when body is missing or malformed.
  }

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const payload = await generateImpostorContent(difficulty);
      return NextResponse.json(payload);
    } catch (error) {
      if (attempt === maxAttempts) {
        return NextResponse.json(
          {
            error: error instanceof Error ? error.message : "Could not generate game content",
          },
          { status: 502 },
        );
      }
    }
  }

  return NextResponse.json({ error: "Unexpected AI generation error" }, { status: 500 });
}
