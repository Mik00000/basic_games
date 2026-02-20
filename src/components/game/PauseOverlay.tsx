import React from "react";
import PauseIcon from "../../assets/icons/pause.svg?react";
import { PauseButton } from "./GameControls";

interface PauseOverlayProps {
  isOnline: boolean;
  isPaused: boolean;
  onResume: () => void;
  resumeText?: string;
  isDisabled?: boolean;
  voteCount?: number;
  className?: string; // For additional styling if needed
}

export const PauseOverlay: React.FC<PauseOverlayProps> = ({
  isOnline,
  isPaused,
  onResume,
  resumeText = "Resume",
  isDisabled = false,
  voteCount = 0,
  className = "",
}) => {
  if (!isPaused) return null;

  return (
    <div className={`pause-overlay ${className}`}>
      {!isOnline ? (
        <button className="pause-icon-btn" onClick={onResume}>
          <PauseIcon className="icon" color="white" />
          <span>{resumeText}</span>
        </button>
      ) : (
        <div className="pop-up">
          <div className="content">
            <PauseIcon color="white" />
            <PauseButton
              onClick={onResume}
              isPaused={true} // Always "paused" visually in this overlay to show we are in pause state
              disabled={isDisabled}
              text={resumeText}
              className="paused"
              voteCount={voteCount}
              forceText={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
