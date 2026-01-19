export const TIME_TO_FORGOT_GAME = 0.5 * 60 * 60 * 1000;
export const PLAYER_MAX_GAME_TIME = 10 * 60 * 1000;
export const TIME_REWARD_FOR_MOVE = 3;
export type Piece = {
  type: "pawn" | "rook" | "knight" | "bishop" | "queen" | "king";
  color: "white" | "black";
  hasMoved: boolean;
};
type PlayerInfo = {
  name: string;
  remainingTime: number;
};
export type GameState = {
  board: (Piece | null)[][];
  currentTurn: "white" | "black";
  winner: "white" | "black" | "draw" | null;
  selectedCell: [number, number] | null;
  availableMoves: [number, number][];
  kingsPositions: { white: [number, number]; black: [number, number] };
  sideInCheck: "white" | "black" | null;
  history: { from: [number, number]; to: [number, number] }[];
  playerInfo: { white: PlayerInfo; black: PlayerInfo };
};
export const initialGameState: GameState = {
  board: initializeBoard(),
  currentTurn: "white",
  winner: null,
  selectedCell: null,
  availableMoves: [],
  kingsPositions: { white: [7, 4], black: [0, 4] },
  sideInCheck: null,
  history: [],
  playerInfo: {
    white: { name: "", remainingTime: PLAYER_MAX_GAME_TIME },
    black: { name: "", remainingTime: PLAYER_MAX_GAME_TIME },
  },
};

function initializeBoard(): (Piece | null)[][] {
  const backRank: Piece["type"][] = [
    "rook",
    "knight",
    "bishop",
    "queen",
    "king",
    "bishop",
    "knight",
    "rook",
  ];

  function makeRow(type: null): null[];
  function makeRow(type: Piece["type"], color: Piece["color"]): Piece[];
  function makeRow(type: Piece["type"] | null, color?: Piece["color"]) {
    return Array.from({ length: 8 }, () =>
      type ? { type, color: color!, hasMoved: false } : null,
    );
  }

  return Array.from({ length: 8 }, (_, i) => {
    if (i === 0)
      return backRank.map((t) => ({
        type: t,
        color: "black",
        hasMoved: false,
      }));
    if (i === 1) return makeRow("pawn", "black");
    if (i === 6) return makeRow("pawn", "white");
    if (i === 7)
      return backRank.map((t) => ({
        type: t,
        color: "white",
        hasMoved: false,
      }));
    return makeRow(null);
  });
}

export const isValidMove = (
  board: (Piece | null)[][],
  from: [number, number],
  to: [number, number],
): boolean => {
  const piece = board[from[0]][from[1]];
  const targetPiece = board[to[0]][to[1]];

  if (!piece) return false;

  if (targetPiece && targetPiece.color === piece.color) {
    return false;
  }

  const dRow = to[0] - from[0];
  const dCol = to[1] - from[1];

  const isPathClear = () => {
    const stepRow = dRow === 0 ? 0 : dRow > 0 ? 1 : -1;
    const stepCol = dCol === 0 ? 0 : dCol > 0 ? 1 : -1;

    let currentRow = from[0] + stepRow;
    let currentCol = from[1] + stepCol;

    while (currentRow !== to[0] || currentCol !== to[1]) {
      if (board[currentRow][currentCol] !== null) {
        return false;
      }
      currentRow += stepRow;
      currentCol += stepCol;
    }
    return true;
  };

  switch (piece.type) {
    case "pawn": {
      const direction = piece.color === "white" ? -1 : 1;
      const startRow = piece.color === "white" ? 6 : 1;

      if (dCol === 0 && dRow === direction) {
        return targetPiece === null;
      }

      if (dCol === 0 && dRow === 2 * direction && from[0] === startRow) {
        return (
          targetPiece === null && board[from[0] + direction][from[1]] === null
        );
      }

      if (Math.abs(dCol) === 1 && dRow === direction) {
        return targetPiece !== null;
      }

      return false;
    }

    case "rook":
      if (dRow === 0 || dCol === 0) {
        return isPathClear();
      }
      return false;

    case "knight":
      return (
        (Math.abs(dRow) === 2 && Math.abs(dCol) === 1) ||
        (Math.abs(dRow) === 1 && Math.abs(dCol) === 2)
      );

    case "bishop":
      if (Math.abs(dRow) === Math.abs(dCol)) {
        return isPathClear();
      }
      return false;

    case "queen":
      if (dRow === 0 || dCol === 0 || Math.abs(dRow) === Math.abs(dCol)) {
        return isPathClear();
      }
      return false;

    case "king":
      return Math.abs(dRow) <= 1 && Math.abs(dCol) <= 1;

    default:
      return false;
  }
};

