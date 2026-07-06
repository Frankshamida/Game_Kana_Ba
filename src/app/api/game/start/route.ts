import { NextRequest, NextResponse } from "next/server";
import { startImpostorGame } from "@/app/game/impostor/actions";
import { HintDifficulty } from "@/lib/types";

const HINT_DIFFICULTIES: HintDifficulty[] = ["easy", "normal", "hard", "difficult"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = Array.isArray(body?.players) ? body.players : [];
    const players = input.filter((value: unknown): value is string => typeof value === "string");
    const excludedWordsInput = Array.isArray(body?.excludedWords) ? body.excludedWords : [];
    const excludedWords = excludedWordsInput
      .filter((value: unknown): value is string => typeof value === "string")
      .map((word: string) => word.trim())
      .filter(Boolean);
    const impostorCount =
      typeof body?.impostorCount === "number" && Number.isFinite(body.impostorCount)
        ? Math.trunc(body.impostorCount)
        : 1;
    const hintDifficulty = HINT_DIFFICULTIES.includes(body?.hintDifficulty)
      ? (body.hintDifficulty as HintDifficulty)
      : "normal";

    const response = await startImpostorGame(
      players,
      impostorCount,
      excludedWords,
      hintDifficulty,
    );

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start game.";
    const status =
      message.includes("Player") ||
      message.includes("names") ||
      message.includes("required") ||
      message.includes("Impostor") ||
      message.includes("difficulty")
        ? 400
        : 500;

    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}
