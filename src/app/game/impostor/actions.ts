"use server";

import { generateImpostorContent } from "@/lib/ai";
import { getServiceSupabase } from "@/lib/supabase-server";
import { GameStartResponse, HintDifficulty } from "@/lib/types";

const normalizePlayers = (players: string[]) => players.map((p) => p.trim());

const FALLBACK_WORDS: Array<{
  word: string;
  hints: Record<HintDifficulty, string>;
}> = [
  {
    word: "Bridge",
    hints: {
      easy: "A structure used to cross a river",
      normal: "It connects two sides",
      hard: "It helps movement over a gap",
      difficult: "Helps you avoid going through the obstacle below",
    },
  },
  {
    word: "Lantern",
    hints: {
      easy: "A portable light source",
      normal: "Useful when it is dark",
      hard: "Useful for visibility without room lighting",
      difficult: "Handheld item often used during outages or camping",
    },
  },
  {
    word: "Backpack",
    hints: {
      easy: "A bag carried on your shoulders",
      normal: "Common for students and travelers",
      hard: "A container worn on your back",
      difficult: "You wear this instead of carrying it by hand",
    },
  },
  {
    word: "Compass",
    hints: {
      easy: "Used to find directions",
      normal: "Helpful for navigation",
      hard: "Points consistently even when you rotate",
      difficult: "Tool that points a fixed way regardless of where you stand",
    },
  },
  {
    word: "Volcano",
    hints: {
      easy: "A mountain that can erupt",
      normal: "A natural landform linked to lava",
      hard: "A landform with pressure below the surface",
      difficult: "Can stay quiet for years, then become very dangerous",
    },
  },
  {
    word: "Bicycle",
    hints: {
      easy: "A two-wheel vehicle powered by pedaling",
      normal: "A ride that needs balance, not fuel",
      hard: "Human-powered transport with rotating parts",
      difficult: "Moves by your legs and usually has a chain",
    },
  },
  {
    word: "Library",
    hints: {
      easy: "A quiet place full of books",
      normal: "A public place for reading and borrowing",
      hard: "A space where borrowing is more common than buying",
      difficult: "You are expected to lower your voice here",
    },
  },
  {
    word: "Raincoat",
    hints: {
      easy: "Worn to stay dry in wet weather",
      normal: "Outerwear for rainy days",
      hard: "Clothing used as weather protection",
      difficult: "Protective clothing used when skies are not clear",
    },
  },
  {
    word: "Pencil",
    hints: {
      easy: "Used to write and erase",
      normal: "A school tool often sharpened",
      hard: "A writing tool whose marks can be removed",
      difficult: "Makes marks that are not permanent",
    },
  },
  {
    word: "Camera",
    hints: {
      easy: "Used to take photos",
      normal: "Captures moments as images",
      hard: "Device focused on framing and recording scenes",
      difficult: "Its main job is recording scenes visually",
    },
  },
];

const HINT_DIFFICULTIES: HintDifficulty[] = ["easy", "normal", "hard", "difficult"];

function validatePlayers(players: string[]): string | null {
  if (players.length < 3 || players.length > 20) {
    return "Player count must be between 3 and 20.";
  }

  if (players.some((name) => !name)) {
    return "All names are required.";
  }

  const unique = new Set(players.map((name) => name.toLowerCase()));
  if (unique.size !== players.length) {
    return "Player names must be unique.";
  }

  return null;
}

function validateImpostorCount(impostorCount: number, playerCount: number): string | null {
  if (!Number.isInteger(impostorCount)) {
    return "Impostor count must be a whole number.";
  }

  if (impostorCount < 1 || impostorCount > 3) {
    return "Impostor count must be between 1 and 3.";
  }

  if (impostorCount >= playerCount) {
    return "Impostor count must be less than the number of players.";
  }

  return null;
}

function validateHintDifficulty(hintDifficulty: string): hintDifficulty is HintDifficulty {
  return HINT_DIFFICULTIES.includes(hintDifficulty as HintDifficulty);
}

function pickRandomIndices(total: number, count: number): Set<number> {
  const indices = Array.from({ length: total }, (_, i) => i);

  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return new Set(indices.slice(0, count));
}

function isExcludedWord(word: string, excludedWords: Set<string>): boolean {
  return excludedWords.has(word.trim().toLowerCase());
}

