import React from "react";
import { useBackgroundChess } from "./useBackgroundChess.ts";
import Pawn from "../../../assets/icons/chess/pawn.svg?react";
import Rook from "../../../assets/icons/chess/rook.svg?react";
import Knight from "../../../assets/icons/chess/knight.svg?react";
import Bishop from "../../../assets/icons/chess/bishop.svg?react";
import Queen from "../../../assets/icons/chess/queen.svg?react";
import King from "../../../assets/icons/chess/king.svg?react";
import { Piece } from "../../../games/chess/gameLogic";


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

const PieceDisplay = ({
  type,
  color,
  moveOffset,
  className = "",
}: {
  type: Piece["type"];
  color: Piece["color"];
  moveOffset?: { dx: number; dy: number; duration: number };
  className?: string;
}) => {
  const SvgComponent = pieceComponents[type];
  const style = moveOffset
    ? ({
        "--dx": `${moveOffset.dx * 100}%`,
        "--dy": `${moveOffset.dy * 100}%`,
        "--duration": `${moveOffset.duration}s`,
      } as React.CSSProperties)
    : {};

  return SvgComponent ? (
    <SvgComponent
      className={`piece ${color} ${className} ${moveOffset ? "moving" : ""}`}
      style={style}
    />
  ) : null;
};

export const BackgroundChess = () => {
  const { state } = useBackgroundChess();
  const lastMove = state.history[state.history.length - 1];
  const boardRef = React.useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = React.useState(80);

  React.useEffect(() => {
    const updateSize = () => {
      if (boardRef.current) {
        const firstCell = boardRef.current.querySelector(".cell");
        if (firstCell) {
          setCellSize(firstCell.getBoundingClientRect().width);
        }
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const sizeMultiplier = cellSize / 80;

  return (
    <div className="background-chess">
      <div className="board" ref={boardRef}>
        {state.board.map((row: (Piece | null)[], r: number) => (
          <div className="row" key={r}>
            {row.map((cell: Piece | null, c: number) => {
              const isLastMoveTo = lastMove?.to[0] === r && lastMove?.to[1] === c;
              let moveOffset;
              if (isLastMoveTo) {
                const dx = lastMove!.from[1] - lastMove!.to[1];
                const dy = lastMove!.from[0] - lastMove!.to[0];
                const distance = Math.sqrt(dx * dx + dy * dy);
                moveOffset = {
                  dx,
                  dy,
                  duration: (distance / 11) * sizeMultiplier,
                };
              }

              return (
                <div
                  key={r + "_" + c}
                  className={`cell ${(r + c) % 2 === 0 ? "white" : "black"} ${
                    (lastMove?.from[0] === r && lastMove?.from[1] === c) ||
                    (lastMove?.to[0] === r && lastMove?.to[1] === c)
                      ? "last-move"
                      : ""
                  }`}
                >
                  {cell && (
                    <PieceDisplay
                      key={`${r}-${c}-${state.history.length}`}
                      type={cell.type}
                      color={cell.color}
                      moveOffset={moveOffset}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
