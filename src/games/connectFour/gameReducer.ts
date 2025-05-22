
import { GameState, GameAction, getLastEmptyRow, isBoardFull, checkVictory, initialGameState, MAX_ROWS, MAX_COLS } from "./gameLogic";

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case "DROP_CHECKER": {
      if (state.winner !== null) return state;
      const row = getLastEmptyRow(state.field, action.column);
      if (row === null) return state;

      const newField = state.field.map((r) => [...r]);
      newField[row][action.column] = state.currentPlayer!;

      if (checkVictory(newField, row, action.column, state.currentPlayer!)) {
        return { ...state, field: newField, lastChecker: [row, action.column], winner: state.currentPlayer };
      }
      if (isBoardFull(newField)) {
        return { ...state, field: newField, lastChecker: [row, action.column], winner: 0 };
      }
      return {
        ...state,
        field: newField,
        lastChecker: [row, action.column],
        currentPlayer: state.currentPlayer === 1 ? 2 : 1,
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
      return { ...initialGameState };
    default:
      return state;
  }
};