import { getBestMove } from "./botBrains";
import { GameState, Difficulty } from "../gameLogic";

self.onmessage = (e: MessageEvent) => {
  const { gameState, difficulty } = e.data as {
    gameState: GameState;
    difficulty: Difficulty;
  };

  if (!gameState) return;

  // Run the AI search
  const bestMove = getBestMove(gameState, difficulty);

  // Return result
  self.postMessage(bestMove);
};

export {};
