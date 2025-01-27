import { useState, useEffect, Dispatch, SetStateAction } from 'react';

export const generateRandomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

type typeOfResultType = "string" | "object" | "str" | "obj"; 

export function hexToRgb(hex: string, typeOfResult: typeOfResultType = "string"): string | { r: number, g: number, b: number } {
  const cleanHex = hex.replace('#', '');
  
  // Перевірка на правильність HEX-формату
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    throw new Error('Invalid HEX color');
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
  throw new Error('Invalid typeOfResult value');
}


function colorDistance(color1: { r: number, g: number, b: number }, color2: { r: number, g: number, b: number }): number {
  const dr = color1.r - color2.r;
  const dg = color1.g - color2.g;
  const db = color1.b - color2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// Функція для перевірки схожості кольорів
export function areColorsTooSimilar(hex1: string, hex2: string, threshold: number = 100): boolean {
  let color1, color2;
  
  try {
    color1 = hexToRgb(hex1, "object");
    color2 = hexToRgb(hex2, "object");
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
  expiryTime: number, // час життя у мілісекундах
  type?: "time" | null
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const savedItem = localStorage.getItem(key);
    if (savedItem) {
      try {
        const { value: storedValue, expiry, lastUpdated } = JSON.parse(savedItem);

        const now = Date.now();

        // Якщо час дії закінчився
        if (now > expiry) {
          localStorage.removeItem(key);
          return defaultValue;
        }

        // Вираховуємо, наскільки змінилось значення за пропущений час (лише якщо число)
        if (typeof storedValue === 'number' && lastUpdated && type=="time") {
          const elapsedSeconds = Math.floor((now - lastUpdated) / 1000);
          return Math.max(storedValue - elapsedSeconds, 0) as T; // уникаємо від'ємного значення
        }

        return storedValue as T;
      } catch (error) {
        console.error('Error parsing saved value from localStorage', error);
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

 
export const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};