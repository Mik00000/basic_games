import { useState, useEffect, Dispatch, SetStateAction, useCallback } from "react";
import { io, Socket } from "socket.io-client";
const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

export const generateRandomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export function generateRandomLetters(isUpperCaseLet: boolean = false): string {
  const isUpperCase = isUpperCaseLet ? Math.random() >= 0.5 : false;
  const randomIndex = Math.floor(Math.random() * ALPHABET.length);
  return isUpperCase
    ? ALPHABET[randomIndex].toUpperCase()
    : ALPHABET[randomIndex];
}

type typeOfResultType = "string" | "object" | "str" | "obj";

export function hexToRgb(
  hex: string,
  typeOfResult: typeOfResultType = "string"
): string | { r: number; g: number; b: number } {
  const cleanHex = hex.replace("#", "");

  // Перевірка на правильність HEX-формату
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    throw new Error("Invalid HEX color");
  }

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Перевірка, чи потрібно повертати об'єкт чи рядок
  if (typeOfResult === "object" || typeOfResult === "obj") {
    return { r, g, b };
  } else if (typeOfResult === "string" || typeOfResult === "str") {
    return `${r}, ${g}, ${b}`;
  }

  // Доданий завершальний return
  throw new Error("Invalid typeOfResult value");
}

function colorDistance(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number }
): number {
  const dr = color1.r - color2.r;
  const dg = color1.g - color2.g;
  const db = color1.b - color2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// Функція для перевірки схожості кольорів
export function areColorsTooSimilar(
  hex1: string,
  hex2: string,
  threshold: number = 100
): boolean {
  let color1, color2;

  try {
    color1 = hexToRgb(hex1, "object") as { r: number; g: number; b: number };
    color2 = hexToRgb(hex2, "object") as { r: number; g: number; b: number };
  } catch (error) {
    console.error(error);
    return false; // або тут можна повернути true/false за бажанням, якщо кольори некоректні
  }

  const distance = colorDistance(color1, color2);
  return distance < threshold;
}

type SaveableData = string | number | boolean | object | null;

export function useStickyStateWithExpiry<T extends SaveableData>(
  defaultValue: T,
  key: string,
  expiryTime: number,
  type?: "time" | null
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const savedItem = localStorage.getItem(key);
    if (savedItem) {
      try {
        const {
          value: storedValue,
          expiry,
          lastUpdated,
        } = JSON.parse(savedItem);

        const now = Date.now();

        if (now > expiry) {
          localStorage.removeItem(key);
          return defaultValue;
        }

        if (typeof storedValue === "number" && lastUpdated && type == "time") {
          const elapsedSeconds = Math.floor((now - lastUpdated) / 1000);
          return Math.max(storedValue - elapsedSeconds, 0) as T;
        }

        return storedValue as T;
      } catch (error) {
        console.error("Error parsing saved value from localStorage", error);
        return defaultValue;
      }
    }
    return defaultValue;
  });

  useEffect(() => {
    const expiry = Date.now() + expiryTime;
    const lastUpdated = Date.now();
    const itemToStore = JSON.stringify({ value, expiry, lastUpdated });
    localStorage.setItem(key, itemToStore);
  }, [key, value, expiryTime]);

  return [value, setValue];
}

export const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
};

interface GameRoomInfo {
  exists: boolean;
  players: string[];
  admin: string | null;
  maxPlayers: number;
  state: any;
}

interface RoomParams {
  gameType: string;
  gameId: string;
  maxPlayers?: number;
}

type GameState = any;

let socket: Socket | null = null;

