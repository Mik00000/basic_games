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

let socketInstance: Socket | null = null; // Змінено назву, щоб уникнути конфлікту з socketId

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
  gameTypeFromProps: string, // Перейменовано, щоб уникнути конфлікту з gameType у roomInfo
  maxPlayersFromProps: number = 2 // Перейменовано
) => {
  // Стан gameState тепер буде містити тільки сам стан гри
  const [gameState, setGameState] = useState<TGameState | null>(null);
  // roomInfo буде містити всю інформацію про кімнату
  const [roomInfo, setRoomInfo] = useState<GameRoomInfo<TGameState> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);


  const handleError = useCallback((msg: string) => {
    console.error("OnlineGame Error:", msg);
    setError(msg);
    // Немає потреби в setTimeout тут, помилка буде видима, доки не зникне або не зміниться
  }, []);

  // Обробник для всіх оновлень кімнати
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
    // Не встановлюємо тут помилку, оскільки це може бути очікувана подія
    // Замість цього, можна показати повідомлення користувачу
    console.warn("RoomDeleted:", message);
    // Можна додати спеціальний стан, наприклад, setRoomStatus('deleted')
    // setError(message); // Якщо це завжди вважати помилкою для користувача
  }, []);

  const handleAdminChanged = useCallback((newAdminId: string) => {
    // Ця подія тепер дублюється `roomUpdate`, але може бути корисною для логування
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
      setSocketId(null);
      // Не скидаємо roomInfo та gameState тут, бо може бути перепідключення
      if (reason === "io server disconnect") {
        handleError("Disconnected by server.");
        handleRoomDeleted("Disconnected by server, room may no longer exist.");
      } else if (reason === "io client disconnect") {
        // Клієнт сам викликав disconnect, наприклад, при leaveRoom
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

    // Головний слухач для оновлень кімнати
    currentSocket.on("roomUpdate", handleRoomUpdate);
    // Слухач для помилок від сервера
    currentSocket.on("error", onErrorEvent);
    // Слухач для видалення кімнати
    currentSocket.on("roomDeleted", handleRoomDeleted);
    // Слухач для зміни адміна (може бути частиною roomUpdate)
    currentSocket.on("adminChanged", handleAdminChanged); // Можливо, варто прибрати, якщо roomUpdate покриває

    // Функція очищення
    return () => {
      currentSocket.off("connect", onConnect);
      currentSocket.off("connect_error", onConnectError);
      currentSocket.off("disconnect", onDisconnect);
      currentSocket.off("roomUpdate", handleRoomUpdate);
      currentSocket.off("error", onErrorEvent);
      currentSocket.off("roomDeleted", handleRoomDeleted);
      currentSocket.off("adminChanged", handleAdminChanged);

      // Розглянути, чи потрібно відключати сокет при розмонтуванні компонента,
      // що використовує хук. Якщо хук використовується в багатьох місцях,
      // то, можливо, не варто відключати тут, а керувати цим глобальніше.
      // if (socketInstance && socketInstance.active && ShouldDisconnectOnUnmount) {
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
      initialState // Надсилаємо initialState
    });
  }, [gameTypeFromProps, maxPlayersFromProps, ensureConnected, handleError]); // Додано handleError


  const joinRoom = useCallback((gameId: string, type = gameTypeFromProps) => {
    if (!ensureConnected() || !socketInstance) return;
    console.log(`Attempting to join room: ${type}_${gameId}`);
    socketInstance.emit("joinRoom", { gameType: type, gameId });
  }, [gameTypeFromProps, ensureConnected, handleError]); // Додано handleError

  const leaveRoom = useCallback((gameId: string, type = gameTypeFromProps) => {
    if (!socketInstance) { // Не обов'язково бути підключеним, щоб спробувати вийти
        console.warn("Socket not available for leaveRoom, room info will be cleared locally.");
    }
    socketInstance?.emit("leaveRoom", { gameType: type, gameId });
    // Негайно скидаємо стан локально для кращого UX
    setGameState(null);
    setRoomInfo(null);
    // Не скидаємо socketId та isConnected, оскільки з'єднання може бути активним
    console.log(`Left room: ${type}_${gameId}`);
  }, [gameTypeFromProps]); // handleError тут не потрібен, бо вихід - це дія користувача


  const updateGame = useCallback((gameId: string, newState: TGameState, type = gameTypeFromProps) => {
    if (!ensureConnected() || !socketInstance) return;
    socketInstance.emit("updateGame", {
        gameType: type,
        gameId,
        newState
    });
  }, [gameTypeFromProps, ensureConnected, handleError]);


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
  }, [gameTypeFromProps, ensureConnected, handleError]);


  const deleteRoom = useCallback((gameId: string, type = gameTypeFromProps) => {
    if (!ensureConnected() || !socketInstance) return;
    // Тут можна додати перевірку, чи поточний користувач є адміном (roomInfo?.admin === socketId)
    // але остаточне рішення все одно за сервером.
    socketInstance.emit("deleteRoom", { gameType: type, gameId });
  }, [gameTypeFromProps, ensureConnected, handleError]);


  return {
    socketId,
    isConnected,
    gameState, // Тільки стан гри
    roomInfo,  // Повна інформація про кімнату (включаючи гравців, адміна, стан гри)
    isAdmin: roomInfo?.admin === socketId && !!socketId, // Додано перевірку на !!socketId
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
): Promise<GameRoomInfo | { exists: false }> => { // Повертає більше інформації
  return new Promise((resolve, reject) => {
    const serverUrl = process.env.REACT_APP_SOCKET_SERVER_URL || "http://localhost:3001";
    // Використовуємо існуючий екземпляр сокета, якщо він є і підключений,
    // або створюємо тимчасовий, якщо це одноразова перевірка без активного хука.
    // Для простоти, тут завжди створюємо тимчасовий.

    let tempSocket: Socket | null = null;
    try {
        tempSocket = io(serverUrl, {
          transports: ["websocket"],
          autoConnect: false, // Підключаємо вручну
          timeout: 5000,
          reconnection: false,
        });
    } catch (e) {
        console.error("Failed to create temporary socket:", e);
        return reject(new Error("Failed to initialize connection for game check."));
    }


    const localSocket = tempSocket; // Для використання в таймауті та обробниках

    const connectionTimeout = setTimeout(() => {
      localSocket.disconnect();
      console.warn("checkOnlineGame: Connection timeout.");
      // Замість reject, можна повернути { exists: false }
      resolve({ exists: false });
      // reject(new Error("Connection timeout while checking game status."));
    }, 5000);

    localSocket.on("connect", () => {
      localSocket.emit("getRoomInfo", { gameType, gameId }, (data: any) => {
        clearTimeout(connectionTimeout);
        localSocket.disconnect();
        if (data && typeof data.exists === 'boolean') {
          resolve(data as GameRoomInfo | { exists: false });
        } else {
          console.warn("Unexpected data structure from getRoomInfo in checkOnlineGame:", data);
          resolve({ exists: false });
        }
      });
    });

    localSocket.on("connect_error", (err:any) => {
      clearTimeout(connectionTimeout);
      localSocket.disconnect();
      console.error("Connection error in checkOnlineGame:", err);
      // Замість reject, можна повернути { exists: false }
      resolve({ exists: false });
      // reject(err);
    });

    localSocket.connect(); // Підключаємо вручну
  });
};