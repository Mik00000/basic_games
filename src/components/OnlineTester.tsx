import React, { useState, useEffect, useMemo } from "react";
import { useOnlineGame, GameRoomInfo, GenericGameState } from "./onlineGameUtils"; // Шлях до вашого файлу
import { generateRandomGameId } from "./utils";

// Визначимо конкретний тип стану для цієї тестової гри
interface TestGameState extends GenericGameState {
  field: number[][];
  currentPlayer?: number;
  message?: string;
  timestamp?: number; // Додано для тесту оновлення
}

const OnlineTester = () => {
  const [gameTypeInput, setGameTypeInput] = useState("testGame"); // Змінено, щоб не конфліктувати
  const [inputGameId, setInputGameId] = useState("");
  const [maxPlayersInput, setMaxPlayersInput] = useState(2); // Змінено
  
  // Поточні параметри кімнати, встановлюються при створенні/приєднанні
  const [currentRoomParams, setCurrentRoomParams] = useState<{gameType: string, gameId: string} | null>(null);

  // Початковий стан гри, який буде надіслано на сервер
  const [initialGameState, setInitialGameState] = useState<TestGameState>({
    field: Array.from({ length: 3 }, () => Array(3).fill(0)), // Менше поле для тесту
    currentPlayer: 1,
    message: "Game just started!",
  });

  const {
    socketId,
    isConnected,
    gameState, // Тепер це TestGameState | null
    roomInfo,  // Тепер це GameRoomInfo<TestGameState> | null
    isAdmin,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    updateGame,
    getRoomInfo, // Не забуваємо отримати її з хука
    deleteRoom,
  } = useOnlineGame<TestGameState>(gameTypeInput, maxPlayersInput); // Передаємо тип стану

  const currentGameId = useMemo(() => currentRoomParams?.gameId || "", [currentRoomParams]);

  const handleCreate = () => {
    const newId = generateRandomGameId(6);
    const newGameType = gameTypeInput;
    
    // Встановлюємо початковий стан, який буде відправлено на сервер
    const newInitialState: TestGameState = {
      field: Array.from({ length: 4 }, () => Array(4).fill(0)), // Наприклад, 4x4
      currentPlayer: 1,
      message: `Welcome to ${newGameType} game ${newId}!`,
    };
    setInitialGameState(newInitialState); // Зберігаємо для відображення або повторного використання

    setCurrentRoomParams({ gameType: newGameType, gameId: newId });
    setInputGameId(newId); // Оновлюємо поле вводу для зручності
    createRoom(newId, newInitialState); // Передаємо initialState
  };

  const handleJoin = () => {
    if (!inputGameId || !gameTypeInput) {
        alert("Please enter Game ID and Game Type to join.");
        return;
    }
    setCurrentRoomParams({ gameType: gameTypeInput, gameId: inputGameId });
    joinRoom(inputGameId, gameTypeInput);
  };

  const handleLeave = () => {
    if (currentRoomParams) {
      leaveRoom(currentRoomParams.gameId, currentRoomParams.gameType);
      setCurrentRoomParams(null); // Скидаємо параметри поточної кімнати
    }
  };

  const handleDelete = () => {
    if (currentRoomParams && isAdmin) { // Тільки адмін може ініціювати видалення з клієнта
      deleteRoom(currentRoomParams.gameId, currentRoomParams.gameType);
    } else if (currentRoomParams) {
      alert("Only the admin can delete the room.");
    }
  };


  const handleCellClick = (i: number, j: number) => {
    if (!gameState || !gameState.field || !currentRoomParams) return;

    // Приклад: тільки поточний гравець (або адмін) може змінювати поле
    // Припустимо, gameState.currentPlayer містить ID сокета поточного гравця,
    // АБО, простіше, сервер сам вирішить, чи можна оновити стан.
    // На клієнті ми просто надсилаємо бажаний новий стан.

    const newField = gameState.field.map((row: number[], rowIndex: number) =>
      rowIndex === i
        ? row.map((cell: number, colIndex: number) =>
            colIndex === j ? (cell + 1) % 3 : cell
          )
        : row
    );
    // Важливо: завжди передавати повний стан гри при оновленні, якщо сервер не обробляє часткові оновлення
    updateGame(currentRoomParams.gameId, { ...gameState, field: newField }, currentRoomParams.gameType);
  };

  const handleAdminUpdateState = () => {
    if (!gameState || !currentRoomParams || !isAdmin) {
      alert("Only admin can perform this state update or game not active.");
      return;
    }
    const updatedState: TestGameState = {
        ...gameState,
        message: `Admin update at ${new Date().toLocaleTimeString()}`,
        timestamp: Date.now(),
    };
    updateGame(currentRoomParams.gameId, updatedState, currentRoomParams.gameType);
  };

  // Для отримання інформації про кімнату вручну
  const handleGetRoomInfo = () => {
    if (!inputGameId || !gameTypeInput) {
        alert("Please enter Game ID and Game Type to get info.");
        return;
    }
    getRoomInfo(inputGameId, (info) => {
        console.log("Manual GetRoomInfo:", info);
        if (info.exists) {
            alert(`Room ${gameTypeInput}_${inputGameId} exists. Players: ${info.players.length}/${info.maxPlayers}. Admin: ${info.admin}. State: ${JSON.stringify(info.state)}`);
        } else {
            alert(`Room ${gameTypeInput}_${inputGameId} does not exist.`);
        }
    }, gameTypeInput);
  };


  return (
    <div style={{ padding: "20px", fontFamily: "Arial", color: "black" }}>
      <h1>Online Mode Tester (Універсальний)</h1>
      <p>Socket ID: {socketId || "N/A"} | Connected: {isConnected ? "Yes" : "No"}</p>

      <div style={{ marginBottom: "20px", display: "flex", gap: "10px", alignItems: "center" }}>
        <label>
          Game Type:
          <input
            value={gameTypeInput}
            onChange={(e) => setGameTypeInput(e.target.value)}
            style={{ marginLeft: 5 }}
            disabled={!!currentRoomParams}
          />
        </label>
        <label>
          Max Players:
          <input
            type="number"
            value={maxPlayersInput}
            onChange={(e) => setMaxPlayersInput(Number(e.target.value))}
            min="1" max="10" style={{ marginLeft: 5, width: 60 }}
            disabled={!!currentRoomParams}
          />
        </label>
      </div>

      <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
        <button onClick={handleCreate} disabled={!!currentRoomParams}>Create New Game</button>
        <button onClick={handleJoin} disabled={!!currentRoomParams || !inputGameId}>Join Game</button>
        <button onClick={handleLeave} disabled={!currentRoomParams}>Leave Game</button>
      </div>

      <div style={{ marginBottom: "20px", display: "flex", gap: "10px", alignItems: "center" }}>
        <input
          placeholder="Enter Game ID to Join/GetInfo"
          value={inputGameId}
          onChange={(e) => setInputGameId(e.target.value)}
          style={{ width: 200, marginRight: 10 }}
          disabled={!!currentRoomParams}
        />
        <button onClick={handleGetRoomInfo} disabled={!!currentRoomParams}>Get Room Info</button>
      </div>
      
      {currentRoomParams && <p>Current Room: {currentRoomParams.gameType}_{currentRoomParams.gameId}</p>}

      {error && <div style={{ color: "red", marginBottom: 20, border: '1px solid red', padding: '10px' }}>Error: {error}</div>}

      <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
        <div>
          <h3>Game State (from hook)</h3>
          <pre style={{ background: "#f0f0f0", padding: 10, borderRadius: 5, color: "black", maxHeight: 300, overflowY: 'auto' }}>
            {JSON.stringify(gameState, null, 2)}
          </pre>
        </div>
        <div>
          <h3>Room Info (from hook)</h3>
          <pre style={{ background: "#f0f0f0", padding: 10, borderRadius: 5, color: "black", maxHeight: 300, overflowY: 'auto' }}>
            {JSON.stringify(roomInfo, null, 2)}
          </pre>
        </div>
         {/* Початковий стан, який використовувався для створення кімнати */}
        <div>
          <h3>Initial Game State (for create)</h3>
          <pre style={{ background: "#e0e0e0", padding: 10, borderRadius: 5, color: "black", maxHeight: 300, overflowY: 'auto' }}>
            {JSON.stringify(initialGameState, null, 2)}
          </pre>
        </div>
      </div>

      {roomInfo && (
        <div style={{ marginTop: 10, marginBottom: 20, fontWeight: 'bold' }}>
          Admin: {roomInfo.admin ? (isAdmin ? `You (${roomInfo.admin})` : roomInfo.admin) : "N/A"}
          <br/>
          Players: {roomInfo.players.join(', ')} ({roomInfo.players.length}/{roomInfo.maxPlayers})
        </div>
      )}

      {gameState?.field && Array.isArray(gameState.field) && gameState.field.length > 0 && Array.isArray(gameState.field[0]) && (
        <div style={{ marginTop: 20 }}>
          <h3>Ігрове поле (клікайте для зміни):</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gameState.field[0].length}, 40px)`,
            gap: 2,
            border: '1px solid #ccc',
            padding: 5,
            maxWidth: `${gameState.field[0].length * 42}px`
          }}>
            {gameState.field.map((row: number[], i: number) =>
              row.map((cell: number, j: number) => (
                <div
                  key={`${i}-${j}`}
                  onClick={() => handleCellClick(i, j)}
                  title={`Cell [${i},${j}] = ${cell}`}
                  style={{
                    width: 40,
                    height: 40,
                    backgroundColor: cell === 1 ? 'lightcoral' :
                                   cell === 2 ? 'lightyellow' : '#eee',
                    border: '1px solid #999',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8em',
                    transition: 'background-color 0.2s'
                  }}
                >
                  {cell}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: 20, display: 'flex', gap: '10px' }}>
        <button
          onClick={handleAdminUpdateState}
          disabled={!isAdmin || !currentRoomParams}
          title={!isAdmin ? "Only admin can do this" : ""}
        >
          Admin Update (Timestamp)
        </button>
        <button
          onClick={handleDelete}
          disabled={!isAdmin || !currentRoomParams}
          title={!isAdmin ? "Only admin can do this" : ""}
          style={{backgroundColor: 'salmon'}}
        >
          Delete Room (Admin)
        </button>
      </div>
    </div>
  );
};
export default OnlineTester;