import React, { useState, useEffect } from 'react';
import { useRouter } from "react-router-dom";

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
    { name: "Expert", rows: 16, columns: 30, bombCount: 99 }
  ];

  const [generalError, setGeneralError] = useState<string>('');
  const [difficulty, setDifficulty] = useState<number>(0);
  const [rows, setRows] = useState<number>(difficultyLevels[difficulty].rows);
  const [columns, setColumns] = useState<number>(difficultyLevels[difficulty].columns);
  const [bombCount, setBombCount] = useState<number>(difficultyLevels[difficulty].bombCount);

  const router = useRouter();

  useEffect(() => {
    setRows(difficultyLevels[difficulty].rows);
    setColumns(difficultyLevels[difficulty].columns);
    setBombCount(difficultyLevels[difficulty].bombCount);
  }, [difficulty]);

  const validateInputs = (): boolean => {
    let isValid = true;
    setGeneralError('');
    return isValid;
  };

  const startGame = () => {
    if (!validateInputs()) {
      return;
    }

    router.navigate("/games/connect4", {
      state: {  
        rows,
        columns,
        bombCount
      },
    });
  };

  const exitGame = () => {
    router.navigate("/games");
  };

  return (
    <div className="minesweeper-start-menu">
      <div className="menu-header">
        <h1>Minesweeper</h1>
      </div>

      {generalError && <div className="error-message general-error">{generalError}</div>}

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
            <p>Field: {rows} x {columns}</p>
            <p>Bomb count: {bombCount}</p>
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
