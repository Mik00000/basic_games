import { useEffect, useReducer, useRef, useMemo } from "react";
import { useOnlineGame } from "../../hooks/useOnlineGame";
import { gameReducer } from "./gameReducer";
import {
  getInitialGameState,
  mapServerStateToLocal,
  ServerChessState,
} from "./gameLogic";
import {
  generateRandomNumber,
  useStickyStateWithExpiry,
} from "../../components/common/utils";
import { getAvailableMoves } from "./gameLogic";

export const useGame = (
  mode: "lobby" | "local" | "bot" | "online",
  _roomId?: string,
) => {
  // 1. Local State (Persistence for local/bot)
  const [persistedState, setPersistedState] = useStickyStateWithExpiry(
    getInitialGameState(),
    `chess_state_${mode === "online" ? "local" : mode}`, // Don't persist online state in the same key
    24 * 60 * 60 * 1000,
  );

  // 2. Reducer (Manages local interactions: Selection, UI state, or full game in local mode)
  const initial =
    mode === "lobby" || mode === "online"
      ? getInitialGameState()
      : persistedState;
  const [localState, dispatch] = useReducer(gameReducer, initial);

  // Sync state to storage (only for local/bot)
  useEffect(() => {
    if (mode === "local" || mode === "bot") {
      setPersistedState(localState);
    }
  }, [localState, mode, setPersistedState]);

  // 3. Online Hooks
  const {
    gameState: serverState,
    isConnected,
    isConnecting,
    currentRoom,
    currentPlayer: onlineMe,
    leaveRoom,
    makeMove,
    joinRoom,
    sendVote,
  } = useOnlineGame<ServerChessState>();

  // 4. Compute Final State (Hybrid)
  const state = useMemo(() => {
    if (mode === "online" && serverState) {
      // Merge Server Data with Local UI State (Selection)
      const mapped = mapServerStateToLocal(
        serverState,
        onlineMe?.id,
        localState,
        currentRoom?.players || [],
      );

      // Keep local selection/highlighting logic if valid
      // But ensure we validate available moves based on SERVER board if we want to be safe,
      // or just trust local logic on the mapped board.
      // We'll trust the mapped board (which is server board).
      // The local reducer 'availableMoves' might be stale?
      // Actually, when we select a cell in online mode, we dispatch SELECT_CELL to local reducer.
      // The local reducer calculates available moves based on *its* board.
      // ERROR: Local reducer checking its own (empty/stale) board vs Server board.

      // FIX: We need to sync the local reducer's board with server board for `SELECT_CELL` to work correctly?
      // OR: We manually calculate available moves here for the view.

      // Let's rely on valid highlighting by injecting the server board into the validation helper
      // inside the component or just re-calc here if selected.

      // Simpler Plan for Phase 1:
      // useGame returns the Mapped State.
      // We manage 'selectedCell' via a separate useState or just use the localState one,
      // BUT we must keep localState.board synced with serverState.board?
      return mapped;
    }
    return localState;
  }, [mode, serverState, onlineMe, localState, currentRoom?.players]);

  // Sync Local Board with Server Board to allow Reducer to calculate Valid Moves correctly
  // REMOVED CONSTANT SYNC: We now decouple Reducer from Server Board validation.
  // The Reducer only blindly stores selection. UI merges it with Server Board.
  const localStateRef = useRef(localState);
  useEffect(() => {
    localStateRef.current = localState;
  }, [localState]);

  // useEffect(() => {
  //   if (mode === "online" && serverState) {
  //      const mapped = mapServerStateToLocal(serverState, onlineMe?.id, localStateRef.current, currentRoom?.players || []);
  //      dispatch({ type: "SYNC_STATE_ONLINE", state: mapped });
  //   }
  // }, [serverState, mode, onlineMe?.id, currentRoom?.players]);

  // --- Bot / Worker Logic (Existing) ---
  const workerRef = useRef<Worker | null>(null);
  const botMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (mode === "bot") {
      workerRef.current = new Worker(
        new URL("./ai/botWorker.ts", import.meta.url),
        { type: "module" },
      );
      workerRef.current.onmessage = (e) => {
        const move = e.data;
        if (move) {
          // ... (Same Bot Logic)
          // Simplified for brevity in replacement if unchanged, but I must provide full content
          // I will copy the existing bot logic.
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
          if (botMoveTimeoutRef.current)
            clearTimeout(botMoveTimeoutRef.current);
          botMoveTimeoutRef.current = setTimeout(
            () => {
              dispatch({ type: "MAKE_MOVE", from: move.from, to: move.to });
              botMoveTimeoutRef.current = null;
            },
            generateRandomNumber(750 * timeModifier, 1500 * timeModifier),
          );
        }
      };
      return () => {
        workerRef.current?.terminate();
        if (botMoveTimeoutRef.current) clearTimeout(botMoveTimeoutRef.current);
      };
    }
  }, [mode, state.difficulty]); // Dependency on 'state' diff might be tricky if state changes fast

  // Trigger Bot Move
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

  useEffect(() => {
    if (
      mode === "bot" &&
      workerState.currentTurn === "black" &&
      !workerState.winner
    ) {
      workerRef.current?.postMessage({
        gameState: workerState,
        difficulty: state.difficulty,
      });
    }
  }, [workerState, mode, state.difficulty]);

  // Auto-promote Bot
  useEffect(() => {
    if (
      mode === "bot" &&
      state.currentTurn === "black" &&
      state.pendingPromotion
    ) {
      const t = setTimeout(
        () => dispatch({ type: "PROMOTE_PAWN", pieceType: "queen" }),
        500,
      );
      return () => clearTimeout(t);
    }
  }, [mode, state.currentTurn, state.pendingPromotion]);

  const handleMove = async (from: [number, number], to: [number, number]) => {
    if (state.isPaused) return; // Block moves if paused
    if (mode === "online") {
      if (!onlineMe || !currentRoom) return;
      const myColor =
        onlineMe.id === serverState?.playerIds.white ? "white" : "black";
      if (state.currentTurn !== myColor) return;

      // Check for Promotion triggers (Pawns reaching last rank)
      const piece = state.board[from[0]][from[1]];
      const isPawn = piece?.type === "pawn";
      const isPromo = isPawn && (to[0] === 0 || to[0] === 7);

      if (isPromo) {
        dispatch({ type: "SET_PENDING_PROMOTION_ONLINE", from, to } as any);
        return;
      }

      // Execute server move
      await makeMove({ from, to });

      // We do NOT dispatch "MAKE_MOVE" locally for online, because the server state sync will handle it.
      // However, we SHOULD clear any selection to avoid "stuck" highlight until server responds.
      dispatch({ type: "RESET_SELECTION_ONLINE" } as any);
    } else {
      // Local/Bot
      dispatch({ type: "MAKE_MOVE", from, to });
    }
  };

  // 5. Actions
  const onCellClick = async (r: number, c: number) => {
    if (state.isPaused) return;

    if (mode === "online") {
      if (!onlineMe || !currentRoom) return;

      const myColor =
        onlineMe.id === serverState?.playerIds.white ? "white" : "black";
      if (state.currentTurn !== myColor) return;

      // If we have a selected cell, try to move
      if (state.selectedCell) {
        const from = state.selectedCell;

        // If clicking same cell, deselect
        if (from[0] === r && from[1] === c) {
          dispatch({ type: "SELECT_CELL_ONLINE_RESET" } as any);
        } else {
          // Check if destination is a friendly piece (Switch Selection)
          const targetPiece = state.board[r][c];
          if (targetPiece && targetPiece.color === myColor) {
            const moves = getAvailableMoves(state, [r, c]);
            dispatch({
              type: "SET_SELECTION_ONLINE",
              cell: [r, c],
              availableMoves: moves,
            } as any);
            return;
          }

          // Try to move
          await handleMove(from, [r, c]);
        }
      } else {
        // Select logic
        const piece = state.board[r][c];
        if (piece && piece.color === myColor) {
          // We do NOT dispatch SYNC_STATE_ONLINE anymore.
          // We calculate moves using the *current* state (mapped).
          const moves = getAvailableMoves(state, [r, c]);
          dispatch({
            type: "SET_SELECTION_ONLINE",
            cell: [r, c],
            availableMoves: moves,
          } as any);
        }
      }
      return;
    }

    // Local / Bot Logic
    if (state.currentTurn === "black" && mode !== "local") return;

    if (state.selectedCell) {
      if (state.selectedCell[0] === r && state.selectedCell[1] === c) {
        dispatch({ type: "SELECT_CELL", cell: [r, c] }); // toggles/resets in reducer? Reducer SELECT_CELL usually just selects.
        // If we want toggle off behavior, we need check.
        // Existing reducer: "if cell... return ... selectedCell: action.cell".
        // It doesn't toggle off if same. It just re-selects.
        // But for consistency let's leave local logic as is.
        handleMove(state.selectedCell, [r, c]); // Wait, moving to same square?
        // handleMove to same square is usually invalid and ignored by reducer.
        // If we want to deselect:
        dispatch({ type: "SELECT_CELL", cell: [r, c] }); // This just re-selects.
        // To deselect in local, usually clicking *empty* or *invalid* deselects.
        // Clicking same piece just re-selects.
      } else {
        handleMove(state.selectedCell, [r, c]);
      }
    } else {
      dispatch({ type: "SELECT_CELL", cell: [r, c] });
    }
  };

  const onOnlinePromote = async (pieceType: string) => {
    // Called when user selects promotion piece in UI
    if (!state.pendingPromotion) return;
    const { from, to } = state.pendingPromotion;
    await makeMove({ from, to, promotion: pieceType });
    dispatch({ type: "RESET_SELECTION_ONLINE" } as any);
  };

  const onTimeUpdate = (player: "white" | "black", time: number) => {
    if (mode !== "online") dispatch({ type: "UPDATE_TIME", player, time });
  };

  const onTimeout = (player: "white" | "black") => {
    if (mode !== "online") dispatch({ type: "TIMEOUT", player });
  };

  const onRestart = () => {
    if (mode === "online") {
      // Send Vote
    } else {
      if (botMoveTimeoutRef.current) {
        clearTimeout(botMoveTimeoutRef.current);
        botMoveTimeoutRef.current = null;
      }
      dispatch({ type: "RESET" });
    }
  };

  const togglePause = () => {
    if (mode !== "online") {
      dispatch({ type: "TOGGLE_PAUSE" });
    }
  };

  return {
    state,
    onCellClick,
    onTimeUpdate,
    onTimeout,
    onRestart,
    onOnlinePromote,
    isConnected,
    isConnecting,
    currentRoom,
    currentPlayer: onlineMe,
    leaveRoom: mode === "lobby" || mode === "online" ? leaveRoom : undefined,
    dispatch, // Still useful?
    joinRoom,
    handleMove, // Exported for Drag-and-Drop
    togglePause,
    sendVote, // Export sendVote
  };
};
