import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { Difficulty } from "./gameLogic";

interface DifficultyLevel {
  name: string;
  difficulty: Difficulty;
}

const SudokuStartMenu: React.FC = () => {
  const difficultyLevels: DifficultyLevel[] = [
    { name: "Easy", difficulty: "EASY" },
    { name: "Medium", difficulty: "MEDIUM" },
    { name: "Hard", difficulty: "HARD" },
    { name: "Expert", difficulty: "EXPERT" }
  ];

  const [difficultyIndex, setDifficultyIndex] = useState<number>(0);
  const navigate = useNavigate();

  const startGame = () => {
    const selectedDifficulty = difficultyLevels[difficultyIndex].difficulty;

    navigate("/games/sudoku", {
      state: {  
        difficulty: selectedDifficulty
      },
    });
  };

  const exitGame = () => {
    navigate("/");
  };

  return (
    <div className="sudoku-start-menu">
      <div className="menu-header">
        <h1>Sudoku</h1>
      </div>

      <div className="menu-section">
        <h2>Choose difficulty</h2>
        <div className="difficulty-slider">
          <input
            type="range"
            min="0"
            max="3"
            step="1"
            value={difficultyIndex}
            onChange={(e) => setDifficultyIndex(Number(e.target.value))}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
            {difficultyLevels.map((level, index) => (
              <span key={index} style={{ fontWeight: difficultyIndex === index ? 'bold' : 'normal' }}>
                {level.name}
              </span>
            ))}
          </div>
          <div className="game-info">
            <p>Difficulty: {difficultyLevels[difficultyIndex].name}</p>
          </div>
        </div>
      </div>
      
      <div className="menu-actions">
        <button onClick={startGame} className="start-button">Play</button>
        <button onClick={exitGame} className="exit-button">Exit</button>
      </div>
    </div>
  );
};

export default SudokuStartMenu;
