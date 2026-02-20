import React from "react";
import ExitIcon from "../../assets/icons/previous-page.svg";
import PauseIcon from "../../assets/icons/pause.svg";
import PlayIcon from "../../assets/icons/play.svg";
import RestartIcon from "../../assets/icons/restart.svg";

interface ButtonProps {
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  title?: string;
  style?: React.CSSProperties;
  text?: string;
  isMobile?: boolean;
  forceText?: boolean;
  voteCount?: number;
}

export const ExitButton: React.FC<ButtonProps> = ({
  onClick,
  className = "",
  style,
  forceText,
}) => (
  <button
    onClick={onClick}
    className={`exit-btn ${forceText ? "force-text" : ""} ${className}`}
    style={style}
  >
    <img src={ExitIcon} alt="Exit" className="icon" />
    <span>Exit to Menu</span>
  </button>
);

export const MobileExitButton: React.FC<ButtonProps> = ({
  onClick,
  className = "",
  forceText,
}) => (
  <button
    onClick={onClick}
    className={`exit-btn ${forceText ? "force-text" : ""} ${className}`}
  >
    <img src={ExitIcon} alt="Exit" className="icon" />
    <span>Exit</span>
  </button>
);

export const PauseButton: React.FC<ButtonProps & { isPaused: boolean }> = ({
  onClick,
  className = "",
  disabled,
  style,
  text,
  isPaused,
  forceText,
  voteCount,
}) => (
  <button
    onClick={onClick}
    className={`pause-btn ${isPaused ? "paused" : ""} ${
      forceText ? "force-text" : ""
    } ${className}`}
    disabled={disabled}
    style={
      {
        ...style,
        "--vote-count": voteCount ? `"${voteCount}"` : "",
      } as React.CSSProperties
    }
  >
    <img src={isPaused ? PlayIcon : PauseIcon} alt="Pause" className="icon" />
    <span>{text}</span>
  </button>
);

export const RestartButton: React.FC<
  ButtonProps & { isStartAnimation?: boolean }
> = ({
  onClick,
  className = "",
  disabled,
  style,
  title,
  text,
  isStartAnimation,
  forceText,
  voteCount,
}) => (
  <button
    onClick={onClick}
    className={`restart-btn ${
      disabled || isStartAnimation ? "disabled-visual" : ""
    } ${forceText ? "force-text" : ""} ${className}`}
    disabled={disabled}
    title={title}
    style={
      {
        ...style,
        "--vote-count": voteCount && voteCount !== 0 ? `"${voteCount}"` : "",
      } as React.CSSProperties
    }
  >
    <img src={RestartIcon} alt="Restart" className="icon" />
    <span>{text}</span>
  </button>
);
