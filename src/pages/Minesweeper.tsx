import React, { useReducer, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

let fieldArea = 4;
let MAX_COLS = 4;
let MAX_ROWS = 4;
let bombPercentage = 20;

if (MAX_ROWS < 3) MAX_ROWS = 3;
if (MAX_COLS < 3) MAX_COLS = 3;
if (fieldArea < 3) fieldArea = 3;
if (bombPercentage >= 65) bombPercentage = 65;

type Cell = {
  bomb: boolean;
  flag: boolean;
  bombsAround: number;
  revealed: boolean;
};

type GameState = {
  field: Cell[][];
  firstClick: boolean;
  flagCount: number;
  isPlayerLoose: boolean;
  isPlayerWin: boolean;
};

type Action =
  | { type: "CELL_CLICK"; row: number; col: number }
  | { type: "CELL_RIGHT_CLICK"; row: number; col: number }
  | { type: "REVEAL_BOMB"; row: number; col: number }
  | { type: "CELL_DOUBLE_CLICK"; row: number; col: number }
  | { type: "RESET_GAME" };

function initializeField(
  rowSize: number,
  colSize: number,
  bombPercent: number
): number[][] {
  const totalCells = rowSize * colSize;
  const totalBombs = Math.floor((totalCells * bombPercent) / 100);
  let field = Array(totalBombs)
    .fill(1)
    .concat(Array(totalCells - totalBombs).fill(0));
  field = shuffleArray(field);
  const grid: number[][] = [];
  for (let i = 0; i < rowSize; i++) {
    grid.push(field.slice(i * colSize, (i + 1) * colSize));
  }
  return grid;
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function transformField(field: number[][]): Cell[][] {
  const countBombsAround = (
    field: number[][],
    row: number,
    col: number
  ): number => {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (field[row + i]?.[col + j] === 1) {
          count++;
        }
      }
    }
    return count;
  };

  return field.map((row, rowIndex) =>
    row.map((cell, colIndex) => ({
      bomb: cell === 1,
      flag: false,
      bombsAround: countBombsAround(field, rowIndex, colIndex),
      revealed: false,
    }))
  );
}

function hasBombsAround(field: number[][], row: number, col: number): boolean {
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (field[row + i]?.[col + j] === 1) return true;
    }
  }
  return false;
}

function initializeSafeField(
  rowSize: number,
  colSize: number,
  safeRow: number,
  safeCol: number,
  bombPercent: number
): Cell[][] {
  let field: number[][];
  do {
    field = initializeField(rowSize, colSize, bombPercent);
  } while (
    field[safeRow][safeCol] === 1 ||
    hasBombsAround(field, safeRow, safeCol)
  );
  return transformField(field);
}

function revealCells(
  field: Cell[][],
  row: number,
  col: number
): { newField: Cell[][]; flagDelta: number } {
  const newField = field.map((r) => r.map((cell) => ({ ...cell })));
  let flagDelta = 0;
  const stack: [number, number][] = [[row, col]];
  const visited = new Set<string>();

  while (stack.length) {
    const [r, c] = stack.pop()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const cell = newField[r][c];
    if (cell.revealed) continue;
    cell.revealed = true;
    if (cell.flag) {
      cell.flag = false;
      flagDelta += 1;
    }
    if (!cell.bomb && cell.bombsAround === 0) {
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const newRow = r + i;
          const newCol = c + j;
          if (
            newRow >= 0 &&
            newRow < newField.length &&
            newCol >= 0 &&
            newCol < newField[0].length &&
            !visited.has(`${newRow},${newCol}`)
          ) {
            stack.push([newRow, newCol]);
          }
        }
      }
    }
  }
  return { newField, flagDelta };
}

function toggleFlag(
  field: Cell[][],
  row: number,
  col: number,
  currentFlagCount: number
): { newField: Cell[][]; newFlagCount: number } {
  const newField = field.map((r) => r.map((cell) => ({ ...cell })));
  const cell = newField[row][col];
  if (cell.revealed) {
    return { newField, newFlagCount: currentFlagCount };
  }
  if (cell.flag) {
    cell.flag = false;
    return { newField, newFlagCount: currentFlagCount + 1 };
  } else if (currentFlagCount > 0) {
    cell.flag = true;
    return { newField, newFlagCount: currentFlagCount - 1 };
  }
  return { newField, newFlagCount: currentFlagCount };
}

