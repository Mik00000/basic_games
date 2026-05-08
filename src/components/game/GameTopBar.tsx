import React, { ReactNode } from "react";

interface GameTopBarProps {
  leftContent?: ReactNode;
  midContent?: ReactNode;
  rightContent?: ReactNode;
  className?: string;
}

/**
 * Універсальний компонент верхньої панелі для ігор.
 * Використовує CSS Grid для стабільного та адаптивного позиціонування елементів.
 */
export const GameTopBar: React.FC<GameTopBarProps> = ({
  leftContent,
  midContent,
  rightContent,
  className = "",
}) => {
  return (
    <div className={`game-top-bar ${className}`}>
      <div className="game-top-bar__left">{leftContent}</div>
      <div className="game-top-bar__mid">{midContent}</div>
      <div className="game-top-bar__right">{rightContent}</div>
    </div>
  );
};
