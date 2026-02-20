import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { areColorsTooSimilar } from "../../components/common/utils";
import { GameModeSelector } from "../../components/menus/GameModeSelector";
import { OnlineRoomSetup } from "../../components/menus/OnlineRoomSetup";
import { PlayerSetup } from "../../components/menus/PlayerSetup";

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
  const [joinOrCreateRoom, setJoinOrCreateRoom] = useState<"create" | "join">(
    "create",
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
    } else if (playerOneName.length > 12) {
      setPlayerOneError("Player 1 name cannot be longer than 12 characters.");
      isValid = false;
    }
    if (!playerTwoName.trim()) {
      setPlayerTwoError("Player 2 name cannot be empty.");
      isValid = false;
    } else if (playerTwoName.length > 12) {
      setPlayerTwoError("Player 2 name cannot be longer than 12 characters.");
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
      areColorsTooSimilar(playerOneColor, "#232930", 50) ||
      areColorsTooSimilar(playerOneColor, "#181818", 50)
    ) {
      setPlayerOneError(
        "Player 1 cannot have the same color as the field or colors that are too similar to it",
      );
      isValid = false;
    }
    if (
      areColorsTooSimilar(playerTwoColor, "#232930", 50) ||
      areColorsTooSimilar(playerTwoColor, "#181818", 50)
    ) {
      setPlayerTwoError(
        "Player 2 cannot have the same color as the field or colors that are too similar to it",
      );
      isValid = false;
    }
    if (areColorsTooSimilar(playerOneColor, "#FFFFFF", 70)) {
      setPlayerTwoError("Player 1 cannot have too light color");
      isValid = false;
    }
    if (areColorsTooSimilar(playerTwoColor, "#FFFFFF", 70)) {
      setPlayerTwoError("Player 2 cannot have too light color");
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

    // Перевіряємо, чи ввів користувач код

    if (gameMode === "online") {
      if (joinOrCreateRoom == "join") {
        if (joinGameId.length > 0) {
          navigate(`/games/connect4/lobby/${joinGameId}`, {
            state: {
              playerOneName, // Передаємо ім'я
              playerOneColor, // Передаємо колір
              // Інше не важливо, воно налаштується в лобі
            },
          });
        }
      } else {
        navigate(`/games/connect4/lobby/new`, {
          state: {
            playerOneName, // Передаємо ім'я
            playerOneColor, // Передаємо колір
            // Інше не важливо, воно налаштується в лобі
          },
        });
      }
      // const lobbyId = joinOrCreateRoom == "join" ? joinGameId : "new";

      // Редірект на ЛОБІ
    } else {
      // Локальна гра або бот
      // Генеруємо унікальний ID для цієї сесії гри
      const localGameId = crypto.randomUUID();

      // Скидаємо попередній стан (для цієї нової гри вже не треба очищати старі ключі,
      // бо ми створимо нові унікальні, але старі дефолтні можна почистити про всяк випадок)
      const keys = [
        "connectFourGameState",
        "circleTimer1RemainingTime",
        "circleTimer2RemainingTime",
        "connectFourTimerTime1",
        "connectFourTimerTime2",
      ];
      keys.forEach((key) => localStorage.removeItem(key));

      navigate(`/games/connect4/host/`, {
        state: {
          gameMode,
          playerOneName,
          playerTwoName,
          playerOneColor,
          playerTwoColor,
          difficulty,
          localGameId, // Passing unique ID
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

      <GameModeSelector
        currentMode={gameMode}
        onModeChange={setGameMode}
        className="menu-section"
      />
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
                    fontWeight: difficulty === index + 1 ? "bold" : "normal",
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
        <OnlineRoomSetup
          mode={joinOrCreateRoom}
          onModeChange={setJoinOrCreateRoom}
          className="menu-section"
        />
      )}
      <div className="menu-section">
        {gameMode !== "online" && <h2>Player Settings</h2>}
        <div className="player-settings">
          {/* Player 1 or Create Room Setup */}
          {!(gameMode === "online" && joinOrCreateRoom === "join") && (
            <div className="player-wrapper">
              {gameMode === "online" && joinOrCreateRoom === "create" && (
                <span className="option-heading">Create Room</span>
              )}
              <PlayerSetup
                label={
                  gameMode !== "bot" && gameMode !== "online"
                    ? "Player 1 Settings"
                    : "Settings"
                }
                name={playerOneName}
                onNameChange={setPlayerOneName}
                color={playerOneColor}
                onColorChange={setPlayerOneColor}
                error={playerOneError}
                showName={true}
                showColor={true}
              />
              {gameMode === "online" && (
                <button onClick={startGame} className="start-button">
                  Create
                </button>
              )}
            </div>
          )}

          {/* Player 2 Setup (Bot or Local) */}
          {!(gameMode === "bot" || gameMode === "online") && (
            <div className="player-wrapper">
              <PlayerSetup
                label="Player 2 Settings"
                name={playerTwoName}
                onNameChange={setPlayerTwoName}
                color={playerTwoColor}
                onColorChange={setPlayerTwoColor}
                error={playerTwoError}
                showName={true}
                showColor={true}
              />
            </div>
          )}

          {/* Join Online Room Setup */}
          {gameMode === "online" && joinOrCreateRoom === "join" && (
            <div className="player-wrapper">
              <span className="option-heading">Join Room</span>
              <div className="online-settings">
                <PlayerSetup
                  name={playerOneName}
                  onNameChange={setPlayerOneName}
                  color={playerOneColor}
                  onColorChange={setPlayerOneColor}
                  error={playerOneError}
                  showName={true}
                  showColor={true}
                  className="mb-2"
                />
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

export default ConnectFourStartMenu;
