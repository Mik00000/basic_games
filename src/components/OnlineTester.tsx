import React, { useState, useEffect, useMemo } from "react";
import { useOnlineGame, GenericGameState } from "./onlineGameUtils"; // Шлях до вашого файлу
// Припустимо, у вас є така функція
const generateRandomGameId = (length: number = 6): string => {
  return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
};


// Визначимо конкретний тип стану для цієї тестової гри
interface TestGameState extends GenericGameState {
  field: number[][];
  currentPlayer?: number; // Може бути socketId або індекс гравця (0, 1)
  message?: string;
  timestamp?: number;
}

const OnlineTester = () => {
  const [gameTypeInput, setGameTypeInput] = useState("testGame");
  const [inputGameId, setInputGameId] = useState("");
  const [maxPlayersInput, setMaxPlayersInput] = useState(2);
  
  const [currentRoomParams, setCurrentRoomParams] = useState<{gameType: string, gameId: string} | null>(null);

  // Початковий стан гри, який буде надіслано на сервер для нової гри
  // Цей стан може бути встановлений динамічно перед createRoom
  const [initialGameStateForCreation, setInitialGameStateForCreation] = useState<TestGameState>({
    field: Array.from({ length: 3 }, () => Array(3).fill(0)),
    currentPlayer: 1, // Або індекс гравця, або ID першого гравця (сервер може це встановити)
    message: "Game is ready to start!",
  });

  const {
    socketId,
    isConnected,
    gameState, // Тип: TestGameState | null
    roomInfo,  // Тип: GameRoomInfo<TestGameState> | null
    isAdmin,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    updateGame,
    getRoomInfo,
    deleteRoom,
  } = useOnlineGame<TestGameState>(
      currentRoomParams?.gameType || gameTypeInput, // Використовуємо gameType з currentRoomParams якщо в кімнаті
      maxPlayersInput
  );

  // Поточний ID гри для операцій, якщо ми в кімнаті
  const activeGameId = useMemo(() => roomInfo?.exists ? roomInfo.gameType?.split('_')[1] || currentRoomParams?.gameId : currentRoomParams?.gameId, [roomInfo, currentRoomParams]);
  const activeGameType = useMemo(() => roomInfo?.exists ? roomInfo.gameType?.split('_')[0] || currentRoomParams?.gameType : currentRoomParams?.gameType, [roomInfo, currentRoomParams]);


  const handleCreate = () => {
    const newId = generateRandomGameId(6);
    const newGameType = gameTypeInput.trim() || "defaultGame";
     
    const newInitialState: TestGameState = {
      field: Array.from({ length: Math.floor(Math.random() * 3) + 3 }, () => Array(Math.floor(Math.random() * 3) + 3).fill(0)), // 3x3 to 5x5
      currentPlayer: 1, // Припустимо, гравець 1 починає
      message: `Welcome to ${newGameType} game ${newId}! Field is ${initialGameStateForCreation.field.length}x${initialGameStateForCreation.field[0]?.length || 0}.`,
      timestamp: Date.now(),
    };
    // Зберігаємо цей initial state, щоб не було розсинхрону, якщо createRoom спрацює швидко
    // і roomUpdate прийде до того, як ми зможемо використовувати initialGameStateForCreation
    // setInitialGameStateForCreation(newInitialState); 

    createRoom(newId, newInitialState); // Передаємо initialState
    // Після успішного createRoom, сервер надішле roomUpdate,
    // який встановить roomInfo і gameState
    setCurrentRoomParams({ gameType: newGameType, gameId: newId });
    setInputGameId(newId);
  };

  const handleJoin = () => {
    const gameIdToJoin = inputGameId.trim();
    const gameTypeToJoin = gameTypeInput.trim();
    if (!gameIdToJoin || !gameTypeToJoin) {
        alert("Please enter Game ID and Game Type to join.");
        return;
    }
    joinRoom(gameIdToJoin, gameTypeToJoin);
    setCurrentRoomParams({ gameType: gameTypeToJoin, gameId: gameIdToJoin });
  };

  const handleLeave = () => {
    if (activeGameId && activeGameType) {
      leaveRoom(activeGameId, activeGameType);
      setCurrentRoomParams(null);
      // gameState та roomInfo будуть скинуті через обробник `leaveRoom` та/або `roomDeleted`
    }
  };

  const handleDelete = () => {
    if (activeGameId && activeGameType && isAdmin) {
      deleteRoom(activeGameId, activeGameType);
      // Після успішного deleteRoom, сервер надішле roomDeleted,
      // setCurrentRoomParams(null); // Це може відбутися в обробнику roomDeleted
    } else if (activeGameId) {
      alert("Only the admin can delete the room, or you are not in a room.");
    }
  };


  const handleCellClick = (i: number, j: number) => {
    if (!gameState || !gameState.field || !activeGameId || !activeGameType) return;

    // Важливо: Клієнт не повинен сам вирішувати, чий хід.
    // Він надсилає дію, а сервер валідує і оновлює стан.
    // Тут ми просто формуємо *пропонований* новий стан.
    const newField = gameState.field.map((row: number[], rowIndex: number) =>
      rowIndex === i
        ? row.map((cell: number, colIndex: number) =>
            colIndex === j ? (cell + 1) % 3 : cell // Приклад зміни
          )
        : row
    );
    
    const proposedNewState: TestGameState = {
        ...gameState, // Беремо поточний стан за основу
        field: newField,
        message: `${socketId} clicked on cell [${i},${j}]`,
        timestamp: Date.now(),
        // currentPlayer: ... // Сервер має визначити наступного гравця
    };
    updateGame(activeGameId, proposedNewState, activeGameType);
  };

  const handleAdminUpdateState = () => {
    if (!gameState || !activeGameId || !activeGameType || !isAdmin) {
      alert("Only admin can perform this state update or game not active.");
      return;
    }
    const updatedState: TestGameState = {
        ...gameState,
        message: `Admin force update at ${new Date().toLocaleTimeString()}`,
        timestamp: Date.now(),
        field: gameState.field.map(row => row.map(() => Math.floor(Math.random() * 3))), // Рандомізувати поле
    };
    updateGame(activeGameId, updatedState, activeGameType);
  };

  const handleGetRoomInfo = () => {
    const gameIdToQuery = inputGameId.trim();
    const gameTypeToQuery = gameTypeInput.trim();
    if (!gameIdToQuery || !gameTypeToQuery) {
        alert("Please enter Game ID and Game Type to get info.");
        return;
    }
    getRoomInfo(gameIdToQuery, (info) => {
        console.log("Manual GetRoomInfo:", info);
        if (info.exists) {
            alert(`Room ${info.gameType}_${gameIdToQuery} exists. Players: ${info.players.length}/${info.maxPlayers}. Admin: ${info.admin}. State: ${JSON.stringify(info.state)}`);
        } else {
            alert(`Room ${gameTypeToQuery}_${gameIdToQuery} does not exist.`);
        }
    }, gameTypeToQuery);
  };

  // Ефект для скидання currentRoomParams, якщо кімнату видалено або ми вийшли
  useEffect(() => {
    if (!roomInfo && currentRoomParams) {
        // Якщо roomInfo стало null (наприклад, після leaveRoom або roomDeleted),
        // а ми все ще думаємо, що в кімнаті, скидаємо currentRoomParams.
        // Це допоможе розблокувати поля вводу.
        // setCurrentRoomParams(null); // Це може викликати зациклення, якщо useOnlineGame залежить від gameTypeInput
    }
  }, [roomInfo, currentRoomParams]);
  
  // Оновлюємо gameType для хука, якщо ми виходимо з кімнати, щоб він не використовував старий gameType
  useEffect(() => {
      if (!currentRoomParams && gameTypeInput !== (activeGameType || gameTypeInput)) {
          // Якщо ми не в кімнаті, gameType для хука має бути той, що в полі вводу
          // Це може бути зайвим, якщо useOnlineGame вже використовує gameTypeInput
      }
  }, [currentRoomParams, gameTypeInput, activeGameType]);


  return (
    <div style={{ padding: "20px", fontFamily: "Arial", color: "black" }}>
      <h1>Online Mode Tester (Універсальний)</h1>
      <p>Socket ID: {socketId || "N/A"} | Connected: {isConnected ? "Yes" : "No"} {isAdmin && roomInfo ? "| You are Admin" : ""}</p>
      <p>Current Hook GameType: {activeGameType || gameTypeInput} | Max Players for New Game: {maxPlayersInput}</p>


      <div style={{ marginBottom: "20px", display: "flex", gap: "10px", alignItems: "center" }}>
        <label>
          Game Type:
          <input
            value={gameTypeInput}
            onChange={(e) => setGameTypeInput(e.target.value)}
            style={{ marginLeft: 5 }}
            disabled={!!currentRoomParams} // Блокуємо, якщо вже в кімнаті
          />
        </label>
        <label>
          Max Players (for new game):
          <input
            type="number"
            value={maxPlayersInput}
            onChange={(e) => setMaxPlayersInput(Math.max(1, Number(e.target.value)))}
            min="1" max="10" style={{ marginLeft: 5, width: 60 }}
            disabled={!!currentRoomParams}
          />
        </label>
      </div>

      <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
        <button onClick={handleCreate} disabled={!!currentRoomParams}>Create New Game</button>
        <button onClick={handleJoin} disabled={!!currentRoomParams || !inputGameId.trim() || !gameTypeInput.trim()}>Join Game</button>
        <button onClick={handleLeave} disabled={!currentRoomParams}>Leave Game</button>
        {isAdmin && <button onClick={handleDelete} disabled={!currentRoomParams}>Delete Game (Admin)</button>}
      </div>

      <div style={{ marginBottom: "20px", display: "flex", gap: "10px", alignItems: "center" }}>
        <input
          placeholder="Enter Game ID"
          value={inputGameId}
          onChange={(e) => setInputGameId(e.target.value)}
          style={{ width: 200, marginRight: 10 }}
          disabled={!!currentRoomParams}
        />
        <button onClick={handleGetRoomInfo} disabled={!!currentRoomParams || !inputGameId.trim() || !gameTypeInput.trim()}>Get Room Info</button>
      </div>
      
      {currentRoomParams && <p><b>Current Room: {currentRoomParams.gameType}_{currentRoomParams.gameId}</b></p>}
      {!currentRoomParams && <p><i>Not in any room. Create or join one.</i></p>}

      {error && <div style={{ color: "red", margin: "10px 0", border: '1px solid red', padding: '10px' }}>Error: {error}</div>}

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {roomInfo && (
          <div style={{border: '1px solid #ccc', padding: '10px', borderRadius: '5px'}}>
            <h3>Room Info (from hook)</h3>
            <p>Game Type: {roomInfo.gameType}</p>
            <p>Admin: {roomInfo.admin} {roomInfo.admin === socketId && "(You)"}</p>
            <p>Max Players: {roomInfo.maxPlayers}</p>
            <p>Players ({roomInfo.players.length}):</p>
            <ul>
              {roomInfo.players.map(pId => <li key={pId}>{pId} {pId === socketId && "(You)"}</li>)}
            </ul>
          </div>
        )}

        {gameState && roomInfo && (
          <div style={{border: '1px solid #ccc', padding: '10px', borderRadius: '5px'}}>
            <h3>Game Board & Actions</h3>
            <p>Message: {gameState.message}</p>
            <p>Timestamp: {gameState.timestamp ? new Date(gameState.timestamp).toLocaleTimeString() : 'N/A'}</p>
            <p>Current Player (example): {gameState.currentPlayer ?? 'N/A'}</p>
            {gameState.field && gameState.field.map((row, i) => (
              <div key={i} style={{ display: "flex" }}>
                {row.map((cell, j) => (
                  <button
                    key={j}
                    onClick={() => handleCellClick(i, j)}
                    style={{ width: 40, height: 40, margin: 2, background: cell === 1 ? 'lightblue' : cell === 2 ? 'lightcoral' : 'white' }}
                    disabled={!roomInfo} // Блокуємо, якщо не в кімнаті
                  >
                    {cell}
                  </button>
                ))}
              </div>
            ))}
            {isAdmin && <button onClick={handleAdminUpdateState} style={{marginTop: '10px'}}>Admin: Randomize Field</button>}
          </div>
        )}

        {initialGameStateForCreation && !roomInfo && (
             <div style={{border: '1px solid #eee', padding: '10px', borderRadius: '5px', background: '#f9f9f9'}}>
                <h3>Initial Game State (for new game creation)</h3>
                <pre style={{ background: "#f0f0f0", padding: 10, borderRadius: 5, color: "black", maxHeight: 300, overflowY: 'auto' }}>
                    {JSON.stringify(initialGameStateForCreation, null, 2)}
                </pre>
             </div>
        )}
      </div>
    </div>
  );
};

export default OnlineTester;