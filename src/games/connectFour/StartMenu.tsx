import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  areColorsTooSimilar,
  generateRandomGameId,
} from "../../components/utils";

interface DifficultyLevel {
  name: string;
  difficulty: 1 | 2 | 3 | 4;
}

const ConnectFourStartMenu: React.FC = () => {
  const [gameMode, setGameMode] = useState<string>("bot");
  const [playerOneName, setPlayerOneName] = useState<string>("Player 1");
  const [playerTwoName, setPlayerTwoName] = useState<string>("Player 2");
  const [playerOneColor, setPlayerOneColor] = useState<string>("#FF0000");
  const [playerTwoColor, setPlayerTwoColor] = useState<string>("#0000FF");
  const [playerOneError, setPlayerOneError] = useState<string>("");
  const [playerTwoError, setPlayerTwoError] = useState<string>("");
  const [generalError, setGeneralError] = useState<string>("");
  const [joinGameId, setJoinGameId] = useState<string>("");
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState<number>(0);
  const difficultyLevels: DifficultyLevel[] = [
    { name: "Easy", difficulty: 1 },
    { name: "Middle", difficulty: 2 },
    { name: "Hard", difficulty: 3 },
    { name: "Expert", difficulty: 4 },
  ];

  const validateInputs = (): boolean => {
    let isValid = true;
    setPlayerOneError("");
    setPlayerTwoError("");
    setGeneralError("");

    if (!playerOneName.trim()) {
      setPlayerOneError("Player 1 name cannot be empty.");
      isValid = false;
    }
    if (!playerTwoName.trim()) {
      setPlayerTwoError("Player 2 name cannot be empty.");
      isValid = false;
    }
    if (playerOneName === playerTwoName) {
      setGeneralError("Players cannot have the same name.");
      isValid = false;
    }
    if (
      playerOneColor === playerTwoColor ||
      areColorsTooSimilar(playerOneColor, playerTwoColor, 75)
    ) {
      setGeneralError("Players cannot have the same or too similar colors.");
      isValid = false;
    }
    if (
      areColorsTooSimilar(playerOneColor, "#232930", 90) ||
      areColorsTooSimilar(playerOneColor, "#181818", 90)
    ) {
      setPlayerOneError(
        "Player 1 cannot have the same color as the field or colors that are too similar to it"
      );
      isValid = false;
    }
    if (
      areColorsTooSimilar(playerTwoColor, "#232930", 90) ||
      areColorsTooSimilar(playerTwoColor, "#181818", 90)
    ) {
      setPlayerTwoError(
        "Player 2 cannot have the same color as the field or colors that are too similar to it"
      );
      isValid = false;
    }
    if (areColorsTooSimilar(playerOneColor, "#FFFFFF", 80)) {
      setPlayerTwoError("Player 1 cannot have too light color");
      isValid = false;
    }
    if (areColorsTooSimilar(playerTwoColor, "#FFFFFF", 80)) {
      setPlayerTwoError("Player 2 cannot have too light color");
      isValid = false;
    }
    return isValid;
  };
const startGame = () => {
    if (!validateInputs()) {
      return;
    }
    
    // Перевіряємо, чи ввів користувач код
    const isJoining = joinGameId.trim().length > 0;

    if (gameMode === "online") {
      // Якщо ми приєднуємось - вставляємо ID в URL.
      // Якщо створюємо - передаємо "create" (твоя логіка в Game.tsx це обробляє).
      const routeParam = isJoining ? joinGameId : "create";

      navigate(`/games/connect4/${routeParam}`, {
        state: {
          gameMode,
          playerOneName,
          // Ім'я другого гравця при join не важливе, бо воно прийде з сервера,
          // але для create воно потрібне як плейсхолдер.
          playerTwoName, 
          playerOneColor,
          playerTwoColor,
          difficulty,
          action: isJoining ? "join" : "create", // Оновлюємо екшн
        },
      });
    } else {
      // Локальна гра або бот
      navigate(`/games/connect4/host/`, {
        state: {
          gameMode,
          playerOneName,
          playerTwoName,
          playerOneColor,
          playerTwoColor,
          difficulty,
        },
      });
    }
  };

  const exitGame = () => {
    console.log("Exiting game...");
    navigate("/games");
  };

  return (
    <div className="connect-four-start-menu">
      <div className="menu-header">
        <h1>Connect Four</h1>
      </div>

      {generalError && (
        <div className="error-message general-error">{generalError}</div>
      )}

      <div className="menu-section">
        <h2>Game Mode</h2>
        <div className="game-modes">
          <button
            className={gameMode === "bot" ? "active" : ""}
            onClick={() => setGameMode("bot")}
          >
            Play with Bot
          </button>
          <button
            className={gameMode === "local" ? "active" : ""}
            onClick={() => setGameMode("local")}
          >
            Two Players (Same Device)
          </button>
          <button
            className={gameMode === "online" ? "active" : ""}
            onClick={() => setGameMode("online")}
          >
            Two Players (Different Devices)
          </button>
        </div>
      </div>
      {gameMode === "bot" && (
        <div className="menu-section">
          <div className="bot-settings">
            <h2>Bot Settings</h2>
            <input
              type="range"
              min="1"
              max="4"
              step="1"
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "5px",
              }}
            >
              {difficultyLevels.map((level, index) => (
                <span
                  key={index}
                  style={{
                    fontWeight: difficulty === index ? "bold" : "normal",
                  }}
                >
                  {level.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      {gameMode === "online" && (
        <div className="online-settings" style={{ marginTop: "15px" }}>
          <label>
            Join Room ID (leave empty to create):
            <input
              type="text"
              value={joinGameId}
              onChange={(e) => setJoinGameId(e.target.value)}
              placeholder="Enter Code"
            />
          </label>
        </div>
      )}
      <div className="menu-section">
        <h2>Player Settings</h2>
        <div className="player-settings">
          <div className="player">
            <label>
              {gameMode !== "bot" ? "Player 1 Name:" : "Player Name:"}
              <input
                type="text"
                value={playerOneName}
                onChange={(e) => setPlayerOneName(e.target.value)}
              />
            </label>
            {playerOneError && (
              <div className="error-message">{playerOneError}</div>
            )}
            <label>
              {gameMode !== "bot" ? "Player 1 Color:" : "Player Color:"}
              <input
                type="color"
                value={playerOneColor}
                onChange={(e) => setPlayerOneColor(e.target.value)}
              />
            </label>
          </div>
          {gameMode !== "bot" && (
            <div className="player">
              <label>
                Player 2 Name:
                <input
                  type="text"
                  value={playerTwoName}
                  onChange={(e) => setPlayerTwoName(e.target.value)}
                />
              </label>
              {playerTwoError && (
                <div className="error-message">{playerTwoError}</div>
              )}
              <label>
                Player 2 Color:
                <input
                  type="color"
                  value={playerTwoColor}
                  onChange={(e) => setPlayerTwoColor(e.target.value)}
                />
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="menu-actions">
        <button onClick={startGame} className="start-button">
          Start Game
        </button>
        <button onClick={exitGame} className="exit-button">
          Exit
        </button>
      </div>
    </div>
  );
};

export default ConnectFourStartMenu;
