import {
  AISpiritualTalkPayload,
  AITruthOrDarePayload,
  AIWordPayload,
  HintDifficulty,
  SpiritualQuestionStyle,
  SupportedLanguage,
  TruthOrDareMode,
} from "@/lib/types";

const ALLOWED_LANGUAGES: SupportedLanguage[] = ["English"];

function getDifficultyHintRule(difficulty: HintDifficulty): string {
  if (difficulty === "easy") {
    return "Make the hint quite direct and clear, but never include the secret word or obvious synonyms.";
  }

  if (difficulty === "hard") {
    return "Make the hint indirect. It should be related, but noticeably less obvious than normal mode.";
  }

  if (difficulty === "difficult") {
    return "Make the hint the farthest and most subtle among all modes. It must still be related, but should feel challenging and not too close to the secret word.";
  }

  return "Make the hint moderately related: helpful but not too direct and not too vague.";
}

function getDifficultyCategoryRule(difficulty: HintDifficulty): string {
  if (difficulty === "easy") {
    return "Preferred secret-word categories: things, animals, nature.";
  }

  if (difficulty === "normal") {
    return "Preferred secret-word categories: places, countries, things, nature.";
  }

  if (difficulty === "hard") {
    return "Preferred secret-word categories: singers, countries, places, nature.";
  }

  return "Preferred secret-word categories: singers, countries, places, animals, things, nature. Prefer less common but still family-friendly words.";
}

function buildPrompt(difficulty: HintDifficulty): string {
  return `You are generating content for a party game called "Who's the Impostor".
Use English only.
Generate one simple, family-friendly secret word and one clue for the impostor.
${getDifficultyHintRule(difficulty)}
${getDifficultyCategoryRule(difficulty)}
The clue must not reveal the exact word.
Keep language consistent between secretWord and hint.
Return JSON only in this exact format:
{"language":"English","secretWord":"...","hint":"..."}`;
}

export async function generateImpostorContent(
  difficulty: HintDifficulty = "normal",
): Promise<AIWordPayload> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      temperature: 0.95,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildPrompt(difficulty) },
        { role: "user", content: `Generate one new game payload now. Difficulty: ${difficulty}.` },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq request failed with status ${response.status}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("Groq returned an invalid payload");
  }

  const parsed = JSON.parse(content) as AIWordPayload;

  if (!ALLOWED_LANGUAGES.includes(parsed.language)) {
    throw new Error("Invalid language returned by AI");
  }

  if (!parsed.secretWord?.trim() || !parsed.hint?.trim()) {
    throw new Error("AI response missing fields");
  }

  const secretWord = parsed.secretWord.trim();
  const hint = parsed.hint.trim();

  if (secretWord.toLowerCase() === hint.toLowerCase()) {
    throw new Error("Hint must differ from secret word");
  }

  if (hint.toLowerCase().includes(secretWord.toLowerCase())) {
    throw new Error("Hint leaked secret word");
  }

  return {
    language: parsed.language,
    secretWord,
    hint,
  };
}

function getTruthOrDareDifficultyRule(difficulty: HintDifficulty): string {
  if (difficulty === "easy") {
    return "Make the task very light, fun, and beginner-friendly.";
  }

  if (difficulty === "hard") {
    return "Make the task challenging but safe and still realistic in a group setting.";
  }

  if (difficulty === "difficult") {
    return "Make the task the most challenging of all levels, but always safe and family-friendly.";
  }

  return "Make the task medium difficulty and fun for most groups.";
}

function buildTruthOrDarePrompt(
  playerName: string,
  difficulty: HintDifficulty,
  mode: TruthOrDareMode | "random",
): string {
  return `You are generating one prompt for a party game called Truth or Dare.
Use English only.
Create one short, family-friendly prompt for player "${playerName}".
${getTruthOrDareDifficultyRule(difficulty)}
Mode requirement: ${mode === "random" ? "Pick either truth or dare." : `Use mode ${mode}.`}
The question must include the player's name exactly as "${playerName}".
Do not produce unsafe, hateful, sexual, illegal, or dangerous content.
Return JSON only in this exact format:
{"language":"English","mode":"truth|dare","question":"..."}`;
}

