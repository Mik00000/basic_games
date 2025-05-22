
export const MAX_COLS = 7;
export const MAX_ROWS = 7;
export const TIME_TO_FORGOT_GAME = 0.5 * 60 * 60 * 1000;
export const PLAYER_MAX_GAME_TIME = 4 * 60 * 1000;
export const CIRCLE_TIMER_DURATION = 22;

export type GameState = {
  field: number[][];
  currentPlayer: number | null;
  winner: number | null; 
  lastChecker: [number, number] | null;
  isNewGame: boolean;
  showCoinToss: boolean;
};

export type GameAction =
  | { type: "DROP_CHECKER"; column: number }
  | { type: "SET_PLAYER"; player: number }
  | { type: "SET_WINNER"; winner: number | null }
  | { type: "HIDE_COIN_TOSS" }
  | { type: "RESET" }
  | { type: "SET_STATE"; newState: Partial<GameState> };

export const getLastEmptyRow = (field: number[][], colIndex: number): number | null => {
  for (let row = MAX_ROWS - 1; row >= 0; row--) {
    if (field[row][colIndex] === 0) return row;
  }
  return null;
};

export const isBoardFull = (field: number[][]): boolean =>
  field.every((row) => row.every((cell) => cell !== 0));

export const isBoardEmpty = (field: number[][]): boolean =>
  field.every((row) => row.every((cell) => cell === 0));

export const checkVictory = (
  field: number[][],
  row: number,
  col: number,
  player: number
): boolean => {
  const directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
  ];

  for (const { dr, dc } of directions) {
    let count = 1;
    for (let i = 1; i < 4; i++) {
      const r = row + i * dr;
      const c = col + i * dc;
      if (r < 0 || r >= MAX_ROWS || c < 0 || c >= MAX_COLS || field[r][c] !== player)
        break;
      count++;
    }
    for (let i = 1; i < 4; i++) {
      const r = row - i * dr;
      const c = col - i * dc;
      if (r < 0 || r >= MAX_ROWS || c < 0 || c >= MAX_COLS || field[r][c] !== player)
        break;
      count++;
    }
    if (count >= 4) return true;
  }
  return false;
};

export const initialGameState: GameState = {
  field: Array.from({ length: MAX_ROWS }, () => Array(MAX_COLS).fill(0)),
  currentPlayer: null,
  winner: null,
  lastChecker: null,
  isNewGame: true,
  showCoinToss: true,
};