import { useState, useEffect, Dispatch, SetStateAction } from "react";
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
}

type GameState = any;

// Використовуємо єдиний екземпляр сокета для всього додатку
let socket: Socket | null = null;

/**
 * Хук для роботи з онлайн-грою, який забезпечує можливість:
 * - Створювати кімнату
 * - Приєднуватись до кімнати
 * - Покидати кімнату
 * - Оновлювати стан гри
 * - Отримувати інформацію про кімнату
 *
 * @param params - Об'єкт, що містить тип гри, id гри та максимальну кількість гравців
 * @param enabled - Якщо false, онлайн-режим не активується
 * @returns Об'єкт з поточним станом гри, інформацією про кімнату, помилками, а також функціями для роботи з кімнатою
 *
 * Приклад використання:
 * const { gameState, createRoom, joinRoom, leaveRoom, updateGame, getRoomInfo, deleteRoom, error } = useOnlineGame({ gameType: 'chess', gameId: '123', maxPlayers: 2, enabled: true });
 */
export function useOnlineGame({ gameType, gameId, maxPlayers = 2, enabled }: RoomParams & { enabled: boolean }) {
  const [gameState, setGameState] = useState<GameState>(null);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    // Ініціалізуємо сокет, якщо ще не створено
    if (!socket) {
      socket = io("http://localhost:3001",{
        transports: ["websocket", "polling"],
      });
    }

    // Обробник отримання оновленого стану гри
    const handleGameState = (state: GameState) => {
      setGameState(state);
    };

    // Обробник оновлення інформації про кімнату (наприклад, список гравців)
    const handleRoomUpdate = (data: any) => {
      setRoomInfo(data);
    };

    // Обробник повідомлень про помилки
    const handleError = (msg: string) => {
      setError(msg);
    };

    // Обробник події видалення кімнати
    const handleRoomDeleted = () => {
      setGameState(null);
      setRoomInfo(null);
      setError("Кімната була видалена");
    };

    // Підписуємось на події від сервера
    socket.on("gameState", handleGameState);
    socket.on("roomUpdate", handleRoomUpdate);
    socket.on("errorMessage", handleError);
    socket.on("roomDeleted", handleRoomDeleted);

    return () => {
      // При демонтажі компонента відписуємось від подій
      socket?.off("gameState", handleGameState);
      socket?.off("roomUpdate", handleRoomUpdate);
      socket?.off("errorMessage", handleError);
      socket?.off("roomDeleted", handleRoomDeleted);
    };
  }, [enabled, gameType, gameId, maxPlayers]);

  /**
   * Функція для створення нової кімнати.
   * Використання: викликається для ініціалізації нової гри.
   *
   * Параметри: немає (значення передаються через useOnlineGame хук).
   * Повертає: нічого.
   */
  const createRoom = () => {
    if (socket) {
      socket.emit("createRoom", { gameType, gameId, maxPlayers });
    }
  };

  /**
   * Функція для приєднання до існуючої кімнати.
   *
   * Параметри: немає (значення передаються через useOnlineGame хук).
   * Повертає: нічого.
   */
  const joinRoom = () => {
    if (socket) {
      socket.emit("joinRoom", { gameType, gameId, maxPlayers });
    }
  };

  /**
   * Функція для виходу з кімнати.
   *
   * Параметри: немає (значення передаються через useOnlineGame хук).
   * Повертає: нічого.
   */
  const leaveRoom = () => {
    if (socket) {
      socket.emit("leaveRoom", { gameType, gameId });
    }
  };

  /**
   * Функція для оновлення стану гри.
   *
   * @param newState - Об'єкт з новим станом гри.
   *
   * Повертає: нічого.
   */
  const updateGame = (newState: any) => {
    if (socket) {
      socket.emit("updateGame", { gameType, gameId, newState });
    }
  };

  /**
   * Функція для отримання інформації про кімнату.
   *
   * @param callback - Функція зворотного виклику, яка отримує інформацію про кімнату.
   *                 Наприклад, { exists: boolean, players: string[], maxPlayers: number, state: any }
   *
   * Повертає: нічого, інформація повертається через callback.
   */
  const getRoomInfo = (callback: (info: any) => void) => {
    if (socket) {
      socket.emit("getRoomInfo", { gameType, gameId }, (data: any) => {
        callback(data);
      });
    }
  };

  /**
   * Функція для видалення кімнати.
   *
   * Параметри: немає (значення передаються через useOnlineGame хук).
   * Повертає: нічого.
   */
  const deleteRoom = () => {
    if (socket) {
      socket.emit("deleteRoom", { gameType, gameId });
    }
  };

  return { gameState, roomInfo, error, createRoom, joinRoom, leaveRoom, updateGame, getRoomInfo, deleteRoom };
}

/**
 * Асинхронна функція для перевірки існування кімнати.
 *
 * @param gameType - Тип гри.
 * @param gameId - Унікальний ідентифікатор гри.
 * @returns Promise, який повертає true, якщо кімната існує, або false, якщо ні.
 *
 * Приклад використання:
 * const exists = await checkOnlineGame('chess', '123');
 */
export async function checkOnlineGame(gameType: string, gameId: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const tempSocket = io("http://localhost:3001", {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
    tempSocket.on("connect", () => {
      tempSocket.emit("getRoomInfo", { gameType, gameId }, (data: any) => {
        tempSocket.disconnect();
        resolve(data.exists);
      });
    });
    tempSocket.on("connect_error", (err) => {
      tempSocket.disconnect();
      reject(err);
    });
    // Додатково можна встановити таймаут, якщо з'єднання не відбувається
    setTimeout(() => {
      if (!tempSocket.connected) {
        tempSocket.disconnect();
        reject(new Error("Timeout while connecting to socket"));
      }
    }, 5000);
  });
}
