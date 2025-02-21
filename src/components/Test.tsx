import React, { useState, useEffect, useRef } from "react";

interface CoinTossProps {
  player1: string;
  player2: string;
}

const CoinToss: React.FC<CoinTossProps> = ({ player1, player2 }) => {
  // Поточна сторона, за якою визначається клас анімації
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2 | null>(null);
  // Ім'я, яке показуємо в <h1>
  const [displayName, setDisplayName] = useState<string>(player1);
  // Реф для монети (якщо потрібно)
  const coinRef = useRef<HTMLDivElement>(null);

  // Тривалість анімації в мілісекундах
  const animationDuration = 3000;
  // Збережемо час старту анімації
  const startTimeRef = useRef<number | null>(null);

  // Функція анімації, яка оновлює displayName залежно від кута
  const animate = (timestamp: number, targetRotation: number) => {
    if (startTimeRef.current === null) startTimeRef.current = timestamp;
    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / animationDuration, 1);

    // Для простоти – використаємо лінійну інтерполяцію.
    const currentRotation = targetRotation * progress;
    // Нормалізуємо кут до діапазону [0,360)
    const normalizedAngle = currentRotation % 360;

    // Якщо кут менше 180° – показуємо player1, інакше player2
    if (normalizedAngle < 180) {
      setDisplayName(player1);
    } else {
      setDisplayName(player2);
    }

    if (progress < 1) {
      requestAnimationFrame((ts) => animate(ts, targetRotation));
    } else {
      // Анімація завершена – можна виконати додаткові дії, якщо потрібно
    }
  };

  // Функція для старту анімації
  const startAnimation = (selectedPlayer: 1 | 2) => {
    setCurrentPlayer(selectedPlayer);
    // Обнуляємо час старту для нового циклу анімації
    startTimeRef.current = null;
    // Визначаємо кінець анімації залежно від того, який гравець переможе
    const targetRotation = selectedPlayer === 1 ? 1800 : 1980;
    requestAnimationFrame((ts) => animate(ts, targetRotation));
  };

  // Наприклад, при кліку на монету запускаємо анімацію із випадковим вибором
  const handleCoinClick = () => {
    const selectedPlayer: 1 | 2 = Math.random() < 0.5 ? 1 : 2;
    startAnimation(selectedPlayer);
  };

  return (
    <div className="pop-up">
      <div className="pick-first-player">
        <h1 className="heading">{displayName}</h1>
        <div
          id="coin"
          ref={coinRef}
          className={
            currentPlayer === 1
              ? "heads"
              : currentPlayer === 2
              ? "tails"
              : ""
          }
          onClick={handleCoinClick}
        >
          <div className="side-a"></div>
          <div className="side-b"></div>
        </div>
      </div>
    </div>
  );
};

export default CoinToss;
