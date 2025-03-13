import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";

interface DifficultyLevel {
  name: string;
  rows: number;
  columns: number;
  bombCount: number;
}

const MinesweeperStartMenu: React.FC = () => {
  const difficultyLevels: DifficultyLevel[] = [
    { name: "Easy", rows: 9, columns: 9, bombCount: 10 },
    { name: "Middle", rows: 16, columns: 16, bombCount: 40 },
    { name: "Expert", rows: 30, columns: 16, bombCount: 99 }
  ];

  const [difficulty, setDifficulty] = useState<number>(0);
  const navigate = useNavigate();

  const startGame = () => {
    localStorage.removeItem("minesweeperState");
    const selectedDifficulty = difficultyLevels[difficulty];

    let rows = selectedDifficulty.rows;
    let columns = selectedDifficulty.columns;

    if (selectedDifficulty.name === "Expert") {
      if (window.innerWidth >= 768) {
        rows = 16;
        columns = 30;
      }
    }

    navigate("/games/minesweeper", {
      state: {  
        rows,
        columns,
        bombCount: selectedDifficulty.bombCount
      },
    });
  };

  const exitGame = () => {
    navigate("/games");
  };

  return (
    <div className="minesweeper-start-menu">
      <div className="menu-header">
        <h1>Minesweeper</h1>
      </div>

      <div className="menu-section">
        <h2>Choose Difficulty</h2>
        <div className="difficulty-slider">
          <input
            type="range"
            min="0"
            max="2"
            step="1"
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
            {difficultyLevels.map((level, index) => (
              <span key={index} style={{ fontWeight: difficulty === index ? 'bold' : 'normal' }}>
                {level.name}
              </span>
            ))}
          </div>
          <div className="game-info">
            <p>Field: {difficultyLevels[difficulty].rows} x {difficultyLevels[difficulty].columns}</p>
            <p>Bomb count: {difficultyLevels[difficulty].bombCount}</p>
          </div>
        </div>
      </div>
      
      <div className="menu-actions">
        <button onClick={startGame} className="start-button">Start</button>
        <button onClick={exitGame} className="exit-button">Exit</button>
      </div>
    </div>
  );
};

export default MinesweeperStartMenu;
