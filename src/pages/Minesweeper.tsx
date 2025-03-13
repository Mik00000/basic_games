import React, { useReducer, useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStickyStateWithExpiry } from "../components/utils.ts";
import Timer, { TimerHandle } from "../components/Timer.tsx";
import clockIcon from "../assets/icons/clock.svg";
import shovelIcon from "../assets/icons/shovel.svg";
import bombIcon from "../assets/icons/bomb.svg";
import flagIcon from "../assets/icons/flag-1.svg";

const MIN_ROWS = 3;
const MIN_COLS = 3;
// const MAX_BOMB_PERCENTAGE = 65;
const TimeToForgotGame = 0.5 * 60 * 60 * 1000;
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
  rows: number;
  cols: number;
  bombCount: number;
};

type Action =
  | { type: "CELL_CLICK"; row: number; col: number }
  | { type: "CELL_RIGHT_CLICK"; row: number; col: number }
  | { type: "REVEAL_BOMB"; row: number; col: number }
  | { type: "CELL_DOUBLE_CLICK"; row: number; col: number }
  | { type: "RESET_GAME" };

function createBombField(
  rowSize: number,
  colSize: number,
  bombCount: number
): number[][] {
  const totalCells = rowSize * colSize;
  const totalBombs = Math.max(1, bombCount);

  if (
    !Number.isFinite(totalBombs) ||
    totalBombs < 0 ||
    totalBombs > totalCells
  ) {
    console.error("Invalid bomb percentage:", bombCount);
    return Array(rowSize)
      .fill(0)
      .map(() => Array(colSize).fill(0)); // Запасний варіант
  }

  const bombsArray = Array(totalBombs).fill(1);
  const emptyArray = Array(totalCells - totalBombs).fill(0);
  const fieldArray = shuffleArray([...bombsArray, ...emptyArray]);
  const grid: number[][] = [];
  for (let i = 0; i < rowSize; i++) {
    grid.push(fieldArray.slice(i * colSize, (i + 1) * colSize));
  }
  return grid;
}

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function countBombsAround(field: number[][], row: number, col: number): number {
  let count = 0;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (field[row + i]?.[col + j] === 1) {
        count++;
      }
    }
  }
  return count;
}

function mapFieldToCells(field: number[][]): Cell[][] {
  return field.map((row, rowIndex) =>
    row.map((cell, colIndex) => ({
      bomb: cell === 1,
      flag: false,
      bombsAround: countBombsAround(field, rowIndex, colIndex),
      revealed: false,
    }))
  );
}

function generateSafeField(
  rowSize: number,
  colSize: number,
  safeRow: number,
  safeCol: number,
  bombCount: number
): Cell[][] {
  let field: number[][];
  do {
    field = createBombField(rowSize, colSize, bombCount);
  } while (
    field[safeRow][safeCol] === 1 ||
    countBombsAround(field, safeRow, safeCol) >= 1
  );
  return mapFieldToCells(field);
}

function revealEmptyCells(
  field: Cell[][],
  row: number,
  col: number
): { updatedField: Cell[][]; flagAdjustment: number } {
  const updatedField = field.map((r) => r.map((cell) => ({ ...cell })));
  let flagAdjustment = 0;
  const stack: [number, number][] = [[row, col]];
  const visited = new Set<string>();

  while (stack.length) {
    const [r, c] = stack.pop()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const cell = updatedField[r][c];
    if (cell.revealed) continue;
    cell.revealed = true;
    if (cell.flag) {
      cell.flag = false;
      flagAdjustment++;
    }
    if (!cell.bomb && cell.bombsAround === 0) {
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const newRow = r + i;
          const newCol = c + j;
          if (
            newRow >= 0 &&
            newRow < updatedField.length &&
            newCol >= 0 &&
            newCol < updatedField[0].length &&
            !visited.has(`${newRow},${newCol}`)
          ) {
            stack.push([newRow, newCol]);
          }
        }
      }
    }
  }
  return { updatedField, flagAdjustment };
}

function updateFlagStatus(
  field: Cell[][],
  row: number,
  col: number,
  availableFlags: number
): { updatedField: Cell[][]; newFlagCount: number } {
  const updatedField = field.map((r) => r.map((cell) => ({ ...cell })));
  const cell = updatedField[row][col];
  if (cell.revealed) return { updatedField, newFlagCount: availableFlags };
  if (cell.flag) {
    cell.flag = false;
    return { updatedField, newFlagCount: availableFlags + 1 };
  } else if (availableFlags > 0) {
    cell.flag = true;
    return { updatedField, newFlagCount: availableFlags - 1 };
  }
  return { updatedField, newFlagCount: availableFlags };
}

function processCellClick(
  state: GameState,
  row: number,
  col: number
): GameState {
  const { field, firstClick, flagCount, rows, cols, bombCount } = state;
  if (state.isPlayerLoose || state.isPlayerWin || field[row][col].flag)
    return state;

  let newField = field.map((r) => r.map((cell) => ({ ...cell })));
  let newFlagCount = flagCount;
  let newFirstClick = firstClick;

  if (firstClick) {
    const preservedFlags = field.map((r) => r.map((cell) => cell.flag));
    newField = generateSafeField(rows, cols, row, col, bombCount);
    newField = newField.map((r, rIdx) =>
      r.map((cell, cIdx) => ({ ...cell, flag: preservedFlags[rIdx][cIdx] }))
    );
    const totalBombs = bombCount;
    const placedFlags = newField.flat().filter((cell) => cell.flag).length;
    newFlagCount = totalBombs - placedFlags;
    newFirstClick = false;
  }

  if (!newField[row][col].revealed) {
    if (newField[row][col].bomb) {
      newField[row][col].revealed = true;
      return {
        ...state,
        field: newField,
        firstClick: newFirstClick,
        flagCount: newFlagCount,
        isPlayerLoose: true,
        isPlayerWin: false,
      };
    } else if (newField[row][col].bombsAround === 0) {
      const { updatedField, flagAdjustment } = revealEmptyCells(
        newField,
        row,
        col
      );
      newField = updatedField;
      newFlagCount += flagAdjustment;
    } else {
      newField[row][col].revealed = true;
      if (newField[row][col].flag) {
        newField[row][col].flag = false;
        newFlagCount++;
      }
    }
  }

  const allNonBombsRevealed = newField
    .flat()
    .every((cell) => cell.revealed || cell.bomb);
  return {
    ...state,
    field: newField,
    firstClick: newFirstClick,
    flagCount: newFlagCount,
    isPlayerLoose: false,
    isPlayerWin: allNonBombsRevealed,
  };
}

