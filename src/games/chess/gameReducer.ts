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
  | { type: "PROMOTE_PAWN"; pieceType: Piece["type"] };
// | { type: "SET_STATE"; newState: Partial<GameState> };

export const gameReducer = (
  state: GameState,
  action: GameAction,
): GameState => {
  switch (action.type) {
    case "MAKE_MOVE": {
      if (state.winner) return state;
      const { from, to } = action;
      const selectedPiece = state.board[from[0]]?.[from[1]];
      const targetCell = state.board[to[0]]?.[to[1]];

      if (!selectedPiece || selectedPiece.color !== state.currentTurn) {
        return state;
      }

      const targetIsFriendly = targetCell?.color === state.currentTurn;

      if (targetIsFriendly) {
        // Спеціальний випадок: Рокіровка (Король + Тура того ж кольору)
        if (selectedPiece.type === "king" && targetCell?.type === "rook") {
          return handleCastling(state, from, to);
        }

        // Якщо це просто інша власна фігура — змінюємо вибір
        return {
          ...state,
          selectedCell: to,
          availableMoves: getAvailableMoves(state, to),
        };
      }

      return handleRegularMove(state, from, to);
    }

    case "SELECT_CELL": {
      const cell = state.board[action.cell[0]][action.cell[1]];
      if (!cell || cell.color !== state.currentTurn) {
        return state;
      }
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

    default:
      return state;
  }
};
