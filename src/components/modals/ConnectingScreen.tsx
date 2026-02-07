import React from "react";

interface ConnectingScreenProps {
  onCancel: () => void;
  title?: string;
  message?: string;
}

export const ConnectingScreen: React.FC<ConnectingScreenProps> = ({
  onCancel,
  title = "Connecting to Game...",
  message = "Please wait while we restore your session.",
}) => {
  return (
    <div className="pause-overlay">
      <div className="pop-up">
        <div className="content">
          <h1 className="heading">{title}</h1>
          <p>{message}</p>
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
