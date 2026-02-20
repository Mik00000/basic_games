import { useState } from "react";
import { useDelayedVisibility } from "../../hooks/useDelayedVisibility";

interface WaitingForOpponentScreenProps {
  roomId?: string;
  onCancel: () => void;
}

export const WaitingForOpponentScreen: React.FC<
  WaitingForOpponentScreenProps
> = ({ roomId, onCancel }) => {
  const shouldRender = useDelayedVisibility(true, 500);
  const [isCopied, setIsCopied] = useState(false);

  if (!shouldRender) return null;

  const handleCopy = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="pause-overlay">
      <div className="pop-up">
        <div className="content">
          <h1 className="heading">Waiting for opponent...</h1>
          <p>Share this Room ID:</p>
          <h2 // Changed to h2 to fit hierarchy, assuming heading style handles font
            className="heading"
            style={{
              color: isCopied ? "#4ade80" : "white",
              cursor: "pointer",
              userSelect: "all",
            }}
            onClick={handleCopy}
            title="Click to copy"
          >
            {roomId || "..."}
          </h2>
          {isCopied && (
            <p style={{ color: "#4ade80", fontSize: "0.8rem", height: "1rem" }}>
              Copied!
            </p>
          )}
          <div className="control-buttons">
            <button className="exit-button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
