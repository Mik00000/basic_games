import { Piece } from "../gameLogic";

type Move = {
  from: [number, number];
  to: [number, number];
  isCastle?: boolean;
};

// Convert [row, col] to algebraic notation (e.g., [6, 4] -> "e2")
// Row 0 is Rank 8, Row 7 is Rank 1.
// Col 0 is 'a', Col 7 is 'h'.
const toAlgebraic = (pos: [number, number]): string => {
  const [r, c] = pos;
  const rank = 8 - r;
  const file = String.fromCharCode(97 + c);
  return `${file}${rank}`;
};

const fromAlgebraic = (square: string): [number, number] => {
  const c = square.charCodeAt(0) - 97;
  const r = 8 - parseInt(square[1], 10);
  return [r, c];
};

// Convert {from, to} object to "e2e4" string
const moveToString = (move: {
  from: [number, number];
  to: [number, number];
}): string => {
  return `${toAlgebraic(move.from)}${toAlgebraic(move.to)}`;
};

// Map of History String -> List of Suggested Moves (algebraic strings)
// History String is comma-separated list of moves: "e2e4,e7e5,g1f3"
const OPENING_BOOK: Record<string, string[]> = {
  // --- WHITE OPENINGS (Root) ---
  "": ["e2e4", "d2d4", "g1f3", "c2c4"],

  // 1. e4
  e2e4: ["e7e5", "c7c5", "e7e6", "c7c6", "d7d6"], // Responses to e4

  // 1. e4 e5
  "e2e4,e7e5": ["g1f3", "f1c4"], // King's Knight or Bishop Opening

  // 1. e4 c5 (Sicilian)
  "e2e4,c7c5": ["g1f3"],

  // 1. e4 e6 (French)
  "e2e4,e7e6": ["d2d4"],

  // 1. d4
  d2d4: ["d7d5", "g8f6"],

  // --- BLACK RESPONSES (derived from above but explicit for lookup) ---

  // 1. e4 e5 2. Nf3
  "e2e4,e7e5,g1f3": ["b8c6", "g8f6", "d7d6"],

  // 1. e4 e5 2. Bc4
  "e2e4,e7e5,f1c4": ["g8f6", "f8c5"],

  // Ruy Lopez: 1. e4 e5 2. Nf3 Nc6 3. Bb5
  "e2e4,e7e5,g1f3,b8c6": ["f1b5", "f1c4", "d2d4"],

  // Italian Game: 1. e4 e5 2. Nf3 Nc6 3. Bc4
  "e2e4,e7e5,g1f3,b8c6,f1c4": ["f8c5", "g8f6"],

  // Queen's Gambit: 1. d4 d5 2. c4
  "d2d4,d7d5": ["c2c4", "g1f3", "e2e4"],

  // Queen's Gambit Declined
  "d2d4,d7d5,c2c4": ["e7e6", "c7c6"],
};

export const getOpeningMove = (
  history: { from: [number, number]; to: [number, number] }[],
  currentTurn: Piece["color"],
): Move | null => {
  // Construct the history string
  const historyStr = history.map(moveToString).join(",");

  const possibleMoves = OPENING_BOOK[historyStr];

  if (!possibleMoves || possibleMoves.length === 0) {
    return null;
  }

  // Pick a random move from the book
  const randomMoveStr =
    possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

  // Parse back to Move object
  // Note: We need to set isCastle if it implies castling, but standard openings usually don't reach specific castling moves instantly.
  // Standard algebraic moves like "e1g1" (White Short Castle) can be parsed.
  // Castle logic in botBrains expects { isCastle: true } if it's a castle move?
  // Actually botBrains handles `from` and `to` and checks logic.
  // But strictly `botBrains`'s `getAllMoves` returns `isCastle` flag.
  // If we return a raw move here, we should check if it's castling.
  // For simplicity, strict opening book usually only covers the first 5-10 moves, rarely castling triggers directly unless strict line.

  const from = fromAlgebraic(randomMoveStr.slice(0, 2));
  const to = fromAlgebraic(randomMoveStr.slice(2, 4));

  // Determine if it is a castle move (King moving 2 squares)
  // White King start: e1 (7,4). Black King start: e8 (0,4).
  let isCastle = false;
  // White Short: e1g1 (7,4 -> 7,6)
  if (
    currentTurn === "white" &&
    from[0] === 7 &&
    from[1] === 4 &&
    to[0] === 7 &&
    (to[1] === 6 || to[1] === 2)
  ) {
    isCastle = true;
    // Note: bot logic for castle usually wants 'to' to be the Rook's square for `isCastlingAvailable` checks?
    // Wait, `handleCastling` in `gameLogic.ts`:
    // "if (to[1] === 7) ... isShortCastle"
    // "if (to[1] === 0) ... isLongCastle"
    // So the 'to' MUST be the Rook's position (col 0 or 7).
    // Standard UCI notation "e1g1" means king moves to g1.
    // If we return [7,6] (g1), gameLogic might treat it as regular King move?
    // `isValidMove` for King checks `abs(dCol) <= 1`. So e1 -> g1 is invalid by `isValidMove`.
    // It MUST be handled via `isCastle`.
    // BUT `botBrains` generates specific castle moves:
    // `moves.push({ from, to: [row, 7], isCastle: true });`
    // So if the opening book says "e1g1" (King to G1), we must translate that to "King captures Rook at H1" logic?
    // No, `handleCastling` expects `to` to be the Rook's square.
    // So if book says "e1g1", we must translate `to` to `h1` (col 7).
    if (to[1] === 6) to[1] = 7; // Short Castle fix
    if (to[1] === 2) to[1] = 0; // Long Castle fix
  }
  // Black Short: e8g8 (0,4 -> 0,6)
  if (
    currentTurn === "black" &&
    from[0] === 0 &&
    from[1] === 4 &&
    to[0] === 0 &&
    (to[1] === 6 || to[1] === 2)
  ) {
    isCastle = true;
    if (to[1] === 6) to[1] = 7;
    if (to[1] === 2) to[1] = 0;
  }

  return { from, to, isCastle };
};
