import React from "react";

interface GameModeSelectorProps {
  currentMode: string;
  onModeChange: (mode: string) => void;
  className?: string;
}

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  currentMode,
  onModeChange,
  className = "",
}) => {
  return (
    <div className={`menu-section ${className}`}>
      <h2>Game Mode</h2>
      <div className="game-modes">
        <button
          className={currentMode === "bot" ? "active" : ""}
          onClick={() => onModeChange("bot")}
        >
          Play with Bot
        </button>
        <button
          className={currentMode === "local" ? "active" : ""}
          onClick={() => onModeChange("local")}
        >
          Two Players (Same Device)
        </button>
        <button
          className={currentMode === "online" ? "active" : ""}
          onClick={() => onModeChange("online")}
        >
          Two Players (Different Devices)
        </button>
      </div>
    </div>
  );
};
