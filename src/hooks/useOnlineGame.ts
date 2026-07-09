"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import type { VoteType } from "../types/gameTypes";
import type {
  GameState,
  Player,
  GameRoom,
  ChatMessage,
  CreateRoomData,
  JoinRoomData,
  CallbackResponse,
  ServerToClientEvents,
  ClientToServerEvents,
  RolePermissions,
} from "../types/gameTypes";

interface UseOnlineGameOptions {
  serverUrl?: string;
  autoReconnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface UseOnlineGameReturn<T extends GameState> {
  isConnected: boolean;
  isConnecting: boolean;
  socketId: string | null;
  currentRoom: Partial<GameRoom> | null;
  currentPlayer: Player | null;
  gameState: T | null;
  canUndo: boolean;
  canRedo: boolean;
  chatMessages: ChatMessage[];
  error: string | null;
  errorDetails: any | null; // For more complex error handling
  isRateLimited: boolean;
  inactivityWarning: { message: string; timeLeft: number } | null;
  createRoom: (
    data: Omit<CreateRoomData, "initialState"> & { initialState: T },
  ) => Promise<CallbackResponse>;
  joinRoom: (data: JoinRoomData) => Promise<CallbackResponse>;
  leaveRoom: () => Promise<CallbackResponse>;
  startGame: (
    options?: { randomSeed?: number; whitePlayerId?: string } | null,
  ) => Promise<CallbackResponse>;
  makeMove: (moveData: unknown) => Promise<CallbackResponse>;
  sendChatMessage: (text: string) => Promise<CallbackResponse>;
  sendVote: (type: VoteType) => Promise<CallbackResponse>;
  undoMove: () => Promise<CallbackResponse>;
  redoMove: () => Promise<CallbackResponse>;
  updateRolePermissions: (
    role: string,
    permissions: Partial<RolePermissions>,
  ) => Promise<CallbackResponse>;
  updatePlayerData: (data: {
    username?: string;
    color?: string;
    [key: string]: unknown;
  }) => Promise<CallbackResponse>;
  clearError: () => void;
  reconnect: () => void;
  disconnect: () => void;
  sendHeartbeat: () => Promise<CallbackResponse>;
}

// 1. Глобальна змінна для сокета (Singleton pattern)
let globalSocket: Socket<ServerToClientEvents, ClientToServerEvents> | null =
  null;

export function useOnlineGame<T extends GameState = GameState>(
  options: UseOnlineGameOptions = {},
): UseOnlineGameReturn<T> {
  const {
    serverUrl = import.meta.env.REACT_APP_SOCKET_SERVER_URL ||
      "http://localhost:4001",
    autoReconnect = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Partial<GameRoom> | null>(
    null,
  );
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [gameState, setGameState] = useState<T | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [inactivityWarning, setInactivityWarning] = useState<{
    message: string;
    timeLeft: number;
  } | null>(null);

  // useRef для збереження посилання на поточні стейт-сеттери
  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);

  useEffect(() => {
    // 2. Ініціалізація глобального сокета, якщо його ще немає
    if (!globalSocket) {
      setIsConnecting(true);
      globalSocket = io(serverUrl, {
        transports: ["websocket", "polling"],
        autoConnect: true,
        reconnection: autoReconnect,
        reconnectionAttempts,
        reconnectionDelay,
        timeout: 20000,
      });
    } else if (!globalSocket.connected) {
      // Якщо сокет є, але від'єднаний (наприклад, після виходу в меню) - під'єднуємось
      setIsConnecting(true);
      globalSocket.connect();
    }

    const socket = globalSocket;
    socketRef.current = socket;

    // Оновлюємо локальний стан підключення одразу
    setIsConnected(socket.connected);
    setSocketId(socket.id || null);

    // --- Визначаємо обробники подій ---

    const onConnect = () => {
      setIsConnected(true);
      setIsConnecting(false);
      setSocketId(socket.id || null);
      setError(null);
    };

    const onDisconnect = (reason: string) => {
      setIsConnected(false);
      setSocketId(null);
      if (reason === "io server disconnect") socket.connect();
    };

    const onConnectError = (err: Error) => {
      console.error("🔌 Connection error:", err);
      setIsConnecting(false);
      setError(`Connection failed: ${err.message}`);
    };

    const onRoomCreated = ({ room }: { roomId: string; room: GameRoom }) => {
      setCurrentRoom(room);
      setGameState(room.state as T);
      setChatMessages(room.chatHistory || []);
    };

    const onRoomJoined = ({
      room,
      player,
    }: {
      room: GameRoom;
      player: Player;
    }) => {
      setCurrentRoom(room);
      setCurrentPlayer(player);
      setGameState(room.state as T);
      setChatMessages(room.chatHistory || []);
    };

    const onSessionRestored = ({
      room,
      player,
    }: {
      room: GameRoom;
      player: Player;
      gameData?: unknown;
    }) => {
      setCurrentRoom(room);
      setCurrentPlayer(player);
      setGameState(room.state as T);
      setChatMessages(room.chatHistory || []);
    };

    const onRoomUpdated = ({ room }: { room: GameRoom }) => {
      setCurrentRoom(room);
      if (room.state) setGameState(room.state as T);
    };

    const onGameStateUpdated = ({
      state,
      canUndo,
      canRedo,
    }: {
      state: GameState;
      canUndo: boolean;
      canRedo: boolean;
    }) => {
      setGameState(state as T);
      setCanUndo(canUndo);
      setCanRedo(canRedo);
    };

    const onChatMessage = (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message]);
    };
    const onRoomLeft = () => {
      setCurrentRoom(null);
      setCurrentPlayer(null);
      setGameState(null);
      setChatMessages([]);
      localStorage.removeItem("game_session");
    };

    const onError = ({
      code,
      message,
      details,
    }: {
      code: string;
      message: string;
      details?: any;
    }) => {
      console.error("❌ Error:", code, message);
      setError(`${code}: ${message}`);
      if (details) setErrorDetails(details);
    };

    const onInactivityWarning = (data: {
      message: string;
      timeLeft: number;
    }) => {
      setInactivityWarning(data);
    };

    // --- Підписуємось на події ---
    // Якщо TS свариться на назви подій, переконайтеся, що вони є в ServerToClientEvents
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("roomCreated", onRoomCreated);
    socket.on("roomJoined", onRoomJoined);
    socket.on("sessionRestored", onSessionRestored);
    socket.on("roomUpdated", onRoomUpdated);
    socket.on("gameStateUpdated", onGameStateUpdated);
    socket.on("chatMessage", onChatMessage);
    socket.on("roomLeft", onRoomLeft);
    socket.on("error", onError);
    socket.on("inactivityWarning", onInactivityWarning);

    // Додаткові події
    socket.on("gameStarted", () => {});
    socket.on("playerJoined", (p: Player) => {});

    // 3. CLEANUP
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("roomCreated", onRoomCreated);
      socket.off("roomJoined", onRoomJoined);
      socket.off("sessionRestored", onSessionRestored);
      socket.off("roomUpdated", onRoomUpdated);
      socket.off("gameStateUpdated", onGameStateUpdated);
      socket.off("chatMessage", onChatMessage);
      socket.off("roomLeft", onRoomLeft);
      socket.off("error", onError);
      socket.off("inactivityWarning", onInactivityWarning);
    };
  }, [serverUrl, autoReconnect, reconnectionAttempts, reconnectionDelay]);

  // Логіка авто-реконнекту
  useEffect(() => {
    if (isConnected && !currentRoom && !currentPlayer && globalSocket) {
      const savedSession = localStorage.getItem("game_session");
      if (savedSession) {
        try {
          const { roomId, playerId, username } = JSON.parse(savedSession);
          globalSocket.emit(
            "rejoinRoom",
            { roomId, playerId, username },
            (res) => {
              if (!res.success) localStorage.removeItem("game_session");
            },
          );
        } catch (e) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          console.error("Failed to parse session", e);
          localStorage.removeItem("game_session");
        }
      }
    }
  }, [isConnected, currentRoom, currentPlayer]);

  // Збереження сесії
  useEffect(() => {
    if (currentRoom?.id && currentPlayer?.id) {
      localStorage.setItem(
        "game_session",
        JSON.stringify({
          roomId: currentRoom.id,
          playerId: currentPlayer.id,
          username: currentPlayer.username,
        }),
      );
    }
  }, [currentRoom?.id, currentPlayer?.id, currentPlayer?.username]);

  // --- Actions ---

  const createRoom = useCallback(
    async (
      data: Omit<CreateRoomData, "initialState"> & {
        initialState: T;
        force?: boolean;
      },
    ) => {
      if (!globalSocket || !globalSocket.connected)
        return {
          success: false,
          error: { code: "OFFLINE", message: "Offline" },
        };
      return new Promise<CallbackResponse>((resolve) => {
        const timeout = setTimeout(() => {
          resolve({
            success: false,
            error: { code: "TIMEOUT", message: "Server request timed out" },
          });
        }, 5000); // 5s timeout

        globalSocket!.emit("createRoom", data, (res: CallbackResponse) => {
          clearTimeout(timeout);
          resolve(res);
        });
      });
    },
    [],
  );

  const joinRoom = useCallback(
    async (data: JoinRoomData & { force?: boolean }) => {
      if (!globalSocket || !globalSocket.connected)
        return {
          success: false,
          error: { code: "OFFLINE", message: "Offline" },
        };

      // Clear local state immediately to prevents "zombie" UI state.
      if (data.force) {
        setCurrentRoom(null);
        setCurrentPlayer(null);
        setGameState(null);
        setChatMessages([]);
        localStorage.removeItem("game_session");
      }

      return new Promise<CallbackResponse>((resolve) => {
        const timeout = setTimeout(() => {
          resolve({
            success: false,
            error: { code: "TIMEOUT", message: "Server request timed out" },
          });
        }, 5000); // 5s timeout

        globalSocket!.emit("joinRoom", data, (res: CallbackResponse) => {
          clearTimeout(timeout);
          resolve(res);
        });
      });
    },
    [],
  );

  const leaveRoom = useCallback(async () => {
    if (!globalSocket || !globalSocket.connected)
      return { success: false, error: { code: "OFFLINE", message: "Offline" } };
    return new Promise<CallbackResponse>((resolve) => {
      globalSocket!.emit("leaveRoom", (response) => {
        if (response.success) {
          setError(null);
          localStorage.removeItem("game_session");
        }
        resolve(response);
      });
    });
  }, []);

  const startGame = useCallback(
    async (
      options: { randomSeed?: number; whitePlayerId?: string } | null = null,
    ) => {
      if (!globalSocket || !globalSocket.connected)
        return {
          success: false,
          error: { code: "OFFLINE", message: "Offline" },
        };
      return new Promise<CallbackResponse>((resolve) =>
        globalSocket!.emit("startGame", options, resolve),
      );
    },
    [],
  );

  const makeMove = useCallback(async (moveData: unknown) => {
    if (!globalSocket || !globalSocket.connected)
      return { success: false, error: { code: "OFFLINE", message: "Offline" } };
    return new Promise<CallbackResponse>((resolve) => {
      globalSocket!.emit("makeMove", moveData, (response) => {
        if (response.success) setError(null);
        else setError(response.error?.message || "Failed to make move");
        resolve(response);
      });
    });
  }, []);

  const sendChatMessage = useCallback(async (text: string) => {
    if (!globalSocket || !globalSocket.connected)
      return { success: false, error: { code: "OFFLINE", message: "Offline" } };
    return new Promise<CallbackResponse>((resolve) =>
      globalSocket!.emit("sendChatMessage", { text }, resolve),
    );
  }, []);

  const sendVote = useCallback(async (type: VoteType) => {
    if (!globalSocket || !globalSocket.connected)
      return { success: false, error: { code: "OFFLINE", message: "Offline" } };
    return new Promise<CallbackResponse>((resolve) =>
      globalSocket!.emit("sendVote", { type }, resolve),
    );
  }, []);

  const undoMove = useCallback(async () => {
    if (!globalSocket) return { success: false };
    return new Promise<CallbackResponse>((resolve) =>
      globalSocket!.emit("undoMove", resolve),
    );
  }, []);

  const redoMove = useCallback(async () => {
    if (!globalSocket) return { success: false };
    return new Promise<CallbackResponse>((resolve) =>
      globalSocket!.emit("redoMove", resolve),
    );
  }, []);

  const updateRolePermissions = useCallback(
    async (role: string, permissions: Partial<RolePermissions>) => {
      if (!globalSocket) return { success: false };
      return new Promise<CallbackResponse>((resolve) =>
        globalSocket!.emit(
          "updateRolePermissions",
          { role, permissions },
          resolve,
        ),
      );
    },
    [],
  );

  const updatePlayerData = useCallback(
    async (data: {
      username?: string;
      color?: string;
      [key: string]: unknown;
    }) => {
      if (!globalSocket) return { success: false };
      // Оновлення передаємо як { gameData: data }
      return new Promise<CallbackResponse>((resolve) =>
        globalSocket!.emit("updatePlayerData", { gameData: data }, resolve),
      );
    },
    [],
  );

  const clearError = useCallback(() => {
    setError(null);
    setIsRateLimited(false);
  }, []);
  const reconnect = useCallback(() => globalSocket?.connect(), []);

  const manualDisconnect = useCallback(() => {
    if (globalSocket) {
      globalSocket.disconnect();
    }
  }, []);

  const sendHeartbeat = useCallback(async () => {
    if (!globalSocket || !globalSocket.connected) return { success: false };
    setInactivityWarning(null); // Clear local warning instantly on action
    return new Promise<CallbackResponse>((resolve) =>
      globalSocket!.emit("heartbeat", resolve),
    );
  }, []);

  return {
    isConnected,
    isConnecting,
    socketId,
    currentRoom,
    currentPlayer,
    gameState,
    canUndo,
    canRedo,
    chatMessages,
    error,
    errorDetails,
    isRateLimited,
    inactivityWarning,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    makeMove,
    sendChatMessage,
    undoMove,
    redoMove,
    updateRolePermissions,
    updatePlayerData,
    clearError,
    reconnect,
    disconnect: manualDisconnect,
    sendVote,
    sendHeartbeat,
  };
}
