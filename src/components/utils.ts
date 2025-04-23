import { useState, useEffect, Dispatch, SetStateAction, useRef } from "react";
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
export function generateRandomGameId(numberOfSymbols: number): string {
  if (numberOfSymbols <= 0) throw new Error("Invalid number of symbols");

  return Array.from({ length: numberOfSymbols }, () =>
    Math.random() >= 0.5
      ? generateRandomLetters(true)
      : generateRandomNumber(0, 9).toString()
  ).join("");
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



export interface RoomParams {
  gameType: string;
  gameId: string;
  maxPlayers?: number;
  enabled: boolean;
}

export interface OnlineGameHook {
  gameState: any;
  roomInfo: any;
  error: string | null;
  createRoom: () => void;
  joinRoom: () => void;
  leaveRoom: () => void;
  updateGame: (newState: any) => void;
  getRoomInfo: (callback: (data: any) => void) => void;
  deleteRoom: () => void;
}

export function useOnlineGame({
  gameType,
  gameId,
  maxPlayers = 2,
  enabled,
}: RoomParams): OnlineGameHook {
  const [gameState, setGameState] = useState<any>(null);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Використовуємо ref для збереження екземпляра сокета
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Ініціалізація сокета, якщо ще не створено
    if (!socketRef.current) {
      socketRef.current = io("http://localhost:3001", {
        transports: ["websocket", "polling"],
      });

      socketRef.current.on("connect_error", (err) => {
        console.error("Socket connection error:", err);
        setError("Помилка підключення до сервера");
      });
    }

    const socket = socketRef.current;

    // Обробники подій
    const handleGameState = (state: any) => {
      setGameState(state);
    };

    const handleRoomUpdate = (data: any) => {
      setRoomInfo(data);
    };

    const handleError = (msg: string) => {
      setError(msg);
    };

    const handleRoomDeleted = () => {
      setGameState(null);
      setRoomInfo(null);
      setError("Кімната була видалена");
    };

    socket.on("gameState", handleGameState);
    socket.on("roomUpdate", handleRoomUpdate);
    socket.on("errorMessage", handleError);
    socket.on("roomDeleted", handleRoomDeleted);

    // Очищення при розмонтуванні або зміні параметрів
    return () => {
      socket.off("gameState", handleGameState);
      socket.off("roomUpdate", handleRoomUpdate);
      socket.off("errorMessage", handleError);
      socket.off("roomDeleted", handleRoomDeleted);
    };
  }, [enabled, gameType, gameId, maxPlayers]);

  // Функції для взаємодії з сервером
  const createRoom = () => {
    socketRef.current?.emit("createRoom", { gameType, gameId, maxPlayers });
  };

  const joinRoom = () => {
    socketRef.current?.emit("joinRoom", { gameType, gameId });
  };

  const leaveRoom = () => {
    socketRef.current?.emit("leaveRoom", { gameType, gameId });
  };

  const updateGame = (newState: any) => {
    socketRef.current?.emit("updateGame", { gameType, gameId, newState });
  };

  const getRoomInfo = (callback: (data: any) => void) => {
    socketRef.current?.emit("getRoomInfo", { gameType, gameId }, callback);
  };

  const deleteRoom = () => {
    socketRef.current?.emit("deleteRoom", { gameType, gameId });
  };

  return {
    gameState,
    roomInfo,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    updateGame,
    getRoomInfo,
    deleteRoom,
  };
}
