import React, { useEffect, useState } from "react";
import ShowTextAfterTime from "../../common/ShowTextAfterTime";

interface Player {
  name: string;
  color: string;
}

interface FirstPlayerSelectorProps {
  players: Player[];
  onComplete: (winnerIndex: number) => void;
  className?: string;
  duration?: number;
  targetWinnerIndex?: number;
  showNames?: boolean;
}

export const FirstPlayerSelector: React.FC<FirstPlayerSelectorProps> = ({
  players,
  onComplete,
  className = "",
  duration = 5000,
  targetWinnerIndex,
  showNames = true,
}) => {
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);

  useEffect(() => {
    // Only support 2 players for coin toss animation currently
    if (players.length < 2) {
      console.warn("FirstPlayerSelector requires at least 2 players");
      return;
    }

    const t1 = setTimeout(() => {
      let idx;
      if (typeof targetWinnerIndex === "number") {
        idx = targetWinnerIndex;
      } else {
        idx = Math.floor(Math.random() * 2);
      }
      setWinnerIndex(idx);
    }, 100);

    return () => clearTimeout(t1);
  }, [players.length, targetWinnerIndex]); // Depend on length mainly to avoid re-run if object refs change

  useEffect(() => {
    if (winnerIndex === null) return;

    const t2 = setTimeout(() => {
      onComplete(winnerIndex);
    }, duration);

    return () => clearTimeout(t2);
  }, [winnerIndex, duration, onComplete]);

  // CSS variables for dynamic colors
  const cssVars = {
    "--fps-player-color-0": players[0]?.color || "#ff0000",
    "--fps-player-color-1": players[1]?.color || "#0000ff",
  } as React.CSSProperties;

  const winnerName = winnerIndex !== null ? players[winnerIndex]?.name : "";

  return (
    <div
      className={`first-player-selector-overlay ${className}`}
      style={cssVars}
    >
      <div className="pop-up">
        <div className="pick-first-player">
          <h1 className="heading">
            {winnerIndex !== null && showNames && (
              <ShowTextAfterTime text={winnerName} time={duration * 0.8} />
            )}
          </h1>
          <div className="coin-container">
            <div
              className={`coin ${
                winnerIndex === 0 ? "heads" : winnerIndex === 1 ? "tails" : ""
              }`}
            >
              <div className="side-a"></div>
              <div className="side-b"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
