import { useEffect, useReducer, useRef, useMemo } from "react";
import { useOnlineGame } from "../../hooks/useOnlineGame";
import { gameReducer } from "./gameReducer";
import { getInitialGameState } from "./gameLogic";
import {
  generateRandomNumber,
  useStickyStateWithExpiry,
} from "../../components/common/utils";

export const useGame = (mode: "lobby" | "local" | "bot", _roomId?: string) => {
  // 1. Local State (always needed for rendering)
  // 0. Persistence
  const [persistedState, setPersistedState] = useStickyStateWithExpiry(
    getInitialGameState(),
    `chess_state_${mode}`,
    24 * 60 * 60 * 1000,
  );

  // 1. Local State (always needed for rendering)
  const [state, dispatch] = useReducer(
    gameReducer,
    mode === "lobby" ? getInitialGameState() : persistedState,
  );

  // Sync state to storage
  useEffect(() => {
    if (mode !== "lobby") {
      setPersistedState(state);
    }
  }, [state, mode, setPersistedState]);

  const workerRef = useRef<Worker | null>(null);
  const botMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Worker for offline/local mode
  useEffect(() => {
    if (mode === "bot") {
      workerRef.current = new Worker(
        new URL("./ai/botWorker.ts", import.meta.url),
        { type: "module" },
      );

      workerRef.current.onmessage = (e) => {
        const move = e.data;
        if (move) {
          let timeModifier = 1;
          switch (state.difficulty) {
            case "monkey":
              timeModifier = 1.2;
              break;
            case "easy":
              timeModifier = 1;
              break;
            case "medium":
              timeModifier = 0.9;
              break;
            case "hard":
              timeModifier = 0.7;
              break;
          }
          if (botMoveTimeoutRef.current) {
            clearTimeout(botMoveTimeoutRef.current);
          }
          botMoveTimeoutRef.current = setTimeout(
            () => {
              dispatch({
                type: "MAKE_MOVE",
                from: move.from,
                to: move.to,
              });
              botMoveTimeoutRef.current = null;
            },
            generateRandomNumber(750 * timeModifier, 1500 * timeModifier),
          );
        }
      };

      return () => {
        workerRef.current?.terminate();
        if (botMoveTimeoutRef.current) {
          clearTimeout(botMoveTimeoutRef.current);
        }
      };
    }
  }, [mode, state.difficulty]);

  // Memoize state for worker to avoid re-triggering on time updates
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
      playerInfo: {
        // Dummy player info to satisfy type if needed, or pass exact structure
        white: { name: "", remainingTime: 0 },
        black: { name: "", remainingTime: 0 },
      },
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
    ],
  );

  // Trigger Bot Move
  useEffect(() => {
    if (
      mode === "bot" &&
      workerState.currentTurn === "black" &&
      !workerState.winner
    ) {
      workerRef.current?.postMessage({
        gameState: workerState, // Send memoized state
        difficulty: state.difficulty,
      });
    }
  }, [workerState, mode, state.difficulty]);

  // Auto-promote for bot
  useEffect(() => {
    if (
      mode === "bot" &&
      state.currentTurn === "black" &&
      state.pendingPromotion
    ) {
      const promotionTimeout = setTimeout(() => {
        dispatch({ type: "PROMOTE_PAWN", pieceType: "queen" });
      }, 500); // Visual delay
      return () => clearTimeout(promotionTimeout);
    }
  }, [mode, state.currentTurn, state.pendingPromotion]);

  // 2. Online Hooks
  const {
    gameState: serverState,
    isConnected,
    isConnecting,
    currentRoom,
    currentPlayer,
    leaveRoom,
  } = useOnlineGame();

  // 3. Sync Server State (if online)
  useEffect(() => {
    if (mode === "lobby" && serverState) {
      // dispatch({ type: "SYNC_STATE", newState: serverState });
    }
  }, [mode, serverState]);

  // 4. Unified Action Handler
  const onCellClick = (r: number, c: number) => {
    // Restrict player from moving for the bot/opponent in non-local modes
    if (state.currentTurn === "black" && mode !== "local") {
      return;
    }

    if (state.selectedCell) {
      dispatch({
        type: "MAKE_MOVE",
        from: state.selectedCell,
        to: [r, c],
      });
    } else {
      dispatch({ type: "SELECT_CELL", cell: [r, c] });
    }
  };

  const onTimeUpdate = (player: "white" | "black", time: number) => {
    dispatch({ type: "UPDATE_TIME", player, time });
  };

  const onTimeout = (player: "white" | "black") => {
    dispatch({ type: "TIMEOUT", player });
  };

  const onRestart = () => {
    if (botMoveTimeoutRef.current) {
      clearTimeout(botMoveTimeoutRef.current);
      botMoveTimeoutRef.current = null;
    }
    dispatch({ type: "RESET" });
  };

  return {
    state,
    onCellClick,
    onTimeUpdate,
    onTimeout,
    onRestart,
    isConnected,
    isConnecting,
    currentRoom,
    currentPlayer,
    leaveRoom: mode === "lobby" ? leaveRoom : undefined,
    dispatch,
  };
};
