import {
  GameState,
  getAvailableMoves,
  handleCastling,
  handleRegularMove,
  handleTimeUpdate,
  handleTimeout,
  Difficulty,
  handlePromotion,
  Piece,
  getInitialGameState,
} from "./gameLogic";
type GameAction =
  | { type: "MAKE_MOVE"; from: [number, number]; to: [number, number] }
  | { type: "SELECT_CELL"; cell: [number, number] }
  | { type: "SET_PLAYER"; player: "white" | "black" }
  | { type: "SET_WINNER"; winner: "white" | "black" | "draw" | null }
  | { type: "HIDE_COIN_TOSS" }
  | { type: "RESET" }
  | { type: "UPDATE_TIME"; player: "white" | "black"; time: number }
  | { type: "TIMEOUT"; player: "white" | "black" }
  | { type: "SET_DIFFICULTY"; difficulty: Difficulty }
  | { type: "SET_GAME_MODE"; gameMode: "lobby" | "local" | "bot" }
  | { type: "PROMOTE_PAWN"; pieceType: Piece["type"] }
  | { type: "SYNC_STATE_ONLINE"; state: GameState }
  | {
      type: "SET_SELECTION_ONLINE";
      cell: [number, number];
      availableMoves: [number, number][];
    }
  | { type: "SELECT_CELL_ONLINE_RESET" }
  | {
      type: "SET_PENDING_PROMOTION_ONLINE";
      from: [number, number];
      to: [number, number];
    }
  | { type: "RESET_SELECTION_ONLINE" }
  | { type: "TOGGLE_PAUSE" };

export const gameReducer = (
  state: GameState,
  action: GameAction,
): GameState => {
  switch (action.type) {
    case "MAKE_MOVE": {
      if (state.winner) return state;
      // ... (existing helper usage logic? No, let's keep it simple and just use handleRegularMove for local)
      // BUT WAIT, the existing code had logic inside the case. I must preserve it.
      // Re-reading Step 49 content...
      const { from, to } = action;
      // ... logic ...
      // I will copy the original logic to be safe, or just insert the new cases before default.
      // Let's replace the whole reducer to be safe and include new cases.
      return handleMoveAction(state, from, to);
    }

    case "SELECT_CELL": {
      // We must check if cell exists.
      // If passing a cell that is empty, it should probably deselect?
      // Existing logic: if !cell || wrong color -> return state (ignore).
      // But if we want to deselect by clicking empty, that's different.
      // Let's stick to existing:
      const cell = state.board[action.cell[0]][action.cell[1]];
      if (!cell) return { ...state, selectedCell: null, availableMoves: [] };
      if (cell.color !== state.currentTurn) return state; // Ignore clicking enemy or empty

      return {
        ...state,
        selectedCell: action.cell,
        availableMoves: getAvailableMoves(state, action.cell),
      };
    }

    case "RESET":
      return getInitialGameState();

    case "UPDATE_TIME":
      return handleTimeUpdate(state, action.player, action.time);

    case "TIMEOUT":
      return handleTimeout(state, action.player);

    case "SET_DIFFICULTY":
      return { ...state, difficulty: action.difficulty };

    case "SET_GAME_MODE":
      return { ...state, gameMode: action.gameMode };

    case "PROMOTE_PAWN":
      return handlePromotion(state, action.pieceType);

    // --- NEW ONLINE ACTIONS ---
    // --- NEW ONLINE ACTIONS ---
    case "SYNC_STATE_ONLINE":
      // We only sync essential non-UI state if needed, or just keep it minimum.
      // Actually, we DO NOT want to sync board to local state anymore because useGame handles the merge.
      // But we might want to sync 'currentTurn' if we want local logic to know whose turn it is?
      // Let's just update the turn and winner, but leave board alone/or keep it if it doesn't hurt.
      // THE FIX: Do NOT reset selectedCell here!
      return {
        ...state,
        board: action.state.board,
        currentTurn: action.state.currentTurn,
        kingsPositions: action.state.kingsPositions,
        winner: action.state.winner,
        history: action.state.history,
        // Preserve local selection!
        // selectedCell: state.selectedCell,
        // availableMoves: state.availableMoves
        // (avail moves might be stale if board changed? Yes. But mapServerStateToLocal handles recalc!)
      };

    case "SET_SELECTION_ONLINE":
      return {
        ...state,
        selectedCell: action.cell,
        availableMoves: action.availableMoves,
      };

    case "SELECT_CELL_ONLINE_RESET":
      return { ...state, selectedCell: null, availableMoves: [] };

    case "SET_PENDING_PROMOTION_ONLINE":
      return {
        ...state,
        pendingPromotion: { from: action.from, to: action.to },
      };

    case "RESET_SELECTION_ONLINE":
      return {
        ...state,
        selectedCell: null,
        availableMoves: [],
        pendingPromotion: null,
      };

    case "TOGGLE_PAUSE":
      return { ...state, isPaused: !state.isPaused };

    default:
      return state;
  }
};

// Helper for Move (Extracted to avoid huge switch block issues if I mess up)
const handleMoveAction = (
  state: GameState,
  from: [number, number],
  to: [number, number],
): GameState => {
  const selectedPiece = state.board[from[0]]?.[from[1]];
  const targetCell = state.board[to[0]]?.[to[1]];

  if (!selectedPiece || selectedPiece.color !== state.currentTurn) {
    return state;
  }

  const targetIsFriendly = targetCell?.color === state.currentTurn;

  if (targetIsFriendly) {
    if (selectedPiece.type === "king" && targetCell?.type === "rook") {
      return handleCastling(state, from, to);
    }
    return {
      ...state,
      selectedCell: to,
      availableMoves: getAvailableMoves(state, to),
    };
  }
  return handleRegularMove(state, from, to);
};