function handleCellClick(
  state: GameState,
  row: number,
  col: number
): GameState {
  let { field, firstClick, flagCount } = state;
  if (state.isPlayerLoose || state.isPlayerWin) return state;

  if (field[row][col].flag) return state;
  let newField = field.map((r) => r.map((cell) => ({ ...cell })));

  if (firstClick) {
    const oldFlags = field.map((r) => r.map((cell) => cell.flag));
    newField = initializeSafeField(
      MAX_ROWS,
      MAX_COLS,
      row,
      col,
      bombPercentage
    );
    newField = newField.map((r, rowIndex) =>
      r.map((cell, colIndex) => ({
        ...cell,
        flag: oldFlags[rowIndex][colIndex],
      }))
    );
    const totalBombs = Math.floor((MAX_COLS * MAX_ROWS * bombPercentage) / 100);
    const placedFlags = newField.flat().filter((cell) => cell.flag).length;
    flagCount = totalBombs - placedFlags;
    firstClick = false;
  }

  if (!newField[row][col].revealed) {
    if (newField[row][col].bomb) {
      newField[row][col].revealed = true;
      return {
        field: newField,
        firstClick,
        flagCount,
        isPlayerLoose: true,
        isPlayerWin: false,
      };
    }

    if (!newField[row][col].bomb && newField[row][col].bombsAround === 0) {
      const result = revealCells(newField, row, col);
      newField = result.newField;
      flagCount += result.flagDelta;
    } else {
      newField[row][col].revealed = true;
      if (newField[row][col].flag) {
        newField[row][col].flag = false;
        flagCount += 1;
      }
    }
  }

  const allNonBombsRevealed = newField
    .flat()
    .every((cell) => cell.revealed || cell.bomb);

  if (allNonBombsRevealed) {
    return {
      field: newField,
      firstClick,
      flagCount,
      isPlayerLoose: false,
      isPlayerWin: true,
    };
  }

  return {
    field: newField,
    firstClick,
    flagCount,
    isPlayerLoose: false,
    isPlayerWin: false,
  };
}

function getNeighbors(
  field: Cell[][],
  row: number,
  col: number
): [number, number][] {
  const neighbors: [number, number][] = [];
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i === 0 && j === 0) continue;
      const newRow = row + i;
      const newCol = col + j;
      if (
        newRow >= 0 &&
        newRow < field.length &&
        newCol >= 0 &&
        newCol < field[0].length
      ) {
        neighbors.push([newRow, newCol]);
      }
    }
  }
  return neighbors;
}
function createInitialState(): GameState {
  const initialField = transformField(
    initializeField(MAX_ROWS, MAX_COLS, bombPercentage)
  );
  const totalBombs = Math.floor((MAX_ROWS * MAX_COLS * bombPercentage) / 100);
  return {
    field: initialField,
    firstClick: true,
    flagCount: totalBombs,
    isPlayerLoose: false,
    isPlayerWin: false,
  };
}

function gameReducer(state: GameState, action: Action): GameState {
  if (
    action.type !== "REVEAL_BOMB" &&
    action.type !== "RESET_GAME" &&
    (state.isPlayerLoose || state.isPlayerWin)
  ) {
    return state;
  }

  switch (action.type) {
    case "CELL_CLICK":
      return handleCellClick(state, action.row, action.col);
    case "CELL_RIGHT_CLICK": {
      const { field, flagCount } = state;
      const result = toggleFlag(field, action.row, action.col, flagCount);
      return {
        ...state,
        field: result.newField,
        flagCount: result.newFlagCount,
      };
    }
    case "REVEAL_BOMB": {
      const newField = state.field.map((r) => r.map((cell) => ({ ...cell })));
      newField[action.row][action.col].flag = false;
      newField[action.row][action.col].revealed = true;
      return { ...state, field: newField };
    }
    case "CELL_DOUBLE_CLICK": {
      const { field } = state;
      const currentCell = field[action.row][action.col];
      if (!currentCell.revealed) return state;

      const neighbors = getNeighbors(field, action.row, action.col);
      const flagsCount = neighbors.filter(([r, c]) => field[r][c].flag).length;

      if (currentCell.bombsAround !== flagsCount) return state;

      let newState = state;
      for (const [r, c] of neighbors) {
        if (!newState.field[r][c].revealed && !newState.field[r][c].flag) {
          newState = handleCellClick(newState, r, c);
          if (newState.isPlayerLoose) {
            return newState;
          }
        }
      }
      return newState;
    }
    case "RESET_GAME":
      return createInitialState();
    default:
      return state;
  }
}