export const getAvailableMoves = (
  board: (Piece | null)[][],
  from: [number, number],
): [number, number][] => {
  const possibleMoves: [number, number][] = [];
  const piece = board[from[0]][from[1]];

  if (!piece) return [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const to: [number, number] = [row, col];

      if (isValidMove(board, from, to)) {
        // Перевіряємо, чи цей хід не залишає нашого короля під шахом
        if (!wouldBeInCheck(board, from, to)) {
          possibleMoves.push(to);
        }
      }
    }
  }

  return possibleMoves;
};

export const wouldBeInCheck = (
  board: (Piece | null)[][],
  from: [number, number],
  to: [number, number],
): boolean => {
  const piece = board[from[0]][from[1]];
  if (!piece) return false;

  const color = piece.color;

  // 1. Симулюємо хід
  const tempBoard = board.map((row) => [...row]);
  tempBoard[to[0]][to[1]] = { ...piece, hasMoved: true };
  tempBoard[from[0]][from[1]] = null;

  // 2. Знаходимо позицію короля (якщо хід робив король, то нова позиція, інакше стара)
  let kingPos: [number, number] = [0, 0];
  let found = false;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = tempBoard[r][c];
      if (p?.type === "king" && p.color === color) {
        kingPos = [r, c];
        found = true;
        break;
      }
    }
    if (found) break;
  }

  // 3. Перевіряємо, чи атакована ця позиція
  return isCheck(tempBoard, color, kingPos);
};

export const isCastlingAvailable = (
  board: (Piece | null)[][],
  from: [number, number],
  to: [number, number],
) => {
  const king = board[from[0]][from[1]];
  const rook = board[to[0]][to[1]];

  if (!king || !rook) return false;
  if (king.type !== "king" || rook.type !== "rook") return false;
  if (king.color !== rook.color) return false;
  if (king.hasMoved || rook.hasMoved) return false;
  if (from[0] !== to[0]) return false;

  const opponentColor = king.color === "white" ? "black" : "white";

  // Коротка рокіровка (King E -> G, Rook H -> F)
  if (to[1] === 7) {
    // 1. Перевірка на пустоту між королем і турою (F, G)
    for (let i = from[1] + 1; i < to[1]; i++) {
      if (board[from[0]][i] !== null) return false;
    }

    // 2. Перевірка безпеки полів:
    for (let i = 0; i <= 2; i++) {
      if (isSquareAttacked(from[0], from[1] + i, opponentColor, board)) {
        return false;
      }
    }
    return true;
  }

  // Довга рокіровка (King E -> C, Rook A -> D)
  if (to[1] === 0) {
    // 1. Перевірка на пустоту (B, C, D)
    for (let i = from[1] - 1; i > to[1]; i--) {
      if (board[from[0]][i] !== null) return false;
    }

    // 2. Перевірка безпеки полів:
    for (let i = 0; i <= 2; i++) {
      if (isSquareAttacked(from[0], from[1] - i, opponentColor, board)) {
        return false;
      }
    }
    return true;
  }

  return false;
};

export const isSquareAttacked = (
  targetX: number,
  targetY: number,
  attackerColor: "white" | "black",
  board: (Piece | null)[][],
): boolean => {
  // 1. Перевірка пішаків (PAWN)
  const pawnRowDir = attackerColor === "white" ? 1 : -1;
  const pawnRow = targetX + pawnRowDir;

  if (pawnRow >= 0 && pawnRow < 8) {
    // Перевіряємо ліву та праву діагоналі відносно пішака
    const colsToCheck = [targetY - 1, targetY + 1];

    for (const col of colsToCheck) {
      if (col >= 0 && col < 8) {
        const piece = board[pawnRow][col];
        if (piece && piece.type === "pawn" && piece.color === attackerColor) {
          return true;
        }
      }
    }
  }

  // 2. Перевірка Коня (KNIGHT)
  const knightMoves = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ];

  for (const move of knightMoves) {
    const newRow = targetX + move[0];
    const newCol = targetY + move[1];
    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
      const piece = board[newRow][newCol];
      if (piece && piece.type === "knight" && piece.color === attackerColor) {
        return true;
      }
    }
  }

  // 3. Перевірка короля (KING) (сусідні клітинки)
  const kingMoves = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  for (const move of kingMoves) {
    const newRow = targetX + move[0];
    const newCol = targetY + move[1];
    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
      const piece = board[newRow][newCol];
      if (piece && piece.type === "king" && piece.color === attackerColor) {
        return true;
      }
    }
  }

  // 4. Лінійні атаки: Тура (ROOK) та Ферзь (QUEEN)
  const linearDirections = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (const dir of linearDirections) {
    let row = targetX + dir[0];
    let col = targetY + dir[1];

    while (row >= 0 && row < 8 && col >= 0 && col < 8) {
      const piece = board[row][col];
      if (piece) {
        if (
          piece.color === attackerColor &&
          (piece.type === "rook" || piece.type === "queen")
        ) {
          return true;
        }
        // Якщо зустріли будь-яку фігуру (свою чи чужу, але не ту, що атакує), лінія блокується
        break;
      }
      row += dir[0];
      col += dir[1];
    }
  }

  // 5. Діагональні атаки: Слон (BISHOP) та Ферзь (QUEEN)
  const diagonalDirections = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];

  for (const dir of diagonalDirections) {
    let row = targetX + dir[0];
    let col = targetY + dir[1];

    while (row >= 0 && row < 8 && col >= 0 && col < 8) {
      const piece = board[row][col];
      if (piece) {
        if (
          piece.color === attackerColor &&
          (piece.type === "bishop" || piece.type === "queen")
        ) {
          return true;
        }
        // Лінія заблокована фігурою
        break;
      }
      row += dir[0];
      col += dir[1];
    }
  }

  return false;
};

export const isCheck = (
  board: (Piece | null)[][],
  kingColor: "white" | "black",
  kingPosition: [number, number],
): boolean => {
  const opponentColor = kingColor === "white" ? "black" : "white";
  return isSquareAttacked(
    kingPosition[0],
    kingPosition[1],
    opponentColor,
    board,
  );
};

/**
 * Визначає, яка сторона зараз під шахом.
 */
const getCheckStatus = (
  board: GameState["board"],
  kingsPositions: GameState["kingsPositions"],
): "white" | "black" | null => {
  if (isCheck(board, "black", kingsPositions["black"])) return "black";
  if (isCheck(board, "white", kingsPositions["white"])) return "white";
  return null;
};

/**
 * Обробляє логіку рокіровки.
 */
export const handleCastling = (
  state: GameState,
  from: [number, number],
  to: [number, number],
): GameState => {
  const selectedPiece = state.board[from[0]][from[1]];
  const targetPiece = state.board[to[0]][to[1]];

  if (!isCastlingAvailable(state.board, from, to)) {
    // Якщо це дружня фігура, але не рокіровка — просто вибираємо її
    return {
      ...state,
      selectedCell: to,
      availableMoves: getAvailableMoves(state.board, to),
    };
  }

  const newBoard = state.board.map((row) => [...row]);
  const row = from[0];
  const isShortCastle = to[1] === 7;

  const newKingY = isShortCastle ? 6 : 2;
  const newRookY = isShortCastle ? 5 : 3;

  // Переміщуємо Короля
  newBoard[row][newKingY] = { ...selectedPiece!, hasMoved: true };
  newBoard[row][from[1]] = null;

  // Переміщуємо Туру
  newBoard[row][newRookY] = { ...targetPiece!, hasMoved: true };
  newBoard[row][to[1]] = null;

  const newKingsPositions = {
    ...state.kingsPositions,
    [selectedPiece!.color]: [row, newKingY] as [number, number],
  };
  const remainingTime = state.playerInfo[state.currentTurn].remainingTime;
  const newRemainingTime = Math.min(
    remainingTime + TIME_REWARD_FOR_MOVE * 1000,
    PLAYER_MAX_GAME_TIME,
  );
  return {
    ...state,
    board: newBoard,
    currentTurn: state.currentTurn === "white" ? "black" : "white",
    history: [...state.history, { from, to: [row, newKingY] }],
    kingsPositions: newKingsPositions,
    sideInCheck: getCheckStatus(newBoard, newKingsPositions),
    selectedCell: null,
    availableMoves: [],
    playerInfo: {
      ...state.playerInfo,
      [state.currentTurn]: {
        ...state.playerInfo[state.currentTurn],
        remainingTime: newRemainingTime,
      },
    },
  };
};

/**
 * Обробляє логіку звичайного ходу.
 */
export const handleRegularMove = (
  state: GameState,
  from: [number, number],
  to: [number, number],
): GameState => {
  if (
    !isValidMove(state.board, from, to) ||
    wouldBeInCheck(state.board, from, to)
  ) {
    return state;
  }

  const newBoard = state.board.map((row) => [...row]);
  const piece = newBoard[from[0]][from[1]];

  if (!piece) return state;

  newBoard[to[0]][to[1]] = { ...piece, hasMoved: true };
  newBoard[from[0]][from[1]] = null;

  const newKingsPositions = { ...state.kingsPositions };
  if (piece.type === "king") {
    newKingsPositions[piece.color] = to;
  }
  const remainingTime = state.playerInfo[state.currentTurn].remainingTime;
  const newRemainingTime = Math.min(
    remainingTime + TIME_REWARD_FOR_MOVE * 1000,
    PLAYER_MAX_GAME_TIME,
  );
  return {
    ...state,
    board: newBoard,
    currentTurn: state.currentTurn === "white" ? "black" : "white",
    history: [...state.history, { from, to }],
    selectedCell: null,
    availableMoves: [],
    kingsPositions: newKingsPositions,
    sideInCheck: getCheckStatus(newBoard, newKingsPositions),
    playerInfo: {
      ...state.playerInfo,
      [state.currentTurn]: {
        ...state.playerInfo[state.currentTurn],
        remainingTime: newRemainingTime,
      },
    },
  };
};

// type GameAction =
//   | { type: "MAKE_MOVE"; column: number }
//   | { type: "SET_PLAYER"; player: number }
//   | { type: "SET_WINNER"; winner: number | null }
//   | { type: "HIDE_COIN_TOSS" }
//   | { type: "RESET" }

export const handleTimeUpdate = (
  state: GameState,
  player: "white" | "black",
  remainingTime: number,
): GameState => {
  return {
    ...state,
    playerInfo: {
      ...state.playerInfo,
      [player]: {
        ...state.playerInfo[player],
        remainingTime,
      },
    },
  };
};

export const handleTimeout = (
  state: GameState,
  player: "white" | "black",
): GameState => {
  const winner = player === "white" ? "black" : "white";
  return {
    ...state,
    winner,
  };
};
