

import { GameState, Action, createInitialGameState, processCellClick, updateFlagStatus, getNeighborCells } from "./gameLogic";

export function gameReducer(state: GameState, action: Action): GameState {
  if (
    action.type !== "REVEAL_BOMB" &&
    action.type !== "RESET_GAME" &&
    (state.isPlayerLoose || state.isPlayerWin)
  ) {
    return state;
  }
  switch (action.type) {
    case "CELL_CLICK":
      return processCellClick(state, action.row, action.col);
    case "CELL_RIGHT_CLICK": {
      const { updatedField, newFlagCount } = updateFlagStatus(
        state.field,
        action.row,
        action.col,
        state.flagCount
      );
      return { ...state, field: updatedField, flagCount: newFlagCount };
    }
    case "REVEAL_BOMB": {
      const updatedField = state.field.map((r) =>
        r.map((cell) => ({ ...cell }))
      );
      updatedField[action.row][action.col].flag = false;
      updatedField[action.row][action.col].revealed = true;
      return { ...state, field: updatedField };
    }
    case "CELL_DOUBLE_CLICK": {
      const currentCell = state.field[action.row][action.col];
      if (!currentCell.revealed) return state;
      const neighbors = getNeighborCells(state.field, action.row, action.col);
      const flagsCount = neighbors.filter(
        ([r, c]) => state.field[r][c].flag
      ).length;
      if (currentCell.bombsAround !== flagsCount) return state;
      let newState = state;
      for (const [r, c] of neighbors) {
        if (!newState.field[r][c].revealed && !newState.field[r][c].flag) {
          newState = processCellClick(newState, r, c);
          if (newState.isPlayerLoose) {
            return newState;
          }
        }
      }
      return newState;
    }
    case "RESET_GAME":
      return createInitialGameState(state.rows, state.cols, state.bombCount);
    default:
      return state;
  }
}
