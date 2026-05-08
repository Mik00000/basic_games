import { useEffect, useReducer, useRef, useMemo } from "react";
import { gameReducer } from "../../../games/chess/gameReducer";
import { getInitialGameState } from "../../../games/chess/gameLogic";

export const useBackgroundChess = () => {
  const [state, dispatch] = useReducer(gameReducer, getInitialGameState());

  const workerRef = useRef<Worker | null>(null);
  const botMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../../../games/chess/ai/botWorker.ts", import.meta.url),
      { type: "module" },
    );

    workerRef.current.onmessage = (e) => {
      const move = e.data;
      if (move) {
        if (botMoveTimeoutRef.current) clearTimeout(botMoveTimeoutRef.current);
        botMoveTimeoutRef.current = setTimeout(
          () => {
            dispatch({ type: "MAKE_MOVE", from: move.from, to: move.to });
            botMoveTimeoutRef.current = null;
          },
          1000 // Затримка між ходами для візуального ефекту
        );
      }
    };

    return () => {
      workerRef.current?.terminate();
      if (botMoveTimeoutRef.current) clearTimeout(botMoveTimeoutRef.current);
    };
  }, []);

  const workerState = useMemo(
    () => ({
      board: state.board,
      currentTurn: state.currentTurn,
      winner: state.winner,
      kingsPositions: state.kingsPositions,
      history: state.history,
      availableMoves: state.availableMoves,
      selectedCell: state.selectedCell,
      sideInCheck: state.sideInCheck,
      playerInfo: state.playerInfo,
      isPaused: false,
    }),
    [
      state.board,
      state.currentTurn,
      state.winner,
      state.kingsPositions,
      state.history,
      state.availableMoves,
      state.selectedCell,
      state.sideInCheck,
      state.playerInfo,
    ],
  );

  useEffect(() => {
    if (state.winner) {
      const t = setTimeout(() => {
        dispatch({ type: "RESET" });
      }, 5000);
      return () => clearTimeout(t);
    } else {
      workerRef.current?.postMessage({
        gameState: workerState,
        difficulty: "optimized", // Спеціальний рівень щоб швидко та більш-менш розумно
      });
    }
  }, [workerState, state.winner]);

  // Якщо пішак дійшов до краю, відразу перетворюємо на королеву
  useEffect(() => {
    if (state.pendingPromotion) {
      dispatch({ type: "PROMOTE_PAWN", pieceType: "queen" });
    }
  }, [state.pendingPromotion]);

  return { state };
};
