export interface SudokuCell {
  value: number;
  isError: boolean;
  isInitial: boolean;
  notes: Set<number>;
}

export interface GameState {
  fullField: number[][];
  userField: SudokuCell[][];
  history: Move[];
  selectedCell: { row: number; col: number } | null;
  gameId: number;
  mistakesCount: number;
  hint: HintData | null;
  difficulty: Difficulty;
}

export interface HintData {
  type: "FULL_HOUSE" | "HIDDEN_SINGLE" | "NAKED_SINGLE" | "RANDOM_EMPTY";
  targetCell: { row: number; col: number; value: number };
  highlightCells: {
    row: number;
    col: number;
    type: "target" | "related" | "secondary";
  }[];
  message: string;
}

export type GameAction =
  | { type: "MAKE_MOVE"; move: { row: number; col: number; value: number } }
  | { type: "RESET" }
  | { type: "START_GAME"; difficulty: Difficulty }
  | { type: "SELECT_CELL"; move: { row: number; col: number } }
  | { type: "UNDO_MOVE" }
  | { type: "ERASE_CELL"; move: { row: number; col: number } }
  | { type: "MAKE_NOTE"; move: { row: number; col: number; value: number } }
  | { type: "SHOW_HINT" };

export interface Move {
  row: number;
  col: number;
  value: number;
  isCorrect: boolean;
}
export type Difficulty = "EASY" | "MEDIUM" | "HARD" | "EXPERT";

export const initialGameState = generateInitialGameState("EASY");

function shuffle<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

function checkAvailableNumbers(
  field: number[][],
  row: number,
  col: number,
): number[] {
  const nums = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  for (let i = 0; i < 9; i++) {
    nums.delete(field[row][i]);
    nums.delete(field[i][col]);
  }

  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      nums.delete(field[startRow + i][startCol + j]);
    }
  }

  return Array.from(nums);
}

function fillField(
  field: number[][],
  cells: [number, number][],
  index: number,
): boolean {
  if (index === cells.length) return true;

  const [row, col] = cells[index];
  const available = shuffle(checkAvailableNumbers(field, row, col));

  for (const num of available) {
    field[row][col] = num;

    if (fillField(field, cells, index + 1)) return true;

    field[row][col] = 0;
  }

  return false;
}

function findHiddenSingles(board: number[][]): boolean {
  let changed = false;

  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      for (let num = 1; num <= 9; num++) {
        const possibleCells: [number, number][] = [];

        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            const cellRow = boxRow * 3 + r;
            const cellCol = boxCol * 3 + c;

            if (board[cellRow][cellCol] === 0) {
              const candidates = checkAvailableNumbers(board, cellRow, cellCol);
              if (candidates.includes(num)) {
                possibleCells.push([cellRow, cellCol]);
              }
            }
          }
        }

        if (possibleCells.length === 1) {
          const [r, c] = possibleCells[0];
          board[r][c] = num;
          changed = true;
        }
      }
    }
  }
  return changed;
}

function solveCount(board: number[][], count = { val: 0 }): number {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        // Fast optimized check inline
        const used = new Array(10).fill(false);
        for (let i = 0; i < 9; i++) {
          used[board[r][i]] = true;
          used[board[i][c]] = true;
        }
        const startR = Math.floor(r / 3) * 3;
        const startC = Math.floor(c / 3) * 3;
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            used[board[startR + i][startC + j]] = true;
          }
        }

        for (let num = 1; num <= 9; num++) {
          if (!used[num]) {
            board[r][c] = num;
            solveCount(board, count);
            if (count.val > 1) {
              board[r][c] = 0;
              return count.val;
            }
          }
        }
        board[r][c] = 0;
        return count.val;
      }
    }
  }
  count.val++;
  return count.val;
}

function hasUniqueSolution(board: number[][]): boolean {
  const workBoard = board.map((r) => [...r]);
  return solveCount(workBoard) === 1;
}

function solveLikeHuman(board: number[][], difficulty: Difficulty): boolean {
  if (difficulty === "HARD" || difficulty === "EXPERT") {
    return hasUniqueSolution(board);
  }

  const workBoard = board.map((row) => [...row]);
  let changed = true;
  const allowHiddenSingles = difficulty === "MEDIUM";

  while (changed) {
    changed = false;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (workBoard[r][c] === 0) {
          const candidates = checkAvailableNumbers(workBoard, r, c);
          if (candidates.length === 1) {
            workBoard[r][c] = candidates[0];
            changed = true;
          }
        }
      }
    }

    if (!changed && allowHiddenSingles) {
      changed = findHiddenSingles(workBoard);
    }
  }

  return workBoard.every((row) => row.every((cell) => cell !== 0));
}

function createPuzzle(
  fullBoard: number[][],
  difficulty: Difficulty,
): number[][] {
  const puzzle = fullBoard.map((row) => [...row]);
  const allCoords: [number, number][] = [];

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      allCoords.push([r, c]);
    }
  }

  const limits: Record<Difficulty, { targetRemove: number }> = {
    EASY: { targetRemove: 35 },
    MEDIUM: { targetRemove: 45 },
    HARD: { targetRemove: 52 },
    EXPERT: { targetRemove: 58 },
  };
  const targetRemove = limits[difficulty].targetRemove;
  let removedCount = 0;

  const shuffledCoords = shuffle(allCoords);

  for (const [r, c] of shuffledCoords) {
    if (removedCount >= targetRemove) break;

    const backup = puzzle[r][c];
    puzzle[r][c] = 0;

    if (!solveLikeHuman(puzzle, difficulty)) {
      puzzle[r][c] = backup;
    } else {
      removedCount++;
    }
  }

  return puzzle;
}

export function generateInitialGameState(
  difficulty: Difficulty = "EASY",
): GameState {
  const fullField: number[][] = Array.from({ length: 9 }, () =>
    Array(9).fill(0),
  );

  for (let offset = 0; offset < 9; offset += 3) {
    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    let i = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        fullField[offset + r][offset + c] = nums[i++];
      }
    }
  }

  const remainingCells: [number, number][] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (Math.floor(r / 3) !== Math.floor(c / 3)) {
        remainingCells.push([r, c]);
      }
    }
  }

  fillField(fullField, remainingCells, 0);

  const userFieldNumbers = createPuzzle(fullField, difficulty);

  const userField: SudokuCell[][] = userFieldNumbers.map((row) =>
    row.map((val) => ({
      value: val,
      isError: false,
      isInitial: val !== 0,
      notes: new Set<number>(),
    })),
  );

  return {
    fullField: fullField,
    userField: userField,
    history: [],
    selectedCell: null,
    gameId: Date.now(),
    mistakesCount: 0,
    hint: null,
    difficulty: difficulty,
  };
}

