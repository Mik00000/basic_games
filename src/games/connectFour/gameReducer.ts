import { GameState, GameAction } from "./gameLogic";

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case "DROP_CHECKER": {
      if (state.winner !== null) return state;
      const row = state.field.reduceRight<number | null>((acc, _, idx) => acc === null && state.field[idx][action.column] === 0 ? idx : acc, null);
      if (row === null) return state;

      const newField = state.field.map((r) => [...r]);
      newField[row][action.column] = state.currentPlayer!;

      const isWin = state.currentPlayer && ((): boolean => {
        // reuse checkVictory from gameLogic if needed
        return false;
      })();

      const lastPos = { row, col: action.column };
      return {
        ...state,
        field: newField,
        lastChecker: lastPos,
        winner: isWin ? state.currentPlayer : (newField.every((r) => r.every((c) => c !== 0)) ? 0 : null),
        currentPlayer: state.winner === null && !isWin
          ? (state.currentPlayer === 1 ? 2 : 1)
          : state.currentPlayer,
        isNewGame: false,
      };
    }
    case "SET_PLAYER":
      return { ...state, currentPlayer: action.player };
    case "SET_WINNER":
      return { ...state, winner: action.winner };
    case "HIDE_COIN_TOSS":
      return { ...state, showCoinToss: false, isNewGame: false };
    case "SET_STATE":
      return { ...state, ...action.newState };
    case "RESET":
      return { ...state, ...initialGameState };
    default:
      return state;
  }
};