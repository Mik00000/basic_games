import { generateRandomNumber } from "../../components/utils";
import {
  MAX_ROWS,
  MAX_COLS,
  getLastEmptyRow,
  isBoardFull,
  checkVictory,
  GameState,
  GameAction,
} from "./gameLogic";

// Константи для затримки ходу бота
const BOT_DELAY_MIN = 750;
const BOT_DELAY_MAX = 2000;

// Константи для оцінки ліній
const WIN_SCORE = 1000;
const THREE_IN_ROW_SCORE = 50;
const TWO_IN_ROW_SCORE = 10;

export enum Player {
  Human = 1,
  Bot = 2,
}

type Dispatch = (action: GameAction) => void;

/**
 * Налаштування бота залежно від рівня складності.
 * Для рівня 1: завжди випадковий хід.
 * Для рівня 2: 50% випадковий хід, 50% мінімакс (глибина 3).
 * Для рівня 3: мінімакс з глибиною 5.
 * Для рівня 4: мінімакс з глибиною 7.
 */
function getBotSettings(difficulty: number): {
  randomProbability: number;
  searchDepth: number;
  timeModifier: number
} {
  switch (difficulty) {
    case 1:
      return { randomProbability: 0.85, searchDepth: 2, timeModifier:1.2 }; // випадковий хід завжди (minimax тут не використовується)
    case 2:
      return { randomProbability: 0.5, searchDepth: 3, timeModifier:1  };
    case 3:
      return { randomProbability: 0, searchDepth: 5, timeModifier:0.9  };
    case 4:
      return { randomProbability: 0, searchDepth: 7, timeModifier:0.7  };
    default:
      return { randomProbability: 0.85, searchDepth: 2, timeModifier:1.2  }; // за замовчуванням дуже легкий
  }
}

/**
 * Основна функція, що робить хід бота.
 * Тепер приймає рівень складності (1-4).
 *
 * @param state Стан гри.
 * @param dispatch Функція для виконання дій.
 * @param difficulty Рівень складності (1 - дуже легкий, 2 - середній, 3 - складний, 4 - дуже складний).
 */
export const botMove = (
  state: GameState,
  dispatch: Dispatch,
  difficulty: number
): void => {
  const validMoves = getValidMoves(state.field);
  if (validMoves.length === 0) return;

  // 1. Перевірка миттєвих виграшних ходів або блокування суперника.
  const { randomProbability, searchDepth, timeModifier } = getBotSettings(difficulty);

  const immediateMove =
    Math.random() >= randomProbability * 0.85 //Перевірка на тупість, що б він міг не помітити виграшний хід при низькій складності
      ? checkImmediateMoves(state.field, validMoves, Player.Bot, Player.Human)
      : null;
  if (immediateMove !== null) {
    setTimeout(() => {
      dispatch({ type: "DROP_CHECKER", column: immediateMove });
    }, generateRandomNumber(BOT_DELAY_MIN*timeModifier, BOT_DELAY_MAX*timeModifier));
    return;
  }

  // 2. Якщо рівень дозволяє випадковість, з певною ймовірністю робимо випадковий хід.
  if (Math.random() < randomProbability) {
    const randomMove =
      validMoves[Math.floor(Math.random() * validMoves.length)];
    setTimeout(() => {
      dispatch({ type: "DROP_CHECKER", column: randomMove });
    }, generateRandomNumber(BOT_DELAY_MIN*timeModifier, BOT_DELAY_MAX*timeModifier));
    return;
  }

  // 3. Використовуємо мінімакс з заданою глибиною.
  const bestMove = getBestMove(
    state.field,
    validMoves,
    Player.Bot,
    Player.Human,
    searchDepth
  );
  setTimeout(() => {
    dispatch({ type: "DROP_CHECKER", column: bestMove });
  }, generateRandomNumber(BOT_DELAY_MIN*timeModifier, BOT_DELAY_MAX*timeModifier));
};

/**
 * Повертає список валідних колонок, де можна зробити хід.
 */
function getValidMoves(field: number[][]): number[] {
  const moves: number[] = [];
  for (let col = 0; col < MAX_COLS; col++) {
    if (getLastEmptyRow(field, col) !== null) {
      moves.push(col);
    }
  }
  return moves;
}

/**
 * Створює клон поля (нову копію матриці).
 */
function cloneField(field: number[][]): number[][] {
  return field.map((row) => [...row]);
}

/**
 * Перевіряє, чи існує хід, який дозволяє миттєво перемогти або блокує переможний хід суперника.
 *
 * @param field Стан поля.
 * @param validMoves Масив ходів які бот може зробити
 * @param botPlayer Гравець-бот.
 * @param humanPlayer Гравець-суперник.
 * @returns Номер колонки, якщо знайдено миттєвий хід, інакше null.
 */
function checkImmediateMoves(
  field: number[][],
  validMoves: number[],
  botPlayer: Player,
  humanPlayer: Player
): number | null {
  // Перевірка на переможний хід для бота.
  for (const col of validMoves) {
    const tempField = cloneField(field);
    const row = getLastEmptyRow(tempField, col);
    if (row !== null) {
      tempField[row][col] = botPlayer;
      if (checkVictory(tempField, row, col, botPlayer)) {
        return col;
      }
    }
  }

  // Перевірка на можливість суперника виграти наступним ходом.
  for (const col of validMoves) {
    const tempField = cloneField(field);
    const row = getLastEmptyRow(tempField, col);
    if (row !== null) {
      tempField[row][col] = humanPlayer;
      if (checkVictory(tempField, row, col, humanPlayer)) {
        return col;
      }
    }
  }

  return null;
}

// Транспозиційна таблиця для кешування результатів мінімаксу
const transpositionTable = new Map<string, number>();

/**
 * Генерує унікальний ключ для кешування на основі стану поля, глибини та режиму пошуку.
 */
function getFieldKey(
  field: number[][],
  depth: number,
  isMaximizing: boolean
): string {
  return JSON.stringify({ field, depth, isMaximizing });
}

/**
 * Визначає найкращий хід за допомогою алгоритму мінімакс з альфа-бета відсіченням.
 *
 * @param field Поточний стан поля.
 * @param botPlayer Гравець-бот.
 * @param humanPlayer Гравець-суперник.
 * @param depth Глибина пошуку. 
 * @returns Найкращий хід (номер колонки).
 */
function getBestMove(
  field: number[][],
  validMoves: number[],
  botPlayer: Player,
  humanPlayer: Player,
  depth: number
): number {
  let bestScore = -Infinity;
  let bestMove: number | null = null;

  for (const col of validMoves) {
    const tempField = cloneField(field);
    makeMove(tempField, col, botPlayer);
    const score = minimax(
      tempField,
      depth - 1,
      -Infinity,
      Infinity,
      false,
      botPlayer,
      humanPlayer
    );
    if (score > bestScore) {
      bestScore = score;
      bestMove = col;
    }
  }
  return bestMove!;
}

/**
 * Алгоритм мінімакс з альфа-бета відсіченням для оцінки ходів.
 * Використовує кешування для оптимізації.
 *
 * @param field Стан поля.
 * @param depth Глибина пошуку.
 * @param alpha Значення альфа.
 * @param beta Значення бета.
 * @param isMaximizing Режим максимізації чи мінімізації.
 * @param botPlayer Гравець-бот.
 * @param humanPlayer Гравець-суперник.
 * @returns Оцінка поля.
 */