export async function generateTruthOrDareQuestion(params: {
  playerName: string;
  difficulty: HintDifficulty;
  mode?: TruthOrDareMode | "random";
}): Promise<AITruthOrDarePayload> {
  const { playerName, difficulty, mode = "random" } = params;
  const safeName = playerName.trim();

  if (!safeName) {
    throw new Error("Player name is required for Truth or Dare generation.");
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildTruthOrDarePrompt(safeName, difficulty, mode),
        },
        {
          role: "user",
          content: `Generate one Truth or Dare prompt now. Difficulty: ${difficulty}.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq request failed with status ${response.status}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("Groq returned an invalid Truth or Dare payload");
  }

  const parsed = JSON.parse(content) as AITruthOrDarePayload;

  if (!ALLOWED_LANGUAGES.includes(parsed.language)) {
    throw new Error("Invalid language returned by AI");
  }

  if (parsed.mode !== "truth" && parsed.mode !== "dare") {
    throw new Error("AI returned invalid Truth or Dare mode");
  }

  const question = parsed.question?.trim();
  if (!question) {
    throw new Error("AI response missing Truth or Dare question");
  }

  if (!question.toLowerCase().includes(safeName.toLowerCase())) {
    throw new Error("Question must include the player's name");
  }

  return {
    language: parsed.language,
    mode: parsed.mode,
    question,
  };
}

function buildSpiritualTalkPrompt(params: {
  playerName: string;
  allPlayers: string[];
  style: SpiritualQuestionStyle;
}): string {
  const { playerName, allPlayers, style } = params;
  const otherPlayers = allPlayers.filter(
    (name) => name.toLowerCase() !== playerName.toLowerCase(),
  );

  const styleRuleMap: Record<SpiritualQuestionStyle, string> = {
    mixed:
      "Mix themes across struggle, joy, personal growth, temptation, and faith journey.",
    deep:
      "Ask a deep, hard-to-answer spiritual question with emotional impact.",
    struggle:
      "Focus on struggle, doubt, temptation, pain, or feeling far from God.",
    joy:
      "Focus on gratitude, hope, answered prayer, joy, and happy moments with God.",
    personal:
      "Focus on personal life, close relationships, daily habits, and life direction.",
  };

  return `You are generating one emotional reflection question for a group activity called "Let's Talk About Spiritual Life".
Use English only.
The question must mention player name "${playerName}" exactly.
Sometimes include one extra player name from this list when natural: ${otherPlayers.join(", ") || "none"}.
Question themes should be spiritually and emotionally reflective, such as relationship with God, devotions, spiritual growth, prayer life, struggles, temptations, gratitude, forgiveness, and testimony moments.
${styleRuleMap[style]}
Tone should be warm, respectful, and safe for sharing in a group.
Use simple words that are easy to understand.
Keep the question short: maximum 18 words.
Make it impactful and specific, not generic.
At times include prompts like feeling distant from God (for example: "${playerName}, when did you feel you couldn't feel God anymore?").
Do not shame, accuse, or force sensitive disclosure.
Do not produce hateful, sexual, or dangerous content.
Return JSON only in this exact format:
{"language":"English","question":"..."}`;
}

export async function generateSpiritualTalkQuestion(params: {
  playerName: string;
  allPlayers: string[];
  style?: SpiritualQuestionStyle;
}): Promise<AISpiritualTalkPayload> {
  const safePlayer = params.playerName.trim();
  const safePlayers = params.allPlayers
    .map((name) => name.trim())
    .filter(Boolean);
  const style = params.style ?? "mixed";

  if (!safePlayer) {
    throw new Error("Player name is required for spiritual question generation.");
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildSpiritualTalkPrompt({
            playerName: safePlayer,
            allPlayers: safePlayers,
            style,
          }),
        },
        {
          role: "user",
          content: `Generate one short spiritual reflection question for ${safePlayer}. Style: ${style}.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq request failed with status ${response.status}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("Groq returned an invalid spiritual question payload");
  }

  const parsed = JSON.parse(content) as AISpiritualTalkPayload;

  if (!ALLOWED_LANGUAGES.includes(parsed.language)) {
    throw new Error("Invalid language returned by AI");
  }

  const question = parsed.question?.trim();
  if (!question) {
    throw new Error("AI response missing spiritual question");
  }

  if (!question.toLowerCase().includes(safePlayer.toLowerCase())) {
    throw new Error("Spiritual question must include the player's name");
  }

  if (question.split(/\s+/).length > 20) {
    throw new Error("Spiritual question is too long");
  }

  return {
    language: parsed.language,
    question,
  };
}
