import React from "react";

interface PlayerSetupProps {
  label?: string;
  name: string;
  onNameChange: (name: string) => void;
  color: string;
  onColorChange: (color: string) => void;
  error?: string;
  showName?: boolean;
  showColor?: boolean;
  maxLength?: number;
  className?: string;
}

export const PlayerSetup: React.FC<PlayerSetupProps> = ({
  label,
  name,
  onNameChange,
  color,
  onColorChange,
  error,
  showName = true,
  showColor = true,
  maxLength = 12,
  className = "",
}) => {
  return (
    <div className={`player ${className}`}>
      {label && <label>{label}</label>}
      {showName && (
        <label>
          Name:
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            maxLength={maxLength}
          />
        </label>
      )}
      {error && <div className="error-message">{error}</div>}
      {showColor && (
        <label>
          Color:
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
          />
        </label>
      )}
    </div>
  );
};
