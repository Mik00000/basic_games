import React from "react";

interface OpponentDisconnectedModalProps {
  isOpen: boolean;
  opponentName?: string;
  timer: number;
  onExit: () => void;
  className?: string;
}

export const OpponentDisconnectedModal: React.FC<
  OpponentDisconnectedModalProps
> = ({ isOpen, opponentName = "Opponent", timer, onExit }) => {
  if (!isOpen) return null;

  return (
    <div className="pause-overlay" style={{ zIndex: 1000 }}>
      {/* Increased z-index to be above everything else */}
      <div className="pop-up">
        <div className="content opponent-disconnected">
          <h1 className="heading">Opponent Disconnected</h1>
          <p>{opponentName} lost connection. Waiting for reconnection...</p>
          <div
            className="timer"
            style={{
              color: timer < 10 ? "#dc3545" : "white", // Red when low
            }}
          >
            {timer}s
          </div>
          <div className="control-buttons">
            <button className="leave-btn" onClick={onExit}>
              Leave Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
