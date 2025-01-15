import React, { useState } from "react";
import { CountdownCircleTimer } from "react-countdown-circle-timer";

const Test: React.FC = () => {
  // State для ключа, який використовується для перезапуску таймера
  const [key, setKey] = useState(0);

  // Функція для перезапуску таймера
  const handleRestart = () => {
    setKey((prevKey) => prevKey + 1);
  };

  return (
    <div style={{ textAlign: "center" }}>
      <CountdownCircleTimer
        key={key} // Використовуємо ключ для перезапуску
        isPlaying
        duration={10} // Тривалість таймера в секундах
        colors={["#004777", "#F7B801", "#A30000", "#A30000"]}
        colorsTime={[10, 6, 3, 0]} // Кольори змінюються залежно від часу
        onComplete={() => {
          // Таймер завершується, але можна виконати якусь дію
          console.log("Timer completed");
          return { shouldRepeat: false }; // Не повторювати автоматично
        }}
      >
        {({ remainingTime }) => (
          <div>
            <p style={{ fontSize: "24px", fontWeight: "bold" }}>{remainingTime}</p>
            <p>seconds</p>
          </div>
        )}
      </CountdownCircleTimer>
      <button
        onClick={handleRestart}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          fontSize: "16px",
          cursor: "pointer",
          borderRadius: "5px",
          border: "none",
          backgroundColor: "#007BFF",
          color: "white",
        }}
      >
        Restart Timer
      </button>
    </div>
  );
};

export default Test;
