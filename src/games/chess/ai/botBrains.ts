import {
  GameState,
  Piece,
  getAvailableMoves,
  getPseudoLegalMoves,
  isCastlingAvailable,
  Difficulty,
  isCheck,
  Move as LogicMove,
} from "../gameLogic";
import { getOpeningMove } from "./openingBook";
import { ZOBRIST_KEYS, computeHash, getPieceIndex } from "./zobrist";

// --- Types ---

type Move = {
  from: [number, number];
  to: [number, number];
  isCastle?: boolean;
  // Captured piece info for unmake
  captured?: Piece | null;
  promotion?: Piece["type"];
};

type TTEntry = {
  depth: number;
  score: number;
  flag: 0 | 1 | 2; // 0=EXACT, 1=LOWERBOUND (Alpha), 2=UPPERBOUND (Beta)
  bestMove?: Move;
};

// --- Constants ---

// Piece Values
const PIECE_VALUES: Record<Piece["type"], number> = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
  king: 20000,
};

// Values for Eval (Significantly higher for King to prioritize safety in check contexts if needed)
const VAL_PAWN = 100;
const VAL_KNIGHT = 320;
const VAL_BISHOP = 330;
const VAL_ROOK = 500;
const VAL_QUEEN = 900;
const VAL_KING = 20000;

const PAWN_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];
const KNIGHT_PST = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];
const BISHOP_PST = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -20],
];
const ROOK_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
];
const QUEEN_PST = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];
const KING_MIDDLE_PST = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

// --- Globals (Persistent State) ---

const TT = new Map<bigint, TTEntry>();
const MAX_TT_SIZE = 500000;

// Search Statistics
let NODES = 0;
let START_TIME = 0;
let TIME_LIMIT = 0;
let ABORT = false;

// Heuristic Tables
// Killer Moves: [depth][slot]
const KILLER_MOVES: (Move | null)[][] = Array.from({ length: 20 }, () => [
  null,
  null,
]);
// History Heuristic: [from_square_64][to_square_64]
const HISTORY: number[][] = Array.from({ length: 64 }, () =>
  new Array(64).fill(0),
);

// --- Evaluation Logic ---

const getPieceValue = (piece: Piece, r: number, c: number): number => {
  let base = 0;
  let pstVal = 0;
  let pst: number[][] | null = null;

  switch (piece.type) {
    case "pawn":
      base = VAL_PAWN;
      pst = PAWN_PST;
      break;
    case "knight":
      base = VAL_KNIGHT;
      pst = KNIGHT_PST;
      break;
    case "bishop":
      base = VAL_BISHOP;
      pst = BISHOP_PST;
      break;
    case "rook":
      base = VAL_ROOK;
      pst = ROOK_PST;
      break;
    case "queen":
      base = VAL_QUEEN;
      pst = QUEEN_PST;
      break;
    case "king":
      base = VAL_KING;
      pst = KING_MIDDLE_PST;
      break;
  }

  if (pst) {
    if (piece.color === "white") {
      pstVal = pst[r][c];
    } else {
      pstVal = pst[7 - r][c];
    }
  }

  return piece.color === "white" ? base + pstVal : -(base + pstVal);
};

const evaluateFull = (board: (Piece | null)[][]): number => {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) score += getPieceValue(p, r, c);
    }
  }
  return score;
};

// --- MUTABLE SEARCH CONTEXT ---

// We will maintain these variables during search to avoid passing them around
let BOARD: (Piece | null)[][];
let SCORE: number; // Current board score (White Advantage)
let HASH: bigint;

let KINGS: { white: [number, number]; black: [number, number] }; // Track Kings for quick check
let CURRENT_TURN: "white" | "black";
let HISTORY_LIST: LogicMove[];

// Piece Lists for fast generation: store 0-63 indices
// Using Int8Array for performance [index, -1, -1 ...]
// Max pieces per side is 16.
let WHITE_PIECES: number[] = [];
let BLACK_PIECES: number[] = [];

// Helper to add/remove from piece list
const addPieceToList = (color: "white" | "black", r: number, c: number) => {
  const sq = r * 8 + c;
  if (color === "white") WHITE_PIECES.push(sq);
  else BLACK_PIECES.push(sq);
};

const removePieceFromList = (
  color: "white" | "black",
  r: number,
  c: number,
) => {
  const sq = r * 8 + c;
  const list = color === "white" ? WHITE_PIECES : BLACK_PIECES;
  const idx = list.indexOf(sq);
  if (idx !== -1) {
    // Fast remove: swap with last and pop
    const last = list[list.length - 1];
    list[idx] = last;
    list.pop();
  }
};

const updatePieceInList = (
  color: "white" | "black",
  rFrom: number,
  cFrom: number,
  rTo: number,
  cTo: number,
) => {
  const oldSq = rFrom * 8 + cFrom;
  const newSq = rTo * 8 + cTo;
  const list = color === "white" ? WHITE_PIECES : BLACK_PIECES;
  const idx = list.indexOf(oldSq);
  if (idx !== -1) list[idx] = newSq;
};

// --- Move Execution (Make/Unmake) ---

const makeMove = (move: Move): void => {
  const isWhite = CURRENT_TURN === "white";
  const { from, to, isCastle } = move;

  // Switch Turn
  CURRENT_TURN = isWhite ? "black" : "white";
  HASH ^= ZOBRIST_KEYS.side;

  if (move.promotion) {
    // PROMOTION MOVE
    const piece = BOARD[from[0]][from[1]]!;
    const target = BOARD[to[0]][to[1]];
    const pieceIdx = getPieceIndex("pawn", piece.color); // It was a pawn
    const promoteToIdx = getPieceIndex(move.promotion, piece.color); // Now a Queen

    // 1. Remove from Source (Pawn)
    BOARD[from[0]][from[1]] = null;
    SCORE -= getPieceValue(piece, from[0], from[1]);
    HASH ^= ZOBRIST_KEYS.pieces[from[0]][from[1]][pieceIdx];

    // 2. Handle Capture
    if (target) {
      move.captured = target;
      const targetIdx = getPieceIndex(target.type, target.color);
      SCORE -= getPieceValue(target, to[0], to[1]);
      HASH ^= ZOBRIST_KEYS.pieces[to[0]][to[1]][targetIdx];
      removePieceFromList(target.color, to[0], to[1]);
    } else {
      move.captured = null;
    }

    // 3. Place Promoted Piece at Dest
    const promotedPiece: Piece = {
      ...piece,
      type: move.promotion,
      hasMoved: true,
    };
    BOARD[to[0]][to[1]] = promotedPiece;
    SCORE += getPieceValue(promotedPiece, to[0], to[1]);
    HASH ^= ZOBRIST_KEYS.pieces[to[0]][to[1]][promoteToIdx];

    // List Update: We need to remove the pawn and add the queen logic (or just update the index reference if we are tracking types in lists? No, lists just track squares).
    // Actually, our lists just track squares where pieces ARE. So we just need to update the square.
    // BUT, wait. If we use separate lists for piece types (we don't, we use WHITE_PIECES/BLACK_PIECES), we are fine.
    // We just move the square from 'from' to 'to'.
    // The type is determined by looking up the board.
    updatePieceInList(piece.color, from[0], from[1], to[0], to[1]);

    return;
  }

  if (isCastle) {
    // CASTLING LOGIC (No captures assumed)
    const row = from[0];
    const isShort = to[1] === 7; // King move encoded as -> Rook Square due to how engine generates it?
    // Wait, let's verify how generateMoves does it below.
    // generateMoves: moves.push({ from: [r, c], to: [r, 7], isCastle: true });
    // Yes, 'to' is the ROOK SQUARE [r, 7].

    // Castling Coords
    const kingSrc = from;
    const kingDest = [row, isShort ? 6 : 2]; // g or c
    const rookSrc = [row, isShort ? 7 : 0]; // h or a
    const rookDest = [row, isShort ? 5 : 3]; // f or d

    // Get Pieces
    const kingPiece = BOARD[kingSrc[0]][kingSrc[1]]!;
    const rookPiece = BOARD[rookSrc[0]][rookSrc[1]]!;

    // Indices for Hash
    const kingIdx = getPieceIndex("king", kingPiece.color);
    const rookIdx = getPieceIndex("rook", rookPiece.color);

    // 1. Move King
    BOARD[kingSrc[0]][kingSrc[1]] = null;
    BOARD[kingDest[0]][kingDest[1]] = { ...kingPiece, hasMoved: true };
    updatePieceInList(
      kingPiece.color,
      kingSrc[0],
      kingSrc[1],
      kingDest[0],
      kingDest[1],
    );
    KINGS[kingPiece.color] = [kingDest[0], kingDest[1]];

    // Eval & Hash King
    SCORE -= getPieceValue(kingPiece, kingSrc[0], kingSrc[1]);
    SCORE += getPieceValue(kingPiece, kingDest[0], kingDest[1]);
    HASH ^= ZOBRIST_KEYS.pieces[kingSrc[0]][kingSrc[1]][kingIdx];
    HASH ^= ZOBRIST_KEYS.pieces[kingDest[0]][kingDest[1]][kingIdx];

    // 2. Move Rook
    BOARD[rookSrc[0]][rookSrc[1]] = null;
    BOARD[rookDest[0]][rookDest[1]] = { ...rookPiece, hasMoved: true };
    updatePieceInList(
      rookPiece.color,
      rookSrc[0],
      rookSrc[1],
      rookDest[0],
      rookDest[1],
    );

    // Eval & Hash Rook
    SCORE -= getPieceValue(rookPiece, rookSrc[0], rookSrc[1]);
    SCORE += getPieceValue(rookPiece, rookDest[0], rookDest[1]);
    HASH ^= ZOBRIST_KEYS.pieces[rookSrc[0]][rookSrc[1]][rookIdx];
    HASH ^= ZOBRIST_KEYS.pieces[rookDest[0]][rookDest[1]][rookIdx];

    return;
  }

  // REGULAR MOVE (Capture possible)
  const piece = BOARD[from[0]][from[1]]!;
  const target = BOARD[to[0]][to[1]]; // Potential capture

  const pieceIdx = getPieceIndex(piece.type, piece.color);

  // 1. Remove from Source
  BOARD[from[0]][from[1]] = null;
  // Note: We don't update list yet, simply will update 'from' -> 'to' later
  SCORE -= getPieceValue(piece, from[0], from[1]);
  HASH ^= ZOBRIST_KEYS.pieces[from[0]][from[1]][pieceIdx];

  // 2. Handle Capture
  if (target) {
    move.captured = target;
    const targetIdx = getPieceIndex(target.type, target.color);
    // Remove target from board, eval, hash, and list
    SCORE -= getPieceValue(target, to[0], to[1]);
    HASH ^= ZOBRIST_KEYS.pieces[to[0]][to[1]][targetIdx];
    removePieceFromList(target.color, to[0], to[1]);
  } else {
    move.captured = null;
  }

  // 3. Place at Dest
  BOARD[to[0]][to[1]] = { ...piece, hasMoved: true };
  SCORE += getPieceValue(piece, to[0], to[1]);
  HASH ^= ZOBRIST_KEYS.pieces[to[0]][to[1]][pieceIdx];

  // List Update: Move piece from -> to
  updatePieceInList(piece.color, from[0], from[1], to[0], to[1]);

  // 4. Update King Tracker
  if (piece.type === "king") {
    KINGS[piece.color] = to;
  }
};

const unmakeMove = (move: Move): void => {
  const { from, to, isCastle, captured } = move;

  // Revert Turn
  CURRENT_TURN = CURRENT_TURN === "white" ? "black" : "white";
  HASH ^= ZOBRIST_KEYS.side;

  // The side that moved (whose move we are undoing)
  const color = CURRENT_TURN;

  if (move.promotion) {
    // REVERT PROMOTION
    const piece = BOARD[to[0]][to[1]]!; // This is the Queen (promoted)
    // We want to put back a Pawn at 'from'
    const pawnPiece: Piece = { ...piece, type: "pawn" }; // hasMoved was true, but we are reverting.
    // Actually, does hasMoved matter? makeMove set it to true.
    // Unmake should seemingly revert it, but we don't track history of hasMoved per piece easily without complex stack or Copy-Make.
    // For search, hasMoved irrelevance is mostly fine except for castling rights which handled separately?
    // Castling logic checks specific hardcoded squares anyway.

    const promoteToIdx = getPieceIndex(move.promotion, piece.color);
    const pawnIdx = getPieceIndex("pawn", piece.color);

    // 1. Remove Promoted Piece (Queen) from Dest
    BOARD[to[0]][to[1]] = null;
    SCORE -= getPieceValue(piece, to[0], to[1]);
    HASH ^= ZOBRIST_KEYS.pieces[to[0]][to[1]][promoteToIdx];

    // 2. Place Pawn at Source
    BOARD[from[0]][from[1]] = pawnPiece;
    SCORE += getPieceValue(pawnPiece, from[0], from[1]);
    HASH ^= ZOBRIST_KEYS.pieces[from[0]][from[1]][pawnIdx];

    updatePieceInList(color, to[0], to[1], from[0], from[1]);

    // 3. Restore Captured
    if (captured) {
      BOARD[to[0]][to[1]] = captured;
      SCORE += getPieceValue(captured, to[0], to[1]);
      const capIdx = getPieceIndex(captured.type, captured.color);
      HASH ^= ZOBRIST_KEYS.pieces[to[0]][to[1]][capIdx];
      addPieceToList(captured.color, to[0], to[1]);
    }
    return;
  }

  if (isCastle) {
    const row = from[0];
    const isShort = to[1] === 7;

    // Castling Coords
    const kingSrc = from;
    const kingDest = [row, isShort ? 6 : 2];
    const rookSrc = [row, isShort ? 7 : 0];
    const rookDest = [row, isShort ? 5 : 3];

    // Pieces at Dest are what we need to move back
    const kingPiece = BOARD[kingDest[0]][kingDest[1]]!;
    const rookPiece = BOARD[rookDest[0]][rookDest[1]]!;

    const kingIdx = getPieceIndex("king", color);
    const rookIdx = getPieceIndex("rook", color);

    // 1. Revert King
    BOARD[kingDest[0]][kingDest[1]] = null;
    BOARD[kingSrc[0]][kingSrc[1]] = { ...kingPiece, hasMoved: false };
    updatePieceInList(color, kingDest[0], kingDest[1], kingSrc[0], kingSrc[1]);
    KINGS[color] = [kingSrc[0], kingSrc[1]];

    SCORE -= getPieceValue(kingPiece, kingDest[0], kingDest[1]);
    SCORE += getPieceValue(kingPiece, kingSrc[0], kingSrc[1]);
    HASH ^= ZOBRIST_KEYS.pieces[kingDest[0]][kingDest[1]][kingIdx];
    HASH ^= ZOBRIST_KEYS.pieces[kingSrc[0]][kingSrc[1]][kingIdx];

    // 2. Revert Rook
    BOARD[rookDest[0]][rookDest[1]] = null;
    BOARD[rookSrc[0]][rookSrc[1]] = { ...rookPiece, hasMoved: false };
    updatePieceInList(color, rookDest[0], rookDest[1], rookSrc[0], rookSrc[1]);

    SCORE -= getPieceValue(rookPiece, rookDest[0], rookDest[1]);
    SCORE += getPieceValue(rookPiece, rookSrc[0], rookSrc[1]);
    HASH ^= ZOBRIST_KEYS.pieces[rookDest[0]][rookDest[1]][rookIdx];
    HASH ^= ZOBRIST_KEYS.pieces[rookSrc[0]][rookSrc[1]][rookIdx];

    return;
  }

  // REGULAR UNMAKE
  const piece = BOARD[to[0]][to[1]]!;
  const pieceIdx = getPieceIndex(piece.type, color);

  // 1. Remove from Dest
  BOARD[to[0]][to[1]] = null;
  SCORE -= getPieceValue(piece, to[0], to[1]);
  HASH ^= ZOBRIST_KEYS.pieces[to[0]][to[1]][pieceIdx];

  // 2. Place at Source
  BOARD[from[0]][from[1]] = piece; // Ideally restore hasMoved from a stack, but simplistic 'false' or keeping object ref might be unsafe if mutation happens deep.
  // We restore the piece object assuming its properties (type, color) are correct.
  // 'hasMoved' will be true on the object because we modified it in makeMove.
  // For search correctness, we usually don't strictly care about hasMoved inside deep search unless we castling recursively.
  // But we reset castling checks via checking global state or just assume we don't castle FROM deep search nodes unless rights preserved.
  // For now this is fine.
  SCORE += getPieceValue(piece, from[0], from[1]);
  HASH ^= ZOBRIST_KEYS.pieces[from[0]][from[1]][pieceIdx];

  updatePieceInList(color, to[0], to[1], from[0], from[1]); // Move back

  // 3. Restore Captured
  if (captured) {
    BOARD[to[0]][to[1]] = captured;
    SCORE += getPieceValue(captured, to[0], to[1]);
    const capIdx = getPieceIndex(captured.type, captured.color);
    HASH ^= ZOBRIST_KEYS.pieces[to[0]][to[1]][capIdx];
    addPieceToList(captured.color, to[0], to[1]);
  }

  if (piece.type === "king") KINGS[color] = from;
};

// --- Move Generation (Piece List Optimized) ---

const generateMoves = (onlyCaptures: boolean = false): Move[] => {
  const moves: Move[] = [];
  const color = CURRENT_TURN;
  const list = color === "white" ? WHITE_PIECES : BLACK_PIECES;

  for (const sq of list) {
    const r = Math.floor(sq / 8);
    const c = sq % 8;
    const piece = BOARD[r][c];
    if (!piece) continue; // Should not happen if lists are synced

    // Use pseudo-legal moves helper, passing mutable BOARD wrapped in a proxy state
    // We use the initial history for En Passant checks.
    const proxyState = {
      board: BOARD,
      history: HISTORY_LIST,
      currentTurn: CURRENT_TURN,
    } as GameState;

    // Use pseudo-legal moves for speed (includes checks for own piece capture, but not King Safety)
    const targets = getPseudoLegalMoves(proxyState, [r, c]);

    for (const t of targets) {
      const targetPiece = BOARD[t[0]][t[1]];

      // Check for promotion
      // White pawn moving to row 0? No, White starts at 6, moves to 0?
      // Let's check gameLogic:
      // case "pawn": direction = color === "white" ? -1 : 1;
      // White pawns are at row 6, move to 5, 4... 0. Yes.
      // Black pawns are at row 1, move to 2, 3... 7. Yes.
      let promotion: Piece["type"] | undefined = undefined;
      if (piece.type === "pawn") {
        if (piece.color === "white" && t[0] === 0) promotion = "queen";
        if (piece.color === "black" && t[0] === 7) promotion = "queen";
      }

      if (onlyCaptures) {
        if (targetPiece || promotion)
          moves.push({ from: [r, c], to: t, promotion });
      } else {
        moves.push({ from: [r, c], to: t, promotion });
      }
    }

    // Castling (Manual Add)
    if (!onlyCaptures && piece.type === "king") {
      if (isCastlingAvailable(BOARD, [r, c], [r, 7]))
        moves.push({ from: [r, c], to: [r, 7], isCastle: true });
      if (isCastlingAvailable(BOARD, [r, c], [r, 0]))
        moves.push({ from: [r, c], to: [r, 0], isCastle: true });
    }
  }
  return moves;
};

