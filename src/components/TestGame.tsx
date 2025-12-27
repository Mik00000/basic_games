import React, { useState } from 'react';
import { useOnlineGame } from '../hooks/useOnlineGame'; // Твій оновлений хук

// Тип стейту, який приходить з сервера
interface TTState {
  board: (string | null)[];
  currentTurn: string;
  players: string[];
  winner: string | null;
  isFinished: boolean;
}

const TestGame = () => {
  const {
    isConnected,
    createRoom,
    joinRoom,
    makeMove, // Оновлений метод
    gameState,
    currentPlayer,
    currentRoom,
    error,
    socketId
  } = useOnlineGame<TTState>(); // Передаємо Generic тип

  const [roomIdInput, setRoomIdInput] = useState("");
  const [username, setUsername] = useState("User" + Math.floor(Math.random() * 1000));

  const handleCreate = async () => {
    await createRoom({
      name: "Test Room",
      gameType: "tictactoe", // Має співпадати з сервером
      maxPlayers: 2,
      username: username,
      initialState: {} as any // Сервер сам згенерує, це заглушка
    });
  };

  const handleJoin = async () => {
    await joinRoom({ roomId: roomIdInput, username: username });
  };

  const handleCellClick = async (index: number) => {
    // ВАЖЛИВО: Ми не міняємо стейт тут! Ми шлемо намір (Action)
    await makeMove({ index });
  };

  if (!isConnected) return <div>Connecting to server...</div>;

  // 1. Екран входу (Лобі)
  if (!currentRoom) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Game Engine Test</h2>
        {error && <div style={{ color: 'red' }}>Error: {error}</div>}
        
        <div style={{ marginBottom: 10 }}>
          <label>Username: </label>
          <input value={username} onChange={e => setUsername(e.target.value)} />
        </div>

        <button onClick={handleCreate}>Create Tic-Tac-Toe</button>
        <hr />
        <div>
          <input 
            placeholder="Room ID" 
            value={roomIdInput} 
            onChange={e => setRoomIdInput(e.target.value)} 
          />
          <button onClick={handleJoin}>Join</button>
        </div>
      </div>
    );
  }

  // 2. Екран гри
  if (!gameState) return <div>Loading game state...</div>;

  const myId = currentPlayer?.id;
  const isMyTurn = gameState.currentTurn === myId;
  const symbol = gameState.players[0] === myId ? "X" : "O";

  return (
    <div style={{ padding: 20, maxWidth: 400, margin: '0 auto' }}>
      <h3>Room: {currentRoom.id}</h3>
      <p>You are: <b>{username}</b> ({symbol})</p>
      <p>Status: {gameState.isFinished 
        ? (gameState.winner === myId ? "WIN! 🎉" : gameState.winner ? "LOSE 💀" : "DRAW 🤝") 
        : (isMyTurn ? "🟢 YOUR TURN" : "🔴 WAITING...")}
      </p>
      
      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: 5, 
        backgroundColor: '#333', 
        padding: 5 
      }}>
        {gameState.board.map((cell, i) => (
          <button
            key={i}
            onClick={() => handleCellClick(i)}
            disabled={!!cell || !isMyTurn || gameState.isFinished}
            style={{
              height: 80,
              fontSize: 40,
              cursor: (!!cell || !isMyTurn) ? 'not-allowed' : 'pointer',
              background: '#fff'
            }}
          >
            {cell}
          </button>
        ))}
      </div>
      
      <div style={{ marginTop: 20 }}>
        <button onClick={() => navigator.clipboard.writeText(currentRoom.id || "")}>
          Copy Room ID
        </button>
      </div>
    </div>
  );
};
export default TestGame;