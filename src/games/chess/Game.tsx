import React from "react";
import { useGame } from "./useGame";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Pawn from "../../assets/icons/chess/pawn.svg?react";
import Rook from "../../assets/icons/chess/rook.svg?react";
import Knight from "../../assets/icons/chess/knight.svg?react";
import Bishop from "../../assets/icons/chess/bishop.svg?react";
import Queen from "../../assets/icons/chess/queen.svg?react";
import King from "../../assets/icons/chess/king.svg?react";

import { Piece } from "./gameLogic";
import Timer from "../../components/Timer";

const pieceComponents: Record<
  string,
  React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string | undefined }
  >
> = {
  pawn: Pawn,
  rook: Rook,
  knight: Knight,
  bishop: Bishop,
  queen: Queen,
  king: King,
};
// ... rest of the file ... in next chunk or handled carefully

const Game = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { onlineGameId } = useParams();

  const locState = (location.state || {}) as any;

  const gameMode = locState.gameMode || (onlineGameId ? "online" : "local");
  // const isOnline = gameMode === "online";
  const difficulty = locState.difficulty || 1;

  const { state, onCellClick, onTimeUpdate, onTimeout } = useGame(
    gameMode,
    onlineGameId,
  );

  // Drag and Drop State
  const [dragState, setDragState] = React.useState<{
    isDragging: boolean;
    piece: Piece;
    origin: { r: number; c: number };
    startRect: DOMRect;
    currentPos: { x: number; y: number };
    offset: { x: number; y: number };
    isReturning: boolean;
  } | null>(null);

  const handleMouseDown = (
    e: React.MouseEvent,
    r: number,
    c: number,
    cell: any,
  ) => {
    if (!cell) return;

    // Prevent default to avoid native drag behavior
    e.preventDefault();

    // Check if this is a click on a Valid Move target (Capture)
    const isTarget = state.availableMoves.some(
      ([mr, mc]) => mr === r && mc === c,
    );

    if (isTarget) {
      onCellClick(r, c);
      return;
    }

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    // Calculate offset to keep piece under cursor at the same relative position
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    setDragState({
      isDragging: true,
      piece: cell,
      origin: { r, c },
      startRect: rect,
      currentPos: { x: rect.left, y: rect.top },
      offset: { x: offsetX, y: offsetY },
      isReturning: false,
    });

    // Select the cell immediately to show available moves
    onCellClick(r, c);
  };

  React.useEffect(() => {
    if (!dragState || dragState.isReturning) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDragState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentPos: {
            x: e.clientX - prev.offset.x,
            y: e.clientY - prev.offset.y,
          },
        };
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      // Find the element under the cursor
      // We need to temporarily hide the dragged element or ensure pointer-events: none is set (it is in CSS)
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const cellElement = elements.find((el) => el.classList.contains("cell"));

      let validMoveFound = false;

      if (cellElement) {
        const targetR = parseInt(cellElement.getAttribute("data-row") || "-1");
        const targetC = parseInt(cellElement.getAttribute("data-col") || "-1");

        // Check if it's a valid move
        const isAvailable = state.availableMoves.some(
          ([mR, mC]) => mR === targetR && mC === targetC,
        );

        if (targetR !== -1 && targetC !== -1) {
          if (
            targetR === dragState.origin.r &&
            targetC === dragState.origin.c
          ) {
            // Dropped on same cell - just reset (already selected logic handled by mousedown)
            setDragState(null);
            validMoveFound = true;
          } else if (isAvailable) {
            // Execute move
            onCellClick(targetR, targetC);
            setDragState(null);
            validMoveFound = true;
          }
        }
      }

      if (!validMoveFound) {
        // Trigger return animation
        setDragState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            isReturning: true,
            currentPos: { x: prev.startRect.left, y: prev.startRect.top },
          };
        });

        // Clear state after animation
        setTimeout(() => {
          setDragState(null);
        }, 200); // 200ms matches CSS transition
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, onCellClick, state.availableMoves]);

  // Disable context menu
  React.useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  console.log(state);
  return (
    <section className="chess">
      <div className="top-part">
        <div className="timer">
          <Timer
            startTime={state.playerInfo.white.remainingTime}
            timerName={`chess_white_${onlineGameId || "local"}`}
            onTimeUpdate={(t) => onTimeUpdate("white", t)}
            pause={state.currentTurn !== "white" || !!state.winner}
            onComplete={() => onTimeout("white")}
            key={`white_${onlineGameId || "local"}`}
            isServerControlled={!!onlineGameId}
            syncTime={
              onlineGameId ? state.playerInfo.white.remainingTime : undefined
            }
          />
          <span className="current-player">
            {state.winner ? `Winner: ${state.winner}` : state.currentTurn}
          </span>
          <Timer
            startTime={state.playerInfo.black.remainingTime}
            timerName={`chess_black_${onlineGameId || "local"}`}
            onTimeUpdate={(t) => onTimeUpdate("black", t)}
            pause={state.currentTurn !== "black" || !!state.winner}
            onComplete={() => onTimeout("black")}
            key={`black_${onlineGameId || "local"}`}
            isServerControlled={!!onlineGameId}
            syncTime={
              onlineGameId ? state.playerInfo.black.remainingTime : undefined
            }
          />
        </div>
      </div>
      <div className="board">
        {state.board.map((row, r) => {
          return (
            <div className="row" key={r}>
              {row.map((cell, c) => {
                const isDraggingSource =
                  dragState?.origin.r === r && dragState?.origin.c === c;

                return (
                  <div
                    key={r + "_" + c}
                    data-row={r}
                    data-col={c}
                    onMouseDown={(e) => handleMouseDown(e, r, c, cell)}
                    onClick={() => {
                      // If we are just clicking (not dragging), the onMouseDown handles selection.
                      // But if we want to move TO an empty square, onMouseDown won't trigger on empty square?
                      // Wait, onMouseDown is on the DIV. logic above says `if (!cell) return`.
                      // So for empty squares we still need onClick to move THERE.
                      // But if we drag TO an empty square, mouseUp logic handles it.
                      // If we click an empty square to move there (2-click method), we need this onClick.
                      if (!dragState) {
                        onCellClick(r, c);
                      }
                    }}
                    className={`cell ${(r + c) % 2 === 0 ? "white" : "black"} ${
                      (state.history[state.history.length - 1]?.from[0] === r &&
                        state.history[state.history.length - 1]?.from[1] ===
                          c) ||
                      (state.history[state.history.length - 1]?.to[0] === r &&
                        state.history[state.history.length - 1]?.to[1] === c)
                        ? "last-move"
                        : ""
                    } ${
                      state.selectedCell?.[0] === r &&
                      state.selectedCell?.[1] === c
                        ? "selected"
                        : ""
                    }
                      ${cell?.type === "king" && state.sideInCheck == cell?.color ? "in-check" : ""}`}
                  >
                    {state.availableMoves.some(
                      ([moveR, moveC]) => moveR === r && moveC === c,
                    ) && <div className="available-move" />}
                    {(() => {
                      if (!cell) return null;
                      const PieceComponent =
                        pieceComponents[cell.type as Piece["type"]];
                      return PieceComponent ? (
                        <PieceComponent
                          className={`piece ${cell.color} ${isDraggingSource ? "dragging-hidden" : ""}`}
                        />
                      ) : null;
                    })()}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {dragState && (
        <div
          className={`dragged-piece ${dragState.isReturning ? "returning" : ""}`}
          style={{
            top: dragState.currentPos.y,
            left: dragState.currentPos.x,
          }}
        >
          {(() => {
            const PieceComponent =
              pieceComponents[dragState.piece.type as Piece["type"]];
            return PieceComponent ? (
              <PieceComponent className={`piece ${dragState.piece.color}`} />
            ) : null;
          })()}
        </div>
      )}
    </section>
  );
};

export default Game;