export function getHint(
  userField: SudokuCell[][],
  fullField: number[][],
): HintData | null {
  // Допоміжна функція для перевірки кандидатів
  const getCandidates = (r: number, c: number) => {
    if (userField[r][c].value !== 0) return [];
    const used = new Set<number>();
    for (let i = 0; i < 9; i++) {
      if (userField[r][i].value !== 0 && !userField[r][i].isError)
        used.add(userField[r][i].value);
      if (userField[i][c].value !== 0 && !userField[i][c].isError)
        used.add(userField[i][c].value);
    }
    const startR = Math.floor(r / 3) * 3;
    const startC = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const val = userField[startR + i][startC + j].value;
        if (val !== 0 && !userField[startR + i][startC + j].isError)
          used.add(val);
      }
    }
    const candidates: number[] = [];
    for (let v = 1; v <= 9; v++) {
      if (!used.has(v)) candidates.push(v);
    }
    return candidates;
  };

  // 1. Пошук Full House
  for (let i = 0; i < 9; i++) {
    const emptyInRow = userField[i].reduce(
      (acc, c, idx) => (c.value === 0 || c.isError ? [...acc, idx] : acc),
      [] as number[],
    );
    if (emptyInRow.length === 1) {
      const c = emptyInRow[0];
      const val = fullField[i][c];
      const highlights: HintData["highlightCells"] = [];
      for (let k = 0; k < 9; k++)
        highlights.push({
          row: i,
          col: k,
          type: k === c ? "target" : "related",
        });
      return {
        type: "FULL_HOUSE",
        targetCell: { row: i, col: c, value: val },
        highlightCells: highlights,
        message: "There is only one empty cell left in this row. Count the existing numbers to find the missing one.",
      };
    }
    const emptyInCol = userField.reduce(
      (acc, row, rIdx) => (row[i].value === 0 || row[i].isError ? [...acc, rIdx] : acc),
      [] as number[],
    );
    if (emptyInCol.length === 1) {
      const r = emptyInCol[0];
      const val = fullField[r][i];
      const highlights: HintData["highlightCells"] = [];
      for (let k = 0; k < 9; k++)
        highlights.push({
          row: k,
          col: i,
          type: k === r ? "target" : "related",
        });
      return {
        type: "FULL_HOUSE",
        targetCell: { row: r, col: i, value: val },
        highlightCells: highlights,
        message: "This column is missing just one number. Check to see which one it is.",
      };
    }
    const startR = Math.floor(i / 3) * 3;
    const startC = (i % 3) * 3;
    const emptyInBox: { r: number; c: number }[] = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (userField[startR + r][startC + c].value === 0 || userField[startR + r][startC + c].isError)
          emptyInBox.push({ r: startR + r, c: startC + c });
      }
    }
    if (emptyInBox.length === 1) {
      const { r, c } = emptyInBox[0];
      const val = fullField[r][c];
      const highlights: HintData["highlightCells"] = [];
      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
          const currR = startR + x;
          const currC = startC + y;
          highlights.push({
            row: currR,
            col: currC,
            type: currR === r && currC === c ? "target" : "related",
          });
        }
      }
      return {
        type: "FULL_HOUSE",
        targetCell: { row: r, col: c, value: val },
        highlightCells: highlights,
        message: "There is only one empty cell left in this 3x3 block. Fill it with the missing number.",
      };
    }
  }

  // 2. Пошук Hidden Single
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      for (let num = 1; num <= 9; num++) {
        const possibleCells: { r: number; c: number }[] = [];
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            const cellRow = boxRow * 3 + r;
            const cellCol = boxCol * 3 + c;
            if (userField[cellRow][cellCol].value === 0 || userField[cellRow][cellCol].isError) {
              if (getCandidates(cellRow, cellCol).includes(num)) {
                possibleCells.push({ r: cellRow, c: cellCol });
              }
            }
          }
        }
        if (possibleCells.length === 1) {
          const { r, c } = possibleCells[0];
          const highlights: HintData["highlightCells"] = [
            { row: r, col: c, type: "target" },
          ];
          for (let rowIdx = 0; rowIdx < 9; rowIdx++) {
            for (let colIdx = 0; colIdx < 9; colIdx++) {
              if (
                userField[rowIdx][colIdx].value === num &&
                !userField[rowIdx][colIdx].isError
              ) {
                highlights.push({
                  row: rowIdx,
                  col: colIdx,
                  type: "secondary",
                });
                for (let br = 0; br < 3; br++) {
                  for (let bc = 0; bc < 3; bc++) {
                    const bCellR = boxRow * 3 + br;
                    const bCellC = boxCol * 3 + bc;
                    if (
                      (bCellR === rowIdx || bCellC === colIdx) &&
                      (bCellR !== r || bCellC !== c)
                    ) {
                      if (
                        !highlights.some(
                          (h) => h.row === bCellR && h.col === bCellC,
                        )
                      ) {
                        highlights.push({
                          row: bCellR,
                          col: bCellC,
                          type: "related",
                        });
                      }
                    }
                  }
                }
              }
            }
          }
          for (let br = 0; br < 3; br++) {
            for (let bc = 0; bc < 3; bc++) {
              const bCellR = boxRow * 3 + br;
              const bCellC = boxCol * 3 + bc;
              if (
                !highlights.some((h) => h.row === bCellR && h.col === bCellC)
              ) {
                highlights.push({ row: bCellR, col: bCellC, type: "related" });
              }
            }
          }

          return {
            type: "HIDDEN_SINGLE",
            targetCell: { row: r, col: c, value: num },
            highlightCells: highlights,
            message: "Pay attention to the highlighted identical numbers. They eliminate all other possible positions, leaving only one spot for that number in this block.",
          };
        }
      }
    }
  }

  // 3. Пошук Naked Single
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (userField[r][c].value === 0 || userField[r][c].isError) {
        const candidates = getCandidates(r, c);
        if (candidates.length === 1) {
          const val = candidates[0];
          const highlights: HintData["highlightCells"] = [
            { row: r, col: c, type: "target" },
          ];
          for (let i = 0; i < 9; i++) {
            if (i !== c) highlights.push({ row: r, col: i, type: "related" });
            if (i !== r) highlights.push({ row: i, col: c, type: "related" });
          }
          const startR = Math.floor(r / 3) * 3;
          const startC = Math.floor(c / 3) * 3;
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
              const br = startR + i;
              const bc = startC + j;
              if (br !== r && bc !== c) {
                highlights.push({ row: br, col: bc, type: "related" });
              }
            }
          }
          return {
            type: "NAKED_SINGLE",
            targetCell: { row: r, col: c, value: val },
            highlightCells: highlights,
            message: "Analyze the highlighted cells in this row, column, and block. All other numbers have already been used, so only one option fits here.",
          };
        }
      }
    }
  }

  // 4. Random Empty
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (userField[r][c].value === 0 || userField[r][c].isError) {
        return {
          type: "RANDOM_EMPTY",
          targetCell: { row: r, col: c, value: fullField[r][c] },
          highlightCells: [{ row: r, col: c, type: "target" }],
          message: "Try to carefully analyze this cell and its surroundings to find the correct number.",
        };
      }
    }
  }
  return null;
}