function pickFallbackWord(
  excludedWords: Set<string>,
  hintDifficulty: HintDifficulty,
): { language: "English"; secretWord: string; hint: string } {
  const available = FALLBACK_WORDS.filter((item) => !isExcludedWord(item.word, excludedWords));
  if (available.length === 0) {
    const uniqueSuffix = excludedWords.size + 1;

    return {
      language: "English",
      secretWord: `Mystery Item ${uniqueSuffix}`,
      hint: "A secret object for this round",
    };
  }

  const picked = available[Math.floor(Math.random() * available.length)];

  return {
    language: "English",
    secretWord: picked.word,
    hint: picked.hints[hintDifficulty],
  };
}

export async function createImpostorRound(
  playersInput: string[],
  impostorCountInput = 1,
  excludedWordsInput: string[] = [],
  hintDifficultyInput: HintDifficulty = "normal",
): Promise<Omit<GameStartResponse, "gameId" | "createdAt">> {
  const players = normalizePlayers(playersInput);
  const excludedWords = new Set(
    excludedWordsInput.map((word) => word.trim().toLowerCase()).filter(Boolean),
  );

  const playerError = validatePlayers(players);
  if (playerError) {
    throw new Error(playerError);
  }

  const impostorCount = Math.min(impostorCountInput, players.length - 1);
  const impostorError = validateImpostorCount(impostorCount, players.length);
  if (impostorError) {
    throw new Error(impostorError);
  }

  if (!validateHintDifficulty(hintDifficultyInput)) {
    throw new Error("Hint difficulty must be easy, normal, hard, or difficult.");
  }

  const hintDifficulty = hintDifficultyInput;

  let language: GameStartResponse["language"] = "English";
  let secretWord = "Sunflower";
  let hint = "A bright yellow plant";

  const maxAttempts = 8;
  let succeeded = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const generated = await generateImpostorContent(hintDifficulty);
      if (isExcludedWord(generated.secretWord, excludedWords)) {
        continue;
      }

      language = generated.language;
      secretWord = generated.secretWord;
      hint = generated.hint;
      succeeded = true;
      break;
    } catch {
      if (attempt === maxAttempts) {
        // Keep a safe fallback so game can still start gracefully.
      }
    }
  }

  if (!succeeded) {
    const fallback = pickFallbackWord(excludedWords, hintDifficulty);
    language = fallback.language;
    secretWord = fallback.secretWord;
    hint = fallback.hint;
  }

  const impostorIndices = pickRandomIndices(players.length, impostorCount);
  const assignedPlayers = players.map((name, index) => ({
    name,
    isImpostor: impostorIndices.has(index),
  }));

  return {
    language,
    secretWord,
    hint,
    hintDifficulty,
    players: assignedPlayers,
  };
}

export async function startImpostorGame(
  playersInput: string[],
  impostorCountInput = 1,
  excludedWordsInput: string[] = [],
  hintDifficultyInput: HintDifficulty = "normal",
): Promise<GameStartResponse> {
  const round = await createImpostorRound(
    playersInput,
    impostorCountInput,
    excludedWordsInput,
    hintDifficultyInput,
  );
  const players = normalizePlayers(playersInput);
  const { language, secretWord, hint, hintDifficulty, players: assignedPlayers } = round;

  const supabase = getServiceSupabase();
  let gameId: string | null = null;

  if (supabase) {
    const impostorNames = assignedPlayers
      .filter((player) => player.isImpostor)
      .map((player) => player.name);

    const gameInsert = await supabase
      .from("games")
      .insert({
        language,
        word: secretWord,
        hint,
        impostor_player: impostorNames.join(", "),
        player_count: players.length,
      })
      .select("id")
      .single();

    if (!gameInsert.error && gameInsert.data?.id) {
      gameId = gameInsert.data.id;

      const playerRows = assignedPlayers.map((player) => ({
        game_id: gameId,
        player_name: player.name,
        is_impostor: player.isImpostor,
      }));

      await supabase.from("players").insert(playerRows);
    }
  }

  return {
    gameId,
    language,
    secretWord,
    hint,
    hintDifficulty,
    players: assignedPlayers,
    createdAt: new Date().toISOString(),
  };
}
