export const TIME_TO_FORGOT_GAME = 0.5 * 60 * 60 * 1000;
export const PLAYER_MAX_GAME_TIME = 10 * 60 * 1000;
export const TIME_REWARD_FOR_MOVE = 3;

export type Piece = {
  type: "pawn" | "rook" | "knight" | "bishop" | "queen" | "king";
  color: "white" | "black";
  hasMoved: boolean;
};
// Difficulty type definition
export type Difficulty = "monkey" | "easy" | "medium" | "hard";

type PlayerInfo = {
  name: string;
  remainingTime: number;
};

export type Move = {
  from: [number, number]; // [row, col]
  to: [number, number];
  piece: Piece["type"];
  captured?: Piece["type"];
  promotion?: Piece["type"];
  flags?: "k" | "p" | "e" | "n" | "q"; // k - castling, p - pawn, e - en passant, n - normal, q - promotion
  notation: string;
};

export type GameState = {
  board: (Piece | null)[][];
  currentTurn: "white" | "black";
  winner: "white" | "black" | "draw" | null;
  selectedCell: [number, number] | null;
  availableMoves: [number, number][];
  kingsPositions: { white: [number, number]; black: [number, number] };
  sideInCheck: "white" | "black" | null;
  history: Move[];
  playerInfo: { white: PlayerInfo; black: PlayerInfo };
  isPaused: boolean;
  gameMode: "lobby" | "local" | "bot";
  difficulty: Difficulty;
  pendingPromotion: {
    from: [number, number];
    to: [number, number];
    captured?: Piece["type"];
  } | null;
};
export const getInitialGameState = (): GameState => ({
  board: initializeBoard(),
  currentTurn: "white",
  winner: null,
  selectedCell: null,
  availableMoves: [],
  kingsPositions: { white: [7, 4], black: [0, 4] },
  sideInCheck: null,
  history: [],
  playerInfo: {
    white: { name: "", remainingTime: PLAYER_MAX_GAME_TIME + 1000 },
    black: { name: "", remainingTime: PLAYER_MAX_GAME_TIME },
  },
  isPaused: false,
  gameMode: "local",
  difficulty: "monkey",
  pendingPromotion: null,
});

export const initialGameState = getInitialGameState(); // Keep for backward compatibility if needed, but preferably remove usage

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

// --- Move Validation Strategies ---

const validatePawnMove = (
  state: GameState,
  from: [number, number],
  to: [number, number],
): boolean => {
  const { board } = state;
  const piece = board[from[0]][from[1]];
  const targetPiece = board[to[0]][to[1]];

  if (!piece || piece.type !== "pawn") return false;

  const dRow = to[0] - from[0];
  const dCol = to[1] - from[1];
  const direction = piece.color === "white" ? -1 : 1;
  const startRow = piece.color === "white" ? 6 : 1;

  // 1. Move forward 1 square
  if (dCol === 0 && dRow === direction) {
    return targetPiece === null;
  }

  // 2. Move forward 2 squares
  if (dCol === 0 && dRow === 2 * direction && from[0] === startRow) {
    return targetPiece === null && board[from[0] + direction][from[1]] === null;
  }

  // 3. Regular Capture
  if (Math.abs(dCol) === 1 && dRow === direction) {
    if (targetPiece !== null && targetPiece.color !== piece.color) {
      return true;
    }
    // 4. En Passant
    return isEnPassantAvailable(state, from, to);
  }

  return false;
};

const validateKnightMove = (
  state: GameState,
  from: [number, number],
  to: [number, number],
): boolean => {
  const dRow = to[0] - from[0];
  const dCol = to[1] - from[1];
  return (
    (Math.abs(dRow) === 2 && Math.abs(dCol) === 1) ||
    (Math.abs(dRow) === 1 && Math.abs(dCol) === 2)
  );
};

const validateLinearMove = (
  state: GameState,
  from: [number, number],
  to: [number, number],
): boolean => {
  const dRow = to[0] - from[0];
  const dCol = to[1] - from[1];
  const piece = state.board[from[0]][from[1]];

  if (!piece) return false;

  if (piece.type === "rook" && dRow !== 0 && dCol !== 0) return false;
  if (piece.type === "bishop" && Math.abs(dRow) !== Math.abs(dCol))
    return false;
  // Queen combines both, check below in MoveRules dispatch or implicit logic here

  return isPathClear(state.board, from, to);
};

const validateKingMove = (
  state: GameState,
  from: [number, number],
  to: [number, number],
): boolean => {
  const dRow = Math.abs(to[0] - from[0]);
  const dCol = Math.abs(to[1] - from[1]);
  return dRow <= 1 && dCol <= 1;
};

const MoveRules: Record<
  Piece["type"],
  (state: GameState, from: [number, number], to: [number, number]) => boolean
> = {
  pawn: validatePawnMove,
  knight: validateKnightMove,
  rook: validateLinearMove,
  bishop: validateLinearMove,
  queen: (state, from, to) => {
    const dRow = to[0] - from[0];
    const dCol = to[1] - from[1];
    if (dRow === 0 || dCol === 0 || Math.abs(dRow) === Math.abs(dCol)) {
      return validateLinearMove(state, from, to);
    }
    return false;
  },
  king: validateKingMove,
};

// --- Helpers ---

export const isEnPassantAvailable = (
  state: GameState,
  from: [number, number],
  to: [number, number],
): boolean => {
  const { board, history } = state;
  const piece = board[from[0]][from[1]];

  if (!piece || piece.type !== "pawn") return false;

  const lastMove = history[history.length - 1];
  if (!lastMove) return false;

  const isPawnDoubleJump =
    lastMove.piece === "pawn" &&
    Math.abs(lastMove.from[0] - lastMove.to[0]) === 2;

  if (!isPawnDoubleJump) return false;

  const isEnemyAdjacent =
    lastMove.to[0] === from[0] && Math.abs(lastMove.to[1] - from[1]) === 1; // Enemy pawn is next to ours

  const isMovingToEnemyFile = to[1] === lastMove.to[1]; // We are moving into the file of the enemy pawn

  const direction = piece.color === "white" ? -1 : 1;
  // const isMovingBehindEnemy = to[0] === lastMove.to[0] + direction; // Moving strictly behind

  // NOTE: In the original logic: "isMovingToEnemyFile" was used.
  // Original: if (isEnemyAdjacent && isMovingToEnemyFile) return true;
  // But wait, the diagonal move validation already checks `dRow === direction`.

  return isEnemyAdjacent && isMovingToEnemyFile;
};

const isPathClear = (
  board: (Piece | null)[][],
  from: [number, number],
  to: [number, number],
): boolean => {
  const dRow = to[0] - from[0];
  const dCol = to[1] - from[1];
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

// --- Main Validation Export ---

export const isValidMove = (
  state: GameState,
  from: [number, number],
  to: [number, number],
): boolean => {
  const { board } = state;
  const piece = board[from[0]][from[1]];
  const targetPiece = board[to[0]][to[1]];

  if (!piece) return false;

  // Common rule: Cannot capture own piece
  if (targetPiece && targetPiece.color === piece.color) {
    return false;
  }

  const validator = MoveRules[piece.type];
  if (validator) {
    return validator(state, from, to);
  }

  return false;
};

export const getAvailableMoves = (
  state: GameState,
  from: [number, number],
): [number, number][] => {
  // Use pseudo-legal moves first
  const pseudoMoves = getPseudoLegalMoves(state, from);
  const legalMoves: [number, number][] = [];

  const { board } = state;
  const piece = board[from[0]][from[1]];

  if (!piece) return [];

  for (const to of pseudoMoves) {
    if (!wouldBeInCheck(board, from, to)) {
      legalMoves.push(to);
    }
  }

  // Castling is special, handled separately or we can integrate it.
  // Original logic had it in the loop but called isCastlingAvailable separately if not valid move.
  // Let's keep the original specific behavior for castling:
  // "else if (piece.type === 'king' && isCastlingAvailable...)"
  // actually `getPseudoLegalMoves` should probably return Castling moves too if we want to be clean?
  // But purely for "Available moves" UI, let's Stick to the existing pattern:
  // The original loop iterated ALL squares.
  // Optimized: `getPseudoLegalMoves` returns likely candidates.
  // We just need to check castling separately as before if we don't include it in pseudo.

  // Let's add castling manually here regardless of pseudo logic to ensure we don't miss it
  // (or update pseudo to include it, but castling has strict rules about check so it fits better in strict generation)
  if (piece.type === "king") {
    if (isCastlingAvailable(board, from, [from[0], 7]))
      legalMoves.push([from[0], 7]);
    if (isCastlingAvailable(board, from, [from[0], 0]))
      legalMoves.push([from[0], 0]);
  }

  return legalMoves;
};

export const getPseudoLegalMoves = (
  state: GameState,
  from: [number, number],
): [number, number][] => {
  const moves: [number, number][] = [];
  const { board } = state;
  const piece = board[from[0]][from[1]];

  if (!piece) return [];

  // Iterate only relevant squares based on piece type to avoid 64 iterations
  // Actually, the original code iterated 64 loops.
  // To strictly optimize, we should only check relevant squares.

  // Helper to safely add if valid basic move
  const tryMove = (to: [number, number]) => {
    if (to[0] >= 0 && to[0] < 8 && to[1] >= 0 && to[1] < 8) {
      if (isValidMove(state, from, to)) {
        moves.push(to);
      }
    }
  };

  const r = from[0];
  const c = from[1];

  switch (piece.type) {
    case "pawn": {
      const dir = piece.color === "white" ? -1 : 1;
      // Forward 1
      tryMove([r + dir, c]);
      // Forward 2
      tryMove([r + dir * 2, c]);
      // Captures
      tryMove([r + dir, c - 1]);
      tryMove([r + dir, c + 1]);
      break;
    }
    case "knight": {
      const offsets = [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1],
      ];
      for (const o of offsets) tryMove([r + o[0], c + o[1]]);
      break;
    }
    case "king": {
      const offsets = [
        [-1, -1],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 0],
        [1, 1],
      ];
      for (const o of offsets) tryMove([r + o[0], c + o[1]]);
      break;
    }
    case "rook": {
      const dirs = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ];
      for (const d of dirs) {
        for (let i = 1; i < 8; i++) {
          const to: [number, number] = [r + d[0] * i, c + d[1] * i];
          if (to[0] < 0 || to[0] > 7 || to[1] < 0 || to[1] > 7) break;
          if (isValidMove(state, from, to)) {
            moves.push(to);
            if (board[to[0]][to[1]] !== null) break; // blocked
          } else {
            break; // blocked by own or invalid
          }
        }
      }
      break;
    }
    case "bishop": {
      const dirs = [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ];
      for (const d of dirs) {
        for (let i = 1; i < 8; i++) {
          const to: [number, number] = [r + d[0] * i, c + d[1] * i];
          if (to[0] < 0 || to[0] > 7 || to[1] < 0 || to[1] > 7) break;
          if (isValidMove(state, from, to)) {
            moves.push(to);
            if (board[to[0]][to[1]] !== null) break;
          } else {
            break;
          }
        }
      }
      break;
    }
    case "queen": {
      const dirs = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ];
      for (const d of dirs) {
        for (let i = 1; i < 8; i++) {
          const to: [number, number] = [r + d[0] * i, c + d[1] * i];
          if (to[0] < 0 || to[0] > 7 || to[1] < 0 || to[1] > 7) break;
          if (isValidMove(state, from, to)) {
            moves.push(to);
            if (board[to[0]][to[1]] !== null) break;
          } else {
            break;
          }
        }
      }
      break;
    }
  }

  return moves;
};

export const wouldBeInCheck = (
  board: (Piece | null)[][],
  from: [number, number],
  to: [number, number],
): boolean => {
  const piece = board[from[0]][from[1]];
  if (!piece) return false;

  const color = piece.color;
  const targetPiece = board[to[0]][to[1]];

  // 1. Mutate Board (Move)
  board[to[0]][to[1]] = { ...piece, hasMoved: true }; // Cloning piece is cheap, board is not
  board[from[0]][from[1]] = null;

  // 2. Find King (Optimized: only search if we don't know or if king moved)
  // Logic: We usually know King pos from state, but this function signature only takes board.
  // We can scan or pass it in. For safety, let's scan but break early.
  // Actually, if we moved the king, we know where it is (to).
  let kingPos: [number, number] | null = null;

  if (piece.type === "king") {
    kingPos = to;
  } else {
    // Find king
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p?.type === "king" && p.color === color) {
          kingPos = [r, c];
          break;
        }
      }
      if (kingPos) break;
    }
  }

  // 3. Check
  const inCheck = kingPos ? isCheck(board, color, kingPos) : false; // Should always find king

  // 4. Revert Board (Unmake)
  board[from[0]][from[1]] = piece; // Put original piece back
  board[to[0]][to[1]] = targetPiece; // Put target back

  return inCheck;
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
      availableMoves: getAvailableMoves(state, to),
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
  // Для рокіровки історія також важлива, але менш критична для En Passant (хіба що ми хочемо перевірити щось специфічне)
  // Але для консистентності зробимо аналогічно
  const tempMove: Move = {
    from,
    to: [row, newKingY],
    piece: "king",
    captured: undefined,
    promotion: undefined,
    flags: "k",
    notation: isShortCastle ? "O-O" : "O-O-O",
  };

  const intermediateState: GameState = {
    ...state,
    board: newBoard,
    kingsPositions: newKingsPositions,
    currentTurn: state.currentTurn === "white" ? "black" : "white",
    history: [...state.history, tempMove],
  };

  const isCheckVal = isCheck(
    newBoard,
    intermediateState.currentTurn,
    newKingsPositions[intermediateState.currentTurn],
  );
  const isCheckmateVal = isCheckmate(
    intermediateState,
    intermediateState.currentTurn,
  );
  const isStalemateVal = isStalemate(
    intermediateState,
    intermediateState.currentTurn,
  );

  // Додаємо символи шаху/мату до нотації якщо потрібно (стандартно O-O+ або O-O#)
  const checkSymbol = isCheckmateVal ? "#" : isCheckVal ? "+" : "";
  const finalNotation = tempMove.notation + checkSymbol;

  return {
    ...intermediateState,
    history: [...state.history, { ...tempMove, notation: finalNotation }],
    selectedCell: null,
    availableMoves: [],
    sideInCheck: isCheckVal ? intermediateState.currentTurn : null,
    playerInfo: {
      ...state.playerInfo,
      [state.currentTurn]: {
        ...state.playerInfo[state.currentTurn],
        remainingTime: newRemainingTime,
      },
    },
    winner: isCheckmateVal ? state.currentTurn : isStalemateVal ? "draw" : null,
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
  if (!isValidMove(state, from, to) || wouldBeInCheck(state.board, from, to)) {
    return state;
  }

  const targetPiece = state.board[to[0]][to[1]];
  const newBoard = state.board.map((row) => [...row]);
  const piece = newBoard[from[0]][from[1]];

  if (!piece) return state;

  newBoard[to[0]][to[1]] = { ...piece, hasMoved: true };
  newBoard[from[0]][from[1]] = null;

  // Handle En Passant Capture
  // IF pawn moved diagonally to an empty square, it's En Passant (since isValidMove passed)
  if (
    piece.type === "pawn" &&
    Math.abs(to[1] - from[1]) === 1 &&
    !targetPiece
  ) {
    // Remove the captured pawn
    const direction = piece.color === "white" ? -1 : 1;
    // The captured pawn is at [from[0], to[1]] (same rank as from, file as to)
    // Wait, En Passant: White pawn at row 3 (index 3? no, rank 5 is index 3)
    // White moves -1. From row 3 (Rank 5). Target row 2 (Rank 6).
    // Enemy pawn is at row 3 (Rank 5).
    // Coordinates: from[0] is correct row.
    newBoard[from[0]][to[1]] = null;
  }

  if (
    piece.type === "pawn" &&
    ((piece.color === "white" && to[0] === 0) ||
      (piece.color === "black" && to[0] === 7))
  ) {
    return {
      ...state,
      pendingPromotion: { from, to, captured: targetPiece?.type },
      board: newBoard,
      currentTurn: state.currentTurn,
      history: [...state.history],
      selectedCell: null,
      availableMoves: [],
    };
  }

  const newKingsPositions = { ...state.kingsPositions };
  if (piece.type === "king") {
    newKingsPositions[piece.color] = to;
  }
  const remainingTime = state.playerInfo[state.currentTurn].remainingTime;
  const newRemainingTime = Math.min(
    remainingTime + TIME_REWARD_FOR_MOVE * 1000,
    PLAYER_MAX_GAME_TIME,
  );

  // Create intermediate state to check for checkmate/stalemate
  // We need to add the current move to history so En Passant checks work for the opponent
  const tempMove: Move = {
    from,
    to,
    piece: piece.type,
    captured: targetPiece?.type,
    flags: "n",
    notation: "", // Temporary
  };

  const intermediateState: GameState = {
    ...state,
    board: newBoard,
    kingsPositions: newKingsPositions,
    currentTurn: state.currentTurn === "white" ? "black" : "white",
    history: [...state.history, tempMove],
  };

  const isCheckVal = isCheck(
    newBoard,
    intermediateState.currentTurn,
    newKingsPositions[intermediateState.currentTurn],
  );
  const isCheckmateVal = isCheckmate(
    intermediateState,
    intermediateState.currentTurn,
  );

  const notation = generateMoveNotation(
    piece,
    from,
    to,
    targetPiece,
    newBoard, // purely for geometry if needed
    newKingsPositions,
    isCheckVal,
    isCheckmateVal,
  );

  const finalMove: Move = { ...tempMove, notation };

  return {
    ...intermediateState,
    history: [...state.history, finalMove],
    selectedCell: null,
    availableMoves: [],
    sideInCheck: isCheckVal ? intermediateState.currentTurn : null,
    playerInfo: {
      ...state.playerInfo,
      [state.currentTurn]: {
        ...state.playerInfo[state.currentTurn],
        remainingTime: newRemainingTime,
      },
    },
    winner: isCheckmateVal
      ? state.currentTurn
      : isStalemate(intermediateState, intermediateState.currentTurn)
        ? "draw"
        : null,
  };
};

export const handlePromotion = (
  state: GameState,
  promoteTo: Piece["type"],
): GameState => {
  if (!state.pendingPromotion) return state;

  const { to } = state.pendingPromotion;
  const newBoard = state.board.map((row) => [...row]);
  const piece = newBoard[to[0]][to[1]];

  if (!piece) return state; // Should not happen

  // Promote piece
  newBoard[to[0]][to[1]] = { ...piece, type: promoteTo };

  // Now we finalize the move: switch turn, check checks, etc.
  const newKingsPositions = { ...state.kingsPositions }; // King didn't move in promotion step (already moved)

  const remainingTime = state.playerInfo[state.currentTurn].remainingTime;
  const newRemainingTime = Math.min(
    remainingTime + TIME_REWARD_FOR_MOVE * 1000,
    PLAYER_MAX_GAME_TIME,
  );

  // Handle Promotion
  // We need to form the final move with check status
  // Basically similar logic to handleRegularMove but starting from pending state

  const tempMove: Move = {
    from: state.pendingPromotion.from,
    to,
    piece: "pawn",
    captured: state.pendingPromotion.captured,
    flags: "q",
    promotion: promoteTo,
    notation: "",
  };

  const intermediateState: GameState = {
    ...state,
    board: newBoard,
    kingsPositions: newKingsPositions,
    pendingPromotion: null,
    currentTurn: state.currentTurn === "white" ? "black" : "white",
    history: [...state.history, tempMove],
  };

  const isCheckVal = isCheck(
    newBoard,
    intermediateState.currentTurn,
    newKingsPositions[intermediateState.currentTurn],
  );
  const isCheckmateVal = isCheckmate(
    intermediateState,
    intermediateState.currentTurn,
  );

  const notation = generateMoveNotation(
    {
      type: "pawn",
      color: state.currentTurn,
      hasMoved: true,
    },
    state.pendingPromotion.from,
    to,
    state.pendingPromotion.captured
      ? {
          type: state.pendingPromotion.captured,
          color: state.currentTurn === "white" ? "black" : "white",
          hasMoved: false,
        }
      : null,
    newBoard,
    newKingsPositions,
    isCheckVal,
    isCheckmateVal,
    promoteTo,
  );

  return {
    ...intermediateState,
    history: [...state.history, { ...tempMove, notation }],
    selectedCell: null,
    availableMoves: [],
    sideInCheck: isCheckVal ? intermediateState.currentTurn : null,
    winner: isCheckmateVal
      ? state.currentTurn
      : isStalemate(intermediateState, intermediateState.currentTurn)
        ? "draw"
        : null,
    playerInfo: {
      ...state.playerInfo,
      [state.currentTurn]: {
        ...state.playerInfo[state.currentTurn],
        remainingTime: newRemainingTime,
      },
    },
  };
};

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

export const hasLegalMoves = (
  state: GameState,
  side: "white" | "black",
): boolean => {
  const { board } = state;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === side) {
        const moves = getAvailableMoves(state, [r, c]);
        if (moves.length > 0) return true;
      }
    }
  }
  return false;
};

export const isCheckmate = (
  state: GameState,
  side: "white" | "black",
): boolean => {
  // Note: isCheck only needs board and positions, which are in state
  return (
    isCheck(state.board, side, state.kingsPositions[side]) &&
    !hasLegalMoves(state, side)
  );
};

export const isStalemate = (
  state: GameState,
  side: "white" | "black",
): boolean => {
  return (
    !isCheck(state.board, side, state.kingsPositions[side]) &&
    !hasLegalMoves(state, side)
  );
};

export const getCheckmateStatus = (
  state: GameState,
): "white" | "black" | "draw" | null => {
  if (isCheckmate(state, state.currentTurn)) {
    return state.currentTurn === "white" ? "black" : "white";
  }

  if (isStalemate(state, state.currentTurn)) {
    return "draw";
  }

  return null;
};

export const cleanLocalStorage = () => {
  const keys = [
    "chessGameState",
    "chessTimerTime1",
    "chessTimerTime2",
    "chess_state_local",
    "chess_state_bot",
  ];
  keys.forEach((key) => localStorage.removeItem(key));
};

const generateMoveNotation = (
  piece: Piece,
  from: [number, number],
  to: [number, number],
  captured: Piece | null,
  finalBoard: (Piece | null)[][], // Board AFTER move to check for check/mate
  kingsPositions: { white: [number, number]; black: [number, number] },
  isCheckVal: boolean,
  isCheckmateVal: boolean,
  promotion?: Piece["type"],
): string => {
  const checkSymbol = isCheckmateVal ? "#" : isCheckVal ? "+" : "";

  // Castling handled separately in logic, so this is for regular/promotion

  const colToLetter = (col: number) => String.fromCharCode(97 + col);
  const rowToRank = (row: number) => (8 - row).toString();

  const targetSq = `${colToLetter(to[1])}${rowToRank(to[0])}`;

  if (piece.type === "pawn") {
    if (captured) {
      return `${colToLetter(from[1])}x${targetSq}${promotion ? "=" + getPieceLetter(promotion) : ""}${checkSymbol}`;
    }
    return `${targetSq}${promotion ? "=" + getPieceLetter(promotion) : ""}${checkSymbol}`;
  }

  const pieceLetter = getPieceLetter(piece.type);
  const captureSymbol = captured ? "x" : "";

  // TODO: Disambiguation (e.g. Nbd7) if multiple pieces can move there
  // For now simple notation

  return `${pieceLetter}${captureSymbol}${targetSq}${checkSymbol}`;
};

const getPieceLetter = (type: Piece["type"]): string => {
  switch (type) {
    case "pawn":
      return "";
    case "knight":
      return "N";
    case "bishop":
      return "B";
    case "rook":
      return "R";
    case "queen":
      return "Q";
    case "king":
      return "K";
    default:
      return "";
  }
};