const initialField = transformField(
  initializeField(MAX_ROWS, MAX_COLS, bombPercentage)
);
const totalBombs = Math.floor((MAX_ROWS * MAX_COLS * bombPercentage) / 100);
const initialState: GameState = {
  field: initialField,
  firstClick: true,
  flagCount: totalBombs,
  isPlayerLoose: false,
  isPlayerWin: false,
};

export const Minesweeper: React.FC = () => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (state.isPlayerLoose) {
      const timeouts: NodeJS.Timeout[] = [];
      state.field.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          if (cell.bomb && !cell.revealed) {
            const delay = Math.random() * 2000;
            const timeout = setTimeout(() => {
              dispatch({ type: "REVEAL_BOMB", row: rowIndex, col: colIndex });
            }, delay);
            timeouts.push(timeout);
          }
        });
      });
      const popupTimer = setTimeout(() => {
        setShowPopup(true);
      }, 2500);
      timeouts.push(popupTimer);
      return () => {
        timeouts.forEach((timeout) => clearTimeout(timeout));
      };
    }
  }, [state.isPlayerLoose]);
  return (
    <div className="minesweeper">
      <div>{state.flagCount} 🚩</div>
      <div id="field">
        {state.field.map((row, rowIndex) => (
          <div className="row" key={`row-${rowIndex}`}>
            {row.map((cell, cellIndex) => (
              <button
                className={`cell ${
                  cell.revealed
                    ? cell.bomb
                      ? "bomb revealed"
                      : cell.bombsAround
                      ? `bombs-around bombs-around-${cell.bombsAround} revealed`
                      : "revealed"
                    : cell.flag
                    ? "flag"
                    : ""
                }`}
                key={`cell-${rowIndex}-${cellIndex}`}
                onClick={() =>
                  dispatch({
                    type: "CELL_CLICK",
                    row: rowIndex,
                    col: cellIndex,
                  })
                }
                onDoubleClick={() =>
                  dispatch({
                    type: "CELL_DOUBLE_CLICK",
                    row: rowIndex,
                    col: cellIndex,
                  })
                }
                onContextMenu={(e) => {
                  e.preventDefault();
                  dispatch({
                    type: "CELL_RIGHT_CLICK",
                    row: rowIndex,
                    col: cellIndex,
                  });
                }}
              >
                {cell.revealed
                  ? cell.bomb
                    ? "💣"
                    : cell.bombsAround || ""
                  : cell.flag
                  ? "🚩"
                  : ""}
              </button>
            ))}
          </div>
        ))}
      </div>
      {((state.isPlayerLoose && showPopup) || state.isPlayerWin) && (
        <div className="pop-up loose-or-win">
          <div className="content">
            <h1 className="heading">
              {state.isPlayerLoose ? "You Lose(" : "You Win!"}
            </h1>

            <div className="control-buttons">
              <button
                className="restart-btn"
                onClick={() => {
                  dispatch({ type: "RESET_GAME" });
                  setShowPopup(false);
                }}
              >
                Restart
              </button>
              <button
                className="leave-btn"
                onClick={() => {
                  // cleanLocalStorage();
                  navigate("/games");
                }}
              >
                Leave
              </button>
              <button
                className="back-btn"
                onClick={() => {
                  // cleanLocalStorage();
                  navigate("/games/connect4-menu");
                }}
              >
                Back to menu
              </button>
            </div>
            {state.isPlayerLoose && (<div className="bomb-example">
              <div>💣</div>
            </div>)}
          </div>
        </div>
      )}
    </div>
  );
};
