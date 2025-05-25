import { useState, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";

// Загальний тип для стану гри, може бути уточнений у кожній конкретній грі
export type GenericGameState = Record<string, any>;

export interface GameRoomInfo<TGameState = GenericGameState> {
  exists: boolean;
  players: string[];
  admin: string | null;
  maxPlayers: number;
  state: TGameState;
  gameType: string | null;
}

export interface RoomParams {
  gameType: string;
  gameId: string;
  maxPlayers?: number;
}

let socketInstance: Socket | null = null;

// Функція для отримання або ініціалізації сокета
const getSocket = (serverUrl: string): Socket => {
  if (!socketInstance || !socketInstance.connected) {
    if (socketInstance) {
        socketInstance.disconnect(); // Закриваємо попереднє з'єднання, якщо воно було
    }
    socketInstance = io(serverUrl, {
      transports: ["websocket", "polling"],
      autoConnect: true, // Дозволяємо авто-підключення
      // Можна додати налаштування перепідключення, якщо потрібно
      // reconnectionAttempts: 5,
      // reconnectionDelay: 1000,
    });
  }
  return socketInstance;
};


export const useOnlineGame = <TGameState extends GenericGameState = GenericGameState>(
  gameTypeFromProps: string,
  maxPlayersFromProps: number = 2
) => {
  const [gameState, setGameState] = useState<TGameState | null>(null);
  const [roomInfo, setRoomInfo] = useState<GameRoomInfo<TGameState> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);


  const handleError = useCallback((msg: string) => {
    console.error("OnlineGame Error:", msg);
    setError(msg);
  }, []);

  const handleRoomUpdate = useCallback((data: Omit<GameRoomInfo<TGameState>, 'exists'>) => {
    console.log("Received roomUpdate:", data);
    setRoomInfo({
        exists: true, // Якщо ми отримали roomUpdate, кімната існує
        players: data.players,
        admin: data.admin,
        maxPlayers: data.maxPlayers,
        state: data.state,
        gameType: data.gameType,
    });
    setGameState(data.state); // Оновлюємо окремий gameState для зручності
    setError(null); // Скидаємо помилку при успішному оновленні
  }, []);


  const handleRoomDeleted = useCallback((message: string = "Room was deleted.") => {
    setGameState(null);
    setRoomInfo(null);
    console.warn("RoomDeleted:", message);
    // Можна додати спеціальний стан, наприклад, setRoomStatus('deleted')
    // setError(message); // Якщо це завжди вважати помилкою для користувача
  }, []);

  const handleAdminChanged = useCallback((newAdminId: string) => {
    console.log("Admin changed to:", newAdminId);
    setRoomInfo(prev => prev ? { ...prev, admin: newAdminId } : null);
  }, []);


  useEffect(() => {
    const serverUrl = process.env.REACT_APP_SOCKET_SERVER_URL || "http://localhost:3001";
    const currentSocket = getSocket(serverUrl);

    const onConnect = () => {
      console.log("Socket connected:", currentSocket.id);
      setSocketId(currentSocket.id || null);
      setIsConnected(true);
      setError(null);
    };

    const onConnectError = (err: Error) => {
      console.error("Connection error:", err);
      handleError(`Connection error: ${err.message}. Server may be unavailable.`);
      setIsConnected(false);
      setSocketId(null);
    };

    const onDisconnect = (reason: Socket.DisconnectReason) => {
      console.log("Socket disconnected:", reason);
      setIsConnected(false);
      // setSocketId(null); // Не скидаємо socketId, щоб його можна було бачити навіть після дисконекту
      // Не скидаємо roomInfo та gameState тут, бо може бути перепідключення
      if (reason === "io server disconnect") {
        handleError("Disconnected by server.");
        handleRoomDeleted("Disconnected by server, room may no longer exist.");
      } else if (reason === "io client disconnect") {
        // Клієнт сам викликав disconnect, наприклад, при leaveRoom
        // або при розмонтуванні компонента, якщо так налаштовано
      } else {
        // Інші причини, спроба перепідключення
        // handleError("Connection lost. Attempting to reconnect...");
      }
    };

    const onErrorEvent = (errMsg: string) => {
        handleError(errMsg);
    };


    // Реєстрація слухачів
    currentSocket.on("connect", onConnect);
    currentSocket.on("connect_error", onConnectError);
    currentSocket.on("disconnect", onDisconnect);

    currentSocket.on("roomUpdate", handleRoomUpdate);
    currentSocket.on("error", onErrorEvent);
    currentSocket.on("roomDeleted", handleRoomDeleted);
    currentSocket.on("adminChanged", handleAdminChanged); 

    // Функція очищення
    return () => {
      currentSocket.off("connect", onConnect);
      currentSocket.off("connect_error", onConnectError);
      currentSocket.off("disconnect", onDisconnect);
      currentSocket.off("roomUpdate", handleRoomUpdate);
      currentSocket.off("error", onErrorEvent);
      currentSocket.off("roomDeleted", handleRoomDeleted);
      currentSocket.off("adminChanged", handleAdminChanged);

      // Важливо: Не відключайте сокет тут, якщо він використовується іншими компонентами
      // або якщо ви хочете зберегти з'єднання між переходами сторінок.
      // Глобальне керування сокетом може бути кращим підходом.
      // if (socketInstance && !Object.keys(socketInstance.listenersAny()).length) {
      //   console.log("Attempting to disconnect socket as no listeners are attached.");
      //   socketInstance.disconnect();
      //   socketInstance = null;
      // }
    };
  }, [handleError, handleRoomUpdate, handleRoomDeleted, handleAdminChanged]);


  const ensureConnected = useCallback(() => {
    if (!socketInstance || !socketInstance.connected) {
      handleError("Socket not connected. Please check your connection or try again.");
      return false;
    }
    return true;
  }, [handleError]);


  const createRoom = useCallback((gameId: string, initialState: TGameState) => {
    if (!ensureConnected() || !socketInstance) return;
    console.log(`Attempting to create room: ${gameTypeFromProps}_${gameId}`);
    socketInstance.emit("createRoom", {
      gameType: gameTypeFromProps,
      gameId,
      maxPlayers: maxPlayersFromProps,
      initialState
    });
  }, [gameTypeFromProps, maxPlayersFromProps, ensureConnected]);


  const joinRoom = useCallback((gameId: string, type = gameTypeFromProps) => {
    if (!ensureConnected() || !socketInstance) return;
    console.log(`Attempting to join room: ${type}_${gameId}`);
    socketInstance.emit("joinRoom", { gameType: type, gameId });
  }, [gameTypeFromProps, ensureConnected, ]);

  const leaveRoom = useCallback((gameId: string, type = gameTypeFromProps) => {
    if (!socketInstance) {
        console.warn("Socket not available for leaveRoom, room info will be cleared locally.");
    }
    socketInstance?.emit("leaveRoom", { gameType: type, gameId });
    setGameState(null);
    setRoomInfo(null);
    // Не скидаємо socketId та isConnected, оскільки з'єднання може бути активним
    console.log(`Left room: ${type}_${gameId}`);
  }, [gameTypeFromProps]);


  const updateGame = useCallback((gameId: string, newState: TGameState, type = gameTypeFromProps) => {
    if (!ensureConnected() || !socketInstance) return;
    socketInstance.emit("updateGame", {
        gameType: type,
        gameId,
        newState
    });
  }, [gameTypeFromProps, ensureConnected]);


  const getRoomInfo = useCallback((
    gameId: string,
    callback: (info: GameRoomInfo<TGameState> | { exists: false }) => void,
    type = gameTypeFromProps
    ) => {
    if (!ensureConnected() || !socketInstance) {
        callback({ exists: false });
        return;
    }
    socketInstance.emit("getRoomInfo", { gameType: type, gameId }, (response: any) => {
        if (response && typeof response.exists === 'boolean') {
            callback(response as GameRoomInfo<TGameState> | { exists: false });
        } else {
            console.error("Invalid response from getRoomInfo:", response);
            callback({ exists: false });
        }
    });
  }, [gameTypeFromProps, ensureConnected]);


  const deleteRoom = useCallback((gameId: string, type = gameTypeFromProps) => {
    if (!ensureConnected() || !socketInstance) return;
    socketInstance.emit("deleteRoom", { gameType: type, gameId });
  }, [gameTypeFromProps, ensureConnected]);


  return {
    socketId,
    isConnected,
    gameState,
    roomInfo, 
    isAdmin: roomInfo?.admin === socketId && !!socketId,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    updateGame,
    getRoomInfo,
    deleteRoom,
  };
};


export const checkOnlineGame = async (
  gameType: string,
  gameId: string
): Promise<GameRoomInfo | { exists: false }> => {
  return new Promise((resolve) => { // Removed reject as we resolve with exists: false
    const serverUrl = process.env.REACT_APP_SOCKET_SERVER_URL || "http://localhost:3001";
    
    let tempSocket: Socket | null = null;
    try {
        tempSocket = io(serverUrl, {
          transports: ["websocket"],
          autoConnect: false, 
          timeout: 5000, // Socket.IO connection timeout
          reconnection: false,
        });
    } catch (e) {
        console.error("Failed to create temporary socket:", e);
        resolve({ exists: false }); // Resolve instead of reject
        return;
    }

    const localSocket = tempSocket;

    const connectionTimeoutId = setTimeout(() => {
      console.warn(`checkOnlineGame (${gameType}_${gameId}): Connection attempt timed out after 5s.`);
      localSocket.disconnect();
      resolve({ exists: false });
    }, 5000); // This is an application-level timeout for the whole operation

    localSocket.on("connect", () => {
      localSocket.emit("getRoomInfo", { gameType, gameId }, (data: any) => {
        clearTimeout(connectionTimeoutId);
        localSocket.disconnect();
        if (data && typeof data.exists === 'boolean') {
          resolve(data as GameRoomInfo | { exists: false });
        } else {
          console.warn(`Unexpected data structure from getRoomInfo in checkOnlineGame (${gameType}_${gameId}):`, data);
          resolve({ exists: false });
        }
      });
    });

    localSocket.on("connect_error", (err: Error) => {
      clearTimeout(connectionTimeoutId);
      localSocket.disconnect();
      console.error(`Connection error in checkOnlineGame (${gameType}_${gameId}):`, err.message);
      resolve({ exists: false });
    });

    try {
        localSocket.connect();
    } catch (e) {
        clearTimeout(connectionTimeoutId);
        console.error(`Error while trying to connect in checkOnlineGame (${gameType}_${gameId}):`, e);
        resolve({ exists: false });
    }
  });
};