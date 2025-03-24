
export type Cell = {
    bomb: boolean;
    flag: boolean;
    bombsAround: number;
    revealed: boolean;
  };
  
  export type GameState = {
    field: Cell[][];
    firstClick: boolean;
    flagCount: number;
    isPlayerLoose: boolean;
    isPlayerWin: boolean;
    rows: number;
    cols: number;
    bombCount: number;
  };
  
  export type Action =
    | { type: "CELL_CLICK"; row: number; col: number }
    | { type: "CELL_RIGHT_CLICK"; row: number; col: number }
    | { type: "REVEAL_BOMB"; row: number; col: number }
    | { type: "CELL_DOUBLE_CLICK"; row: number; col: number }
    | { type: "RESET_GAME" };
  
  export function createBombField(
    rowSize: number,
    colSize: number,
    bombCount: number
  ): number[][] {
    const totalCells = rowSize * colSize;
    const totalBombs = Math.max(1, bombCount);
  
    if (!Number.isFinite(totalBombs) || totalBombs < 0 || totalBombs > totalCells) {
      console.error("Invalid bomb percentage:", bombCount);
      return Array(rowSize)
        .fill(0)
        .map(() => Array(colSize).fill(0));
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
  
  export function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }
  
  export function countBombsAround(field: number[][], row: number, col: number): number {
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
  
  export function mapFieldToCells(field: number[][]): Cell[][] {
    return field.map((row, rowIndex) =>
      row.map((cell, colIndex) => ({
        bomb: cell === 1,
        flag: false,
        bombsAround: countBombsAround(field, rowIndex, colIndex),
        revealed: false,
      }))
    );
  }
  
  export function generateSafeField(
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
  
  export function revealEmptyCells(
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
  
  export function updateFlagStatus(
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
  
  export function processCellClick(
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
        const { updatedField, flagAdjustment } = revealEmptyCells(newField, row, col);
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
  
  export function getNeighborCells(
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
  
  export function createInitialGameState(
    rows: number,
    cols: number,
    bombCount: number
  ): GameState {
    const initialField = mapFieldToCells(createBombField(rows, cols, bombCount));
    return {
      field: initialField,
      firstClick: true,
      flagCount: bombCount,
      isPlayerLoose: false,
      isPlayerWin: false,
      rows,
      cols,
      bombCount,
    };
  }
  