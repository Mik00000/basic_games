import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

interface DifficultyLevel {
  name: string;
  difficulty: 1 | 2 | 3 | 4;
}

const ChessStartMenu: React.FC = () => {
  const [gameMode, setGameMode] = useState<string>("bot");
  const [playerOneName, setPlayerOneName] = useState<string>("Player 1");
  const [playerTwoName, setPlayerTwoName] = useState<string>("Player 2");
  const [playerOneError, setPlayerOneError] = useState<string>("");
  const [playerTwoError, setPlayerTwoError] = useState<string>("");
  const [generalError, setGeneralError] = useState<string>("");
  const [joinGameId, setJoinGameId] = useState<string>("");
  const [joinOrCreateRoom, setJoinOrCreateRoom] = useState<"create" | "join">(
    "create"
  );
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
      gameMode === "online" &&
      joinOrCreateRoom == "join" &&
      joinGameId.length <= 0
    ) {
      setGeneralError("Enter Game ID");
    }
    return isValid;
  };
  const startGame = () => {
    if (!validateInputs()) {
      return;
    }

    if (gameMode === "online") {
      if (joinOrCreateRoom == "join") {
        if (joinGameId.length > 0) {
          navigate(`/games/chess/lobby/${joinGameId}`, {
            state: {
              playerOneName, // Передаємо ім'я
              // Інше не важливо, воно налаштується в лобі
            },
          });
        }
      } else {
        navigate(`/games/chess/lobby/new`, {
          state: {
            playerOneName, // Передаємо ім'я
            // Інше не важливо, воно налаштується в лобі
          },
        });
      }
      // const lobbyId = joinOrCreateRoom == "join" ? joinGameId : "new";

      // Редірект на ЛОБІ
    } else {
      // Локальна гра або бот
      navigate(`/games/chess/${gameMode}`, {
        state: {
          gameMode,
          playerOneName,
          playerTwoName,
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
    <div className="chess-start-menu">
      <div className="menu-header">
        <h1>Chess</h1>
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
        <div className="menu-section">
          <div className="join-or-create">
            <h2>Online Settings</h2>
            <div className="buttons">
              <button
                className={`choose-room-btn ${
                  joinOrCreateRoom === "create" ? "active" : ""
                }`}
                onClick={() => setJoinOrCreateRoom("create")}
              >
                Create Room
              </button>
              <button
                className={`choose-room-btn ${
                  joinOrCreateRoom === "join" ? "active" : ""
                }`}
                onClick={() => setJoinOrCreateRoom("join")}
              >
                Join Room
              </button>
            </div>
            <div className="content"></div>
          </div>
        </div>
      )}
      <div className="menu-section">
        {gameMode !== "online" && <h2>Player Settings</h2>}
        <div className="player-settings">
          {(gameMode == "online" && joinOrCreateRoom == "join") || (
            <div className="player-wrapper">
              {gameMode == "online" && joinOrCreateRoom == "create" && (
                <span className="option-heading">Create Room</span>
              )}
              <div className="player">
                <label>
                  {gameMode !== "bot" && gameMode !== "online"
                    ? "Player 1 Name:"
                    : "Name:"}
                  <input
                    type="text"
                    value={playerOneName}
                    onChange={(e) => setPlayerOneName(e.target.value)}
                  />
                </label>
                {playerOneError && (
                  <div className="error-message">{playerOneError}</div>
                )}
              </div>
              {gameMode === "online" && (
                <button onClick={startGame} className="start-button">
                  Create
                </button>
              )}
            </div>
          )}
          {gameMode == "bot" || gameMode == "online" || (
            <div className="player-wrapper">
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
              </div>
            </div>
          )}
          {gameMode === "online" && joinOrCreateRoom === "join" && (
            <div className="player-wrapper">
              <span className="option-heading">Join Room</span>
              <div className="online-settings">
                <label>
                  Name
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
                  Room ID:
                  <input
                    type="text"
                    value={joinGameId}
                    onChange={(e) => setJoinGameId(e.target.value)}
                    placeholder="ID"
                  />
                </label>
              </div>
              <button onClick={startGame} className="start-button">
                Join
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="menu-actions">
        {gameMode !== "online" && (
          <button onClick={startGame} className="start-button">
            Join Game
          </button>
        )}
        <button
          onClick={exitGame}
          className={`exit-button ${gameMode == "online" && "wider"}`}
        >
          Exit
        </button>
      </div>
    </div>
  );
};

export default ChessStartMenu;