function minimax(
  field: number[][],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  botPlayer: Player,
  humanPlayer: Player
): number {
  const key = getFieldKey(field, depth, isMaximizing);
  if (transpositionTable.has(key)) {
    return transpositionTable.get(key)!;
  }

  if (depth === 0 || isTerminal(field)) {
    const evalScore = evaluateBoard(field, botPlayer, humanPlayer);
    transpositionTable.set(key, evalScore);
    return evalScore;
  }

  const validMoves = getValidMoves(field);
  let bestEval: number;
  if (isMaximizing) {
    bestEval = -Infinity;
    for (const col of validMoves) {
      const tempField = cloneField(field);
      makeMove(tempField, col, botPlayer);
      const evalScore = minimax(
        tempField,
        depth - 1,
        alpha,
        beta,
        false,
        botPlayer,
        humanPlayer
      );
      bestEval = Math.max(bestEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
  } else {
    bestEval = Infinity;
    for (const col of validMoves) {
      const tempField = cloneField(field);
      makeMove(tempField, col, humanPlayer);
      const evalScore = minimax(
        tempField,
        depth - 1,
        alpha,
        beta,
        true,
        botPlayer,
        humanPlayer
      );
      bestEval = Math.min(bestEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
  }
  transpositionTable.set(key, bestEval);
  return bestEval;
}

/**
 * Функція оцінки поля.
 * Аналізує горизонтальні, вертикальні та діагональні лінії,
 * повертаючи числову оцінку: позитивну для позицій бота (botPlayer)
 * та негативну для позицій суперника (humanPlayer).
 */
function evaluateBoard(
  field: number[][],
  botPlayer: Player,
  humanPlayer: Player
): number {
  let score = 0;

  function evaluateLine(cells: number[]): number {
    let botCount = 0;
    let humanCount = 0;
    let emptyCount = 0;

    for (const cell of cells) {
      if (cell === botPlayer) botCount++;
      else if (cell === humanPlayer) humanCount++;
      else emptyCount++;
    }

    if (botCount === 4) return WIN_SCORE;
    if (humanCount === 4) return -WIN_SCORE;
    if (botCount === 3 && emptyCount === 1) return THREE_IN_ROW_SCORE;
    if (humanCount === 3 && emptyCount === 1) return -THREE_IN_ROW_SCORE;
    if (botCount === 2 && emptyCount === 2) return TWO_IN_ROW_SCORE;
    if (humanCount === 2 && emptyCount === 2) return -TWO_IN_ROW_SCORE;
    return 0;
  }

  // Горизонтальні комбінації
  for (let row = 0; row < MAX_ROWS; row++) {
    for (let col = 0; col < MAX_COLS - 3; col++) {
      score += evaluateLine([
        field[row][col],
        field[row][col + 1],
        field[row][col + 2],
        field[row][col + 3],
      ]);
    }
  }

  // Вертикальні комбінації
  for (let row = 0; row < MAX_ROWS - 3; row++) {
    for (let col = 0; col < MAX_COLS; col++) {
      score += evaluateLine([
        field[row][col],
        field[row + 1][col],
        field[row + 2][col],
        field[row + 3][col],
      ]);
    }
  }

  // Діагональні комбінації (зліва направо, вниз)
  for (let row = 0; row < MAX_ROWS - 3; row++) {
    for (let col = 0; col < MAX_COLS - 3; col++) {
      score += evaluateLine([
        field[row][col],
        field[row + 1][col + 1],
        field[row + 2][col + 2],
        field[row + 3][col + 3],
      ]);
    }
  }

  // Діагональні комбінації (зліва направо, вгору)
  for (let row = 3; row < MAX_ROWS; row++) {
    for (let col = 0; col < MAX_COLS - 3; col++) {
      score += evaluateLine([
        field[row][col],
        field[row - 1][col + 1],
        field[row - 2][col + 2],
        field[row - 3][col + 3],
      ]);
    }
  }

  return score;
}

/**
 * Симулює хід: розміщує фішку заданого гравця у колонці, якщо там є вільне місце.
 */
function makeMove(field: number[][], col: number, player: Player): void {
  const row = getLastEmptyRow(field, col);
  if (row !== null) {
    field[row][col] = player;
  }
}

/**
 * Перевіряє, чи досягнуто термінального стану гри (виграш або нічия).
 */
function isTerminal(field: number[][]): boolean {
  if (isBoardFull(field)) return true;
  for (let row = 0; row < MAX_ROWS; row++) {
    for (let col = 0; col < MAX_COLS; col++) {
      const cell = field[row][col];
      if (cell !== 0 && checkVictory(field, row, col, cell)) {
        return true;
      }
    }
  }
  return false;
}