export const useOnlineGame = (gameType: string, maxPlayers: number = 2) => {
  const [gameState, setGameState] = useState<GameState>(null);
  const [roomInfo, setRoomInfo] = useState<GameRoomInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null); // Додано adminId

  const handleError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  }, []);

  const handleRoomUpdate = useCallback((data: any) => {
    setRoomInfo({
      exists: true,
      players: data.players,
      admin: data.admin, // Оновлено
      maxPlayers: data.maxPlayers,
      state: data.state,
    });
    setAdminId(data.admin); // Оновлено
    setGameState(data.state);
  }, []);

  const handleGameState = useCallback((state: GameState) => {
    setGameState(state);
  }, []);

  const handleRoomDeleted = useCallback(() => {
    setGameState(null);
    setRoomInfo(null);
    setAdminId(null); // Оновлено
    handleError("Room was deleted");
  }, [handleError]);

  const handleAdminChanged = useCallback((newAdminId: string) => { // Додано
    setAdminId(newAdminId);
  }, []);

  useEffect(() => {
    const initializeSocket = () => {
      if (!socket) {
        socket = io("http://localhost:3001", {
          transports: ["websocket", "polling"],
          autoConnect: true,
        });

        socket.on("connect", () => {
          console.log("Socket connected");
          setError(null);
        });

        socket.on("connect_error", (err) => {
          handleError(`Connection error: ${err.message}`);
        });
      }

      socket.on("gameState", handleGameState);
      socket.on("roomUpdate", handleRoomUpdate);
      socket.on("error", handleError);
      socket.on("roomDeleted", handleRoomDeleted);
      socket.on("adminChanged", handleAdminChanged); // Додано

      return () => {
        socket?.off("gameState", handleGameState);
        socket?.off("roomUpdate", handleRoomUpdate);
        socket?.off("error", handleError);
        socket?.off("roomDeleted", handleRoomDeleted);
        socket?.off("adminChanged", handleAdminChanged); // Додано
      };
    };

    const cleanup = initializeSocket();
    return () => cleanup?.();
  }, [handleGameState, handleRoomUpdate, handleError, handleRoomDeleted, handleAdminChanged]); // Оновлено залежності

  const createRoom = useCallback((gameId: string, initialState: any) => { // Оновлено
    if (!socket) return;
    socket.emit("createRoom", { 
      gameType, 
      gameId, 
      maxPlayers, 
      initialState 
    });
  }, [gameType, maxPlayers]);

  const joinRoom = useCallback((gameId: string) => {
    if (!socket) return;
    socket.emit("joinRoom", { gameType, gameId });
  }, [gameType]);

  const leaveRoom = useCallback((gameId: string) => {
    if (!socket) return;
    socket.emit("leaveRoom", { gameType, gameId });
  }, [gameType]);

  const updateGame = useCallback((gameId: string, newState: GameState) => {
    if (!socket) return;
    socket.emit("updateGame", { gameType, gameId, newState });
  }, [gameType]);

  const getRoomInfo = useCallback((gameId: string, callback: (info: GameRoomInfo) => void) => {
    if (!socket) return;
    socket.emit("getRoomInfo", { gameType, gameId }, callback);
  }, [gameType]);

  const deleteRoom = useCallback((gameId: string) => {
    if (!socket) return;
    socket.emit("deleteRoom", { gameType, gameId });
  }, [gameType]);

  return {
    gameState,
    roomInfo,
    adminId, // Додано
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    updateGame,
    getRoomInfo,
    deleteRoom,
  };
};

export const generateRandomGameId = (numberOfSymbols: number): string => {
  if (numberOfSymbols <= 0) throw new Error("Invalid number of symbols");

  const getRandomChar = () => {
    const isLetter = Math.random() > 0.5;
    if (isLetter) {
      const isUpperCase = Math.random() > 0.5;
      const randomIndex = Math.floor(Math.random() * ALPHABET.length);
      return isUpperCase
        ? ALPHABET[randomIndex].toUpperCase()
        : ALPHABET[randomIndex];
    }
    return Math.floor(Math.random() * 10).toString();
  };

  return Array.from({ length: numberOfSymbols }, getRandomChar).join("");
};

export const checkOnlineGame = async (
  gameType: string,
  gameId: string
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const tempSocket = io("http://localhost:3001", {
      transports: ["websocket"],
      autoConnect: true,
    });

    const timeout = setTimeout(() => {
      tempSocket.disconnect();
      reject(new Error("Connection timeout"));
    }, 5000);

    tempSocket.on("connect", () => {
      tempSocket.emit("getRoomInfo", { gameType, gameId }, (data: any) => {
        clearTimeout(timeout);
        tempSocket.disconnect();
        resolve(data.exists);
      });
    });

    tempSocket.on("connect_error", (err) => {
      clearTimeout(timeout);
      tempSocket.disconnect();
      reject(err);
    });
  });
};

