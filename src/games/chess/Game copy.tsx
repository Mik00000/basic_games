import React from "react";
import { useGame } from "./useGame";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Pawn from "../../assets/icons/chess/pawn.svg?react";
import Rook from "../../assets/icons/chess/rook.svg?react";
import Knight from "../../assets/icons/chess/knight.svg?react";
import Bishop from "../../assets/icons/chess/bishop.svg?react";
import Queen from "../../assets/icons/chess/queen.svg?react";
import King from "../../assets/icons/chess/king.svg?react";

const pieceComponents = {
  pawn: Pawn,
  rook: Rook,
  knight: Knight,
  bishop: Bishop,
  queen: Queen,
  king: King,
};

const Game = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { onlineGameId } = useParams();

  const locState = (location.state || {}) as any;

  const gameMode = locState.gameMode || (onlineGameId ? "online" : "local");
  // const isOnline = gameMode === "online";
  const difficulty = locState.difficulty || 1;

  const { state, onCellClick, dispatch } = useGame(gameMode, onlineGameId);
  const [dragOverCell, setDragOverCell] = React.useState<
    [number, number] | null
  >(null);
  const [isDragging, setIsDragging] = React.useState<[number, number] | null>(
    null
  );

  const handleDragStart = (r: number, c: number) => {
    setIsDragging([r, c]);
    dispatch({ type: "SELECT_CELL", cell: [r, c] });
  };

  const handleDragEnd = () => {
    setIsDragging(null);
  };

  const handleDrop = (e: React.DragEvent, r: number, c: number) => {
    e.preventDefault();
    setDragOverCell(null);
    setIsDragging(null);
    if (state.selectedCell) {
      dispatch({
        type: "MAKE_MOVE",
        from: state.selectedCell,
        to: [r, c],
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, r: number, c: number) => {
    e.preventDefault();
    setDragOverCell([r, c]);
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  console.log(state);
  return (
    <div className="chess">
      <div className="board">
        {state.board.map((row, r) => {
          return (
            <div className="row" key={r}>
              {row.map((cell, c) => {
                const isSelected =
                  state.selectedCell?.[0] === r &&
                  state.selectedCell?.[1] === c;
                const isDragOver =
                  dragOverCell?.[0] === r && dragOverCell?.[1] === c;
                const isLastMove =
                  (state.lastMove?.from[0] === r &&
                    state.lastMove?.from[1] === c) ||
                  (state.lastMove?.to[0] === r && state.lastMove?.to[1] === c);
                const isAvailable = state.availableMoves.some(
                  ([moveR, moveC]) => moveR === r && moveC === c
                );

                return (
                  <div
                    key={r + "_" + c}
                    onClick={() => onCellClick(r, c)}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, r, c)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, r, c)}
                    className={`cell ${(r + c) % 2 === 0 ? "white" : "black"} ${
                      isLastMove ? "last-move" : ""
                    } ${isSelected ? "selected" : ""} ${
                      isDragOver ? "drag-over" : ""
                    }`}
                  >
                    {isAvailable && <div className="available-move" />}
                    {(() => {
                      if (!cell) return null;
                      const PieceComponent = pieceComponents[cell.type];
                      return PieceComponent ? (
                        <div
                          draggable={cell.color === state.currentTurn}
                          onDragStart={() => handleDragStart(r, c)}
                          onDragEnd={handleDragEnd}
                          className={`piece-container ${
                            isDragging?.[0] === r && isDragging?.[1] === c
                              ? "dragging"
                              : ""
                          }`}
                        >
                          <PieceComponent className={`piece ${cell.color}`} />
                        </div>
                      ) : null;
                    })()}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Game;
