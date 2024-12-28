export const generateRandomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export function hexToRgb(hex: string): string | null {
  // Видаляємо символ '#' на початку, якщо він присутній
  hex = hex.replace(/^#/, '');

  // Перевіряємо, чи довжина рядка становить 3 або 6 символів
  if (hex.length !== 3 && hex.length !== 6) {
    return null;
  }

  // Якщо довжина 3 символи, перетворюємо в 6 символів (наприклад, 'abc' -> 'aabbcc')
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }

  // Розбиваємо рядок на компоненти та перетворюємо їх у десяткові числа
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `${r}, ${g}, ${b}`;
}
