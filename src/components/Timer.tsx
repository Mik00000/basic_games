import React, { useEffect, useState, useRef } from "react";
import { formatTime, useStickyStateWithExpiry } from "./utils.ts";

interface TimerProps {
  startTime: number;  // Час у мілісекундах
  timerName: string;
  timeToForgotTimer?: number;
  pause?: boolean;
  onComplete?: any;
}

const Timer: React.FC<TimerProps> = ({
  startTime,
  timerName,
  timeToForgotTimer = 0,
  pause = false,
  onComplete
}) => {
  const [milliseconds, setMilliseconds] = useStickyStateWithExpiry(
    startTime,
    timerName,
    timeToForgotTimer,
    "time"
  );
  const [isRunning, setIsRunning] = useState(!pause);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Синхронізуємо isRunning з паузою
    setIsRunning(!pause);
  }, [pause]);

  useEffect(() => {
    if (isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current); // очищаємо попередній інтервал

      intervalRef.current = setInterval(() => {
        setMilliseconds((prev) => Math.max(prev - 10, 0)); // Зменшуємо на 100 мс
      }, 10); // Запускаємо інтервал кожні 100 мс
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current); // зупиняємо інтервал, коли таймер на паузі
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current); // очищаємо інтервал при размонтуванні компонента
    };
  }, [isRunning, setMilliseconds]);

  useEffect(() => {
    if (milliseconds === 0 && onComplete) {
      onComplete();
    }
  }, [milliseconds, onComplete]);

  // Перетворюємо мілісекунди в формат для виведення
  // const formatMilliseconds = (ms: number) => {
  //   const seconds = Math.floor(ms / 1000);
  //   const milliseconds = Math.floor((ms % 1000)/100);
  //   return `${seconds}:${milliseconds}`;
  // };
  // formatMilliseconds(milliseconds)
  return (
    <div className="number-timer">
      <h1>{Math.floor(milliseconds / 1000)}s</h1>
    </div>
  );
};

export default Timer;
