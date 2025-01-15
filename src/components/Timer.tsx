import React, { useEffect, useState } from "react";
import { formatTime, useStickyStateWithExpiry } from "./utils.ts";

interface TimerProps {
  startTime: number;
  timerName: string;
  timeToForgotTimer?: number;
  pause?: boolean;
  setTime?: number | null;
}

const Timer: React.FC<TimerProps> = ({
  startTime,
  timerName,
  timeToForgotTimer = 0,
  pause = false,
  setTime = null,
}) => {
  const [seconds, setSeconds] = useStickyStateWithExpiry(
    startTime,
    timerName,
    timeToForgotTimer,
    "time"
  );
  const [isRunning, setIsRunning] = useState(!pause);

  // Синхронізація стану isRunning із пропсом pause
  useEffect(() => {
    setIsRunning(!pause);
  }, [pause]);
  useEffect(() => {
    if (setTime !== null) setSeconds(setTime);
  }, [setTime]);
  useEffect(() => {
    if (!isRunning) return; // Якщо таймер на паузі, не запускаємо інтервал

    const interval = setInterval(() => {
      setSeconds((prev) => Math.max(prev - 1, 0)); // Запобігаємо негативному часу
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, setSeconds]);

  return (
    <div>
      <h1>Timer: {formatTime(seconds)}s</h1>
    </div>
  );
};

export default Timer;
