import React from "react";

interface OnlineRoomSetupProps {
  mode: "create" | "join";
  onModeChange: (mode: "create" | "join") => void;
  roomId?: string;
  onRoomIdChange?: (id: string) => void;
  className?: string;
}

export const OnlineRoomSetup: React.FC<OnlineRoomSetupProps> = ({
  mode,
  onModeChange,
  className = "",
}) => {
  return (
    <div className={`menu-section ${className}`}>
      <div className="join-or-create">
        <h2>Online Settings</h2>
        <div className="buttons">
          <button
            className={`choose-room-btn ${mode === "create" ? "active" : ""}`}
            onClick={() => onModeChange("create")}
          >
            Create Room
          </button>
          <button
            className={`choose-room-btn ${mode === "join" ? "active" : ""}`}
            onClick={() => onModeChange("join")}
          >
            Join Room
          </button>
        </div>
        <div className="content"></div>
      </div>
    </div>
  );
};
