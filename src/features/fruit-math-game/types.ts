import type { GameSessionStatus, MiniGameConfig, RewardTicketSummary } from '../../types';

export type FruitMathQuestion = {
  id: string;
  expression: string;
  timeLimitSeconds: number;
  questionNumber: number;
  totalQuestions: number;
  options: Array<{ id: string; value: number; fruit: string }>;
};

export type FruitMathGameState = {
  config: MiniGameConfig;
  attemptsUsedToday: number;
  attemptsRemainingToday: number;
  tickets: RewardTicketSummary;
};

export type FruitMathRound = {
  sessionId: string;
  status: GameSessionStatus;
  question: FruitMathQuestion | null;
  correctAnswers: number;
  wrongAnswers: number;
  ticketsAwarded: number;
};