// --- Alpha Beta Search ---

const alphabeta = (
  depth: number,
  alpha: number,
  beta: number,
  isRoot: boolean = false,
): number => {
  NODES++;

  // Time Check (Every 2048 nodes)
  if ((NODES & 2047) === 0) {
    if (performance.now() - START_TIME > TIME_LIMIT) {
      ABORT = true;
    }
  }
  if (ABORT) return 0;

  const isMaximizing = CURRENT_TURN === "white";

  // 1. TT Lookup
  const ttEntry = TT.get(HASH);
  if (ttEntry && ttEntry.depth >= depth && !isRoot) {
    if (ttEntry.flag === 0) return ttEntry.score; // EXACT
    if (ttEntry.flag === 1 && ttEntry.score >= beta) return ttEntry.score; // LOWERBOUND
    if (ttEntry.flag === 2 && ttEntry.score <= alpha) return ttEntry.score; // UPPERBOUND

    // Refine bounds
    if (ttEntry.flag === 1) alpha = Math.max(alpha, ttEntry.score);
    else if (ttEntry.flag === 2) beta = Math.min(beta, ttEntry.score);

    if (alpha >= beta) return ttEntry.score;
  }

  // 2. Base Case / Quiescence
  if (depth <= 0) {
    // Limit Quiescence depth to 4
    return quiescence(alpha, beta, 4);
  }

  // 3. Generate Moves
  const moves = generateMoves(false);

  // Checkmate / Stalemate
  if (moves.length === 0) {
    const inCheck = isCheck(BOARD, CURRENT_TURN, KINGS[CURRENT_TURN]);
    if (inCheck) {
      return isMaximizing ? -20000 - depth : 20000 + depth;
    }
    return 0; // Stalemate
  }

  // 4. Move Ordering
  const moveScores = moves.map((m) => {
    if (
      ttEntry &&
      ttEntry.bestMove &&
      m.from[0] === ttEntry.bestMove.from[0] &&
      m.from[1] === ttEntry.bestMove.from[1] &&
      m.to[0] === ttEntry.bestMove.to[0] &&
      m.to[1] === ttEntry.bestMove.to[1]
    ) {
      return 200000;
    }
    const target = BOARD[m.to[0]][m.to[1]];
    if (target) {
      return (
        1000 +
        PIECE_VALUES[target.type] -
        PIECE_VALUES[BOARD[m.from[0]][m.from[1]]!.type] / 100
      );
    }
    if (
      KILLER_MOVES[depth] &&
      KILLER_MOVES[depth].some(
        (k) =>
          k &&
          k.from[0] === m.from[0] &&
          k.from[1] === m.from[1] &&
          k.to[0] === m.to[0],
      )
    ) {
      return 500;
    }
    return HISTORY[m.from[0] * 8 + m.from[1]][m.to[0] * 8 + m.to[1]];
  });

  const sortedMoves = moves
    .map((m, i) => ({ m, s: moveScores[i] }))
    .sort((a, b) => b.s - a.s)
    .map((o) => o.m);

  let bestMove: Move | undefined = undefined;
  let value = isMaximizing ? -Infinity : Infinity;
  let bound: 0 | 1 | 2 = isMaximizing ? 2 : 1; // Default Upper/Lower

  if (isMaximizing) {
    for (const move of sortedMoves) {
      makeMove(move);

      // LAZY VALIDATION: Check if we moved into check
      if (isCheck(BOARD, "white", KINGS.white)) {
        unmakeMove(move);
        continue;
      }

      const val = alphabeta(depth - 1, alpha, beta);
      unmakeMove(move);

      if (ABORT) return 0;

      if (val > value) {
        value = val;
        bestMove = move;
        if (value > alpha) {
          alpha = value;
          bound = 0; // Exact
        }
      }
      if (value >= beta) {
        value = beta;
        bound = 1; // LowerBound
        if (!BOARD[move.to[0]][move.to[1]]) {
          storeKiller(depth, move);
          HISTORY[move.from[0] * 8 + move.from[1]][
            move.to[0] * 8 + move.to[1]
          ] += depth * depth;
        }
        break;
      }
    }
  } else {
    for (const move of sortedMoves) {
      makeMove(move);

      // LAZY VALIDATION: Check if we moved into check
      if (isCheck(BOARD, "black", KINGS.black)) {
        unmakeMove(move);
        continue;
      }

      const val = alphabeta(depth - 1, alpha, beta);
      unmakeMove(move);

      if (ABORT) return 0;

      if (val < value) {
        value = val;
        bestMove = move;
        if (value < beta) {
          beta = value;
          bound = 0;
        }
      }
      if (value <= alpha) {
        value = alpha;
        bound = 2; // UpperBound
        if (!BOARD[move.to[0]][move.to[1]]) {
          storeKiller(depth, move);
          HISTORY[move.from[0] * 8 + move.from[1]][
            move.to[0] * 8 + move.to[1]
          ] += depth * depth;
        }
        break;
      }
    }
  }

  if (!ABORT) {
    if (TT.size > MAX_TT_SIZE) TT.clear();
    TT.set(HASH, { depth, score: value, flag: bound, bestMove });
  }

  return value;
};

const quiescence = (alpha: number, beta: number, qDepth: number): number => {
  NODES++;
  if ((NODES & 2047) === 0) {
    if (performance.now() - START_TIME > TIME_LIMIT) ABORT = true;
  }
  if (ABORT) return 0;

  const isMaximizing = CURRENT_TURN === "white";
  const standPat = SCORE;

  if (isMaximizing) {
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
  } else {
    if (standPat <= alpha) return alpha;
    if (standPat < beta) beta = standPat;
  }

  // Quiescence Depth Limit
  if (qDepth <= 0) return standPat;

  const moves = generateMoves(true);
  moves.sort((a, b) => {
    const tA = BOARD[a.to[0]][a.to[1]];
    const tB = BOARD[b.to[0]][b.to[1]];
    const valA = tA ? PIECE_VALUES[tA.type] : 0;
    const valB = tB ? PIECE_VALUES[tB.type] : 0;
    return valB - valA;
  });

  for (const move of moves) {
    makeMove(move);

    // LAZY VALIDATION
    if (
      isCheck(
        BOARD,
        isMaximizing ? "white" : "black",
        KINGS[isMaximizing ? "white" : "black"],
      )
    ) {
      unmakeMove(move);
      continue;
    }

    const score = quiescence(alpha, beta, qDepth - 1);
    unmakeMove(move);

    if (ABORT) return 0;

    if (isMaximizing) {
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    } else {
      if (score <= alpha) return alpha;
      if (score < beta) beta = score;
    }
  }

  return isMaximizing ? alpha : beta;
};

const storeKiller = (depth: number, move: Move) => {
  if (depth >= 20) return;
  KILLER_MOVES[depth][1] = KILLER_MOVES[depth][0];
  KILLER_MOVES[depth][0] = move;
};

// --- Main Export ---

export const getBestMove = (
  gameState: GameState,
  difficulty: Difficulty,
): Move | null => {
  // 1. Opening Book
  if (gameState.history.length < 12) {
    const bookMove = getOpeningMove(gameState.history, gameState.currentTurn);
    if (bookMove) return bookMove;
  }

  // 2. Initialize Search Context
  // Deep clone board to Mutable BOARD
  BOARD = gameState.board.map((r) => r.map((p) => (p ? { ...p } : null)));
  CURRENT_TURN = gameState.currentTurn;
  KINGS = { ...gameState.kingsPositions };
  SCORE = evaluateFull(BOARD);
  SCORE = evaluateFull(BOARD);
  HASH = computeHash(BOARD, CURRENT_TURN);
  HISTORY_LIST = [...gameState.history];

  // Initialize Piece Lists
  WHITE_PIECES = [];
  BLACK_PIECES = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = BOARD[r][c];
      if (p) addPieceToList(p.color, r, c);
    }
  }

  // Stats Reset
  NODES = 0;
  ABORT = false;
  START_TIME = performance.now();
  // Time Limits
  switch (difficulty) {
    case "monkey":
      TIME_LIMIT = 50;
      break;
    case "easy":
      TIME_LIMIT = 400;
      break;
    case "medium":
      TIME_LIMIT = 1000;
      break;
    case "hard":
      TIME_LIMIT = 3000;
      break;
  }

  // 3. Iterative Deepening
  let bestMove: Move | null = null;
  let maxDepth = difficulty === "hard" ? 8 : difficulty === "medium" ? 5 : 3;
  if (difficulty === "monkey" || difficulty === "easy") maxDepth = 2; // Random fallback?

  // Randomness for low levels
  if (difficulty === "monkey") {
    const m = generateMoves(false);
    return m[Math.floor(Math.random() * m.length)];
  }

  for (let d = 1; d <= maxDepth; d++) {
    alphabeta(d, -Infinity, Infinity, true);

    if (ABORT) {
      console.log(`Aborted at depth ${d}`);
      break;
    }

    const entry = TT.get(HASH);
    if (entry && entry.bestMove) {
      bestMove = entry.bestMove;
      // console.log(`Info: Depth ${d} Score ${entry.score} Nodes ${NODES}`);
    }
  }

  return bestMove;
};
