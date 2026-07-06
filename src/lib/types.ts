export type SupportedLanguage = "English";
export type HintDifficulty = "easy" | "normal" | "hard" | "difficult";

export interface AIWordPayload {
  language: SupportedLanguage;
  secretWord: string;
  hint: string;
}

export type TruthOrDareMode = "truth" | "dare";

export interface AITruthOrDarePayload {
  language: SupportedLanguage;
  mode: TruthOrDareMode;
  question: string;
}

export interface AISpiritualTalkPayload {
  language: SupportedLanguage;
  question: string;
}

export type SpiritualQuestionStyle =
  | "mixed"
  | "deep"
  | "struggle"
  | "joy"
  | "personal";

export interface PlayerRole {
  name: string;
  isImpostor: boolean;
}

export type ImpostorRoomStatus = "waiting" | "started" | "finished";
export type ImpostorRoomPhase = "lobby" | "role_reveal" | "voting" | "results";

export interface ImpostorRoomSettings {
  hideHint: boolean;
  impostorCount: number;
  hintDifficulty: HintDifficulty;
}

export interface ImpostorRoom {
  id: string;
  joinCode: string;
  roomName: string;
  maxPlayers: number;
  isPublic: boolean;
  status: ImpostorRoomStatus;
  phase: ImpostorRoomPhase;
  hostPlayerToken: string;
  createdAt: string;
  language: SupportedLanguage | null;
  secretWord: string | null;
  hint: string | null;
  roundAwarded: boolean;
  settings: ImpostorRoomSettings;
}

export interface ImpostorRoomPlayer {
  id: string;
  roomId: string;
  playerName: string;
  playerToken: string;
  isHost: boolean;
  isImpostor: boolean | null;
  hasSeenRole: boolean;
  readyForNextRound: boolean;
  score: number;
  voteTargetPlayerId: string | null;
  joinedAt: string;
}

export interface CreateImpostorRoomResponse {
  room: ImpostorRoom;
  player: ImpostorRoomPlayer;
}

export interface JoinImpostorRoomResponse {
  room: ImpostorRoom;
  player: ImpostorRoomPlayer;
}

export interface GameStartResponse {
  gameId: string | null;
  language: SupportedLanguage;
  secretWord: string;
  hint: string;
  hintDifficulty: HintDifficulty;
  players: PlayerRole[];
  createdAt: string;
}

export interface GameSettings {
  hideHint: boolean;
  impostorCount: number;
  hintDifficulty: HintDifficulty;
  scores: Record<string, number>;
  usedWords: string[];
}

export interface ImpostorGameSession extends GameStartResponse {
  settings: GameSettings;
}

export interface RemoteImpostorSession {
  roomCode: string;
  playerToken: string;
}

export interface PersistedGameSummary {
  impostorName: string;
  language: SupportedLanguage;
  word: string;
  hint: string;
  players: string[];
}

export interface TruthOrDareChallenge {
  playerName: string;
  mode: TruthOrDareMode;
  question: string;
  language: SupportedLanguage;
  achieved: boolean | null;
}

export interface TruthOrDareGameSession {
  players: string[];
  currentTurn: number;
  settings: {
    difficulty: HintDifficulty;
    scores: Record<string, number>;
  };
  currentChallenge: TruthOrDareChallenge | null;
  history: TruthOrDareChallenge[];
}

export interface SpiritualTalkPrompt {
  playerName: string;
  question: string;
  language: SupportedLanguage;
  achieved: boolean | null;
}

export interface SpiritualTalkSession {
  players: string[];
  currentTurn: number;
  questionStyle: SpiritualQuestionStyle;
  scores: Record<string, number>;
  currentPrompt: SpiritualTalkPrompt | null;
  history: SpiritualTalkPrompt[];
}
