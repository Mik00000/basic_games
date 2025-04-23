import { useState, useEffect, Dispatch, SetStateAction, useRef, useCallback } from "react";
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



interface RoomParams {
  gameType: string;
  gameId: string;
  maxPlayers?: number;
  enabled: boolean;
}

interface GameState {
  field: number[][];
  currentPlayer: number | null;
  winner: number | null;
  lastChecker: { row: number; col: number } | null;
  isNewGame: boolean;
  showCoinToss: boolean;
}

export function useOnlineGame({ 
  gameType, 
  gameId, 
  maxPlayers = 2, 
  enabled 
}: RoomParams) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const stableParams = JSON.stringify({ gameType, gameId, maxPlayers });

  const handleError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const newSocket = io("http://localhost:3001", {
      autoConnect: false,
      reconnectionAttempts: 3,
      timeout: 5000,
    });

    newSocket.on("connect", () => {
      console.log("Connected to server");
    });

    newSocket.on("connect_error", (err) => {
      handleError("Connection error: " + err.message);
    });

    newSocket.on("gameState", (state: GameState) => {
      setGameState(state);
    });

    newSocket.on("roomUpdate", ({ players, state }) => {
      setPlayers(players);
      if (state) setGameState(state);
    });

    newSocket.on("error", handleError);

    newSocket.connect();
    socketRef.current = newSocket;

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setGameState(null);
      setPlayers([]);
    };
  }, [enabled, handleError]);

  const createRoom = useCallback(() => {
    if (!socketRef.current) return;
    
    socketRef.current.emit("createRoom", { 
      gameType, 
      gameId, 
      maxPlayers 
    }, (res: { error?: string }) => {
      if (res.error) handleError(res.error);
    });
  }, [stableParams, handleError]);

  const joinRoom = useCallback(() => {
    if (!socketRef.current) return;

    socketRef.current.emit("joinRoom", { 
      gameType, 
      gameId 
    }, (res: { error?: string }) => {
      if (res.error) handleError(res.error);
    });
  }, [stableParams, handleError]);

  const leaveRoom = useCallback(() => {
    if (!socketRef.current) return;
    
    socketRef.current.emit("leaveRoom", { gameType, gameId });
  }, [stableParams]);

  const updateGame = useCallback((newState: GameState) => {
    if (!socketRef.current) return;
    
    socketRef.current.emit("updateGame", { 
      gameType, 
      gameId, 
      newState 
    });
  }, [stableParams]);

  return {
    gameState,
    players,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    updateGame,
    isConnected: socketRef.current?.connected || false
  };
}

// Генератор ID гри (додати в потрібне місце)
export const generateGameId = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
};