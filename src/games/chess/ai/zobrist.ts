import { Piece } from "../gameLogic";

// Zobrist Hashing Initializer
// We need random 64-bit numbers for each [pieceType][color][square]
// + side to move
// + castling rights (simplified: assumed from king/rook positions in standard hash, but strictly need rights)
// + en passant (omitted for now as gameLogic doesn't fully expose it yet?)

// In JS, we use BigInt for 64-bit integers.

type ZobristTable = {
  // [row][col][pieceKey]
  // pieceKey: 0-5 (pawn...king) + 6 (color 0/1) -> 12 indices?
  // Let's map piece to index: 0-5 White, 6-11 Black.
  pieces: bigint[][][]; // [8][8][12]
  side: bigint; // XOR if Black to move
};

export const PIECE_INDEX: Record<string, number> = {
  pawn: 0,
  knight: 1,
  bishop: 2,
  rook: 3,
  queen: 4,
  king: 5,
};

export const getPieceIndex = (type: string, color: string) => {
  let idx = PIECE_INDEX[type];
  if (color === "black") idx += 6;
  return idx;
};

const initZobrist = (): ZobristTable => {
  const pieces: bigint[][][] = []; // 8x8x12

  // Random BigInt generator
  const rand64 = () => {
    // 64-bit random: combine two 32-bit randoms
    const h = BigInt(Math.floor(Math.random() * 0xffffffff));
    const l = BigInt(Math.floor(Math.random() * 0xffffffff));
    return (h << 32n) | l;
  };

  for (let r = 0; r < 8; r++) {
    const rowArr: bigint[][] = [];
    for (let c = 0; c < 8; c++) {
      const pieceArr: bigint[] = [];
      for (let k = 0; k < 12; k++) {
        pieceArr.push(rand64());
      }
      rowArr.push(pieceArr);
    }
    pieces.push(rowArr);
  }

  return {
    pieces,
    side: rand64(),
  };
};

export const ZOBRIST_KEYS = initZobrist();

export const computeHash = (
  board: (Piece | null)[][],
  currentTurn: Piece["color"],
): bigint => {
  let h = 0n;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) {
        let idx = PIECE_INDEX[p.type];
        if (p.color === "black") {
          idx += 6;
        }
        h ^= ZOBRIST_KEYS.pieces[r][c][idx];
      }
    }
  }

  if (currentTurn === "black") {
    h ^= ZOBRIST_KEYS.side;
  }

  return h;
};