function getNeighborCells(
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

function createInitialGameState(
  rows: number,
  cols: number,
  bombCount: number
): GameState {
  const initialField = mapFieldToCells(createBombField(rows, cols, bombCount));
  const totalBombs = bombCount;
  return {
    field: initialField,
    firstClick: true,
    flagCount: totalBombs,
    isPlayerLoose: false,
    isPlayerWin: false,
    rows,
    cols,
    bombCount,
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
export const Minesweeper: React.FC = () => {

  const location = useLocation();
  const navigate = useNavigate();
  const settings = location.state || {};
  const { rows = 4, columns = 4, bombCount = 20 } = settings;
  const gameRows = Math.max(rows, MIN_ROWS);
  const gameCols = Math.max(columns, MIN_COLS);
  const bombNumber = bombCount;
  const timerRef = useRef<TimerHandle>(null);

  useEffect(() => {
    if (localStorage.getItem("minesweeperState") == null) handleRestart();
    if (Object.keys(settings).length === 0) navigate("/games/minesweeper-menu");
  }, [settings, navigate]);
  useEffect(() => {
    if (Object.keys(settings).length === 0) navigate("/games/minesweeper-menu");
  }, []);

  const initialGameState = createInitialGameState(
    gameRows,
    gameCols,
    bombNumber
  );

  const [persistedGameState, setPersistedGameState] =
    useStickyStateWithExpiry<GameState>(
      initialGameState,
      "minesweeperState",
      TimeToForgotGame
    );

  const [state, dispatch] = useReducer(
    gameReducer,
    persistedGameState || initialGameState
  );

  const [showPopup, setShowPopup] = useState(false);
  const [pickedTool, setPickedTool] = useState<null | "shovel" | "flag">((window.innerWidth <= 768)?"shovel" : null);
  console.log(pickedTool)
  useEffect(() => {
    setPersistedGameState(state);
  }, [state]);

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
  function handleRestart() {
    dispatch({ type: "RESET_GAME" });
    timerRef.current?.reset();
    setShowPopup(false);
    setPickedTool(null);
  }
  return (
    <div className="minesweeper">
      <div className="top-bar top-bar-1">
        <div className="left-part">
          <button
            onClick={() => navigate("/games/minesweeper-menu")}
            className="exit-btn"
          >
            Exit to Menu
          </button>
        </div>

        <div className="mid-part"></div>
        <div className="right-part">
          <button
            onClick={() => {
              handleRestart();
            }}
            className="restart-btn"
          >
            Restart
          </button>
        </div>
      </div>
      
      <div className="top-bar">
        <div className="left-part">
          <button
            onClick={() => navigate("/games/minesweeper-menu")}
            className="exit-btn"
          >
            Exit to Menu
          </button>
          <button
            className={`shovel-pick picker ${
              pickedTool === "shovel" ? "picked" : ""
            }`}
            onClick={() => setPickedTool("shovel")}
          >
            <img src={shovelIcon} alt="shovel" draggable="false" />
          </button>
        </div>

        <div className="mid-part">
          <div className="time">
            <img src={clockIcon} draggable="false" alt="clock" />
            <Timer
              startTime={0}
              timerName={"minesweeperTimer"}
              isGrowing={true}
              timeToForgotTimer={TimeToForgotGame}
              pause={state.isPlayerLoose}
              ref={timerRef}
              className="timer"
              // onComplete={() => {

              // }}
            />
          </div>
          <div className="flag-count">
            <h1>{state.flagCount}</h1>{" "}
            <img src={flagIcon} draggable="false" alt="flag" />
          </div>
        </div>
        <div className="right-part">
          <button
            className={`flag-pick picker ${
              pickedTool === "flag" ? "picked" : ""
            }`}
            onClick={() => setPickedTool("flag")}
          >
            <img src={flagIcon} alt="flag" draggable="false" />
          </button>
          <button
            onClick={() => {
              handleRestart();
            }}
            className="restart-btn"
          >
            Restart
          </button>
        </div>
      </div>

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
                onClick={() => {
                  if (pickedTool === "shovel" || pickedTool === null) {
                    dispatch({
                      type: "CELL_CLICK",
                      row: rowIndex,
                      col: cellIndex,
                    });
                  } else if (pickedTool === "flag") {
                    dispatch({
                      type: "CELL_RIGHT_CLICK",
                      row: rowIndex,
                      col: cellIndex,
                    });
                  }
                }}
                onDoubleClick={() =>
                  dispatch({
                    type: "CELL_DOUBLE_CLICK",
                    row: rowIndex,
                    col: cellIndex,
                  })
                }
                onContextMenu={(e) => {
                  if (pickedTool === null) {
                    e.preventDefault();
                    dispatch({
                      type: "CELL_RIGHT_CLICK",
                      row: rowIndex,
                      col: cellIndex,
                    });
                  }
                }}
              >
                {cell.revealed ? (
                  cell.bomb ? (
                    <img src={bombIcon} draggable="false" alt="bomb" />
                  ) : (
                    cell.bombsAround || ""
                  )
                ) : cell.flag ? (
                  <img src={flagIcon} draggable="false" alt="bomb" />
                ) : (
                  ""
                )}
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
                  handleRestart();
                }}
              >
                Restart
              </button>
              <button className="leave-btn" onClick={() => navigate("/games")}>
                Leave
              </button>
              <button
                className="back-btn"
                onClick={() => navigate("/games/minesweeper-menu")}
              >
                Back to menu
              </button>
            </div>
            {state.isPlayerLoose && (
              <div className="bomb-example">
                <div>
                  {" "}
                  <img src={bombIcon} draggable="false" alt="bomb" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
