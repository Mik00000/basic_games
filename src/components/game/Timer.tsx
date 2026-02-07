import React, {
  useEffect,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useStickyStateWithExpiry } from "../common/utils";

interface TimerProps {
  startTime: number;
  timerName: string;
  timeToForgotTimer?: number;
  pause?: boolean;
  onComplete?: any;
  isGrowing?: boolean;
  className?: string;
  // НОВІ ПРОПСИ ДЛЯ ОНЛАЙНУ
  syncTime?: number; // Якщо передано, таймер форсується до цього часу
  isServerControlled?: boolean; // Прапорець режиму
}

export interface TimerHandle {
  reset: () => void;
}

const Timer = forwardRef<TimerHandle, TimerProps>(
  (
    {
      startTime,
      timerName,
      timeToForgotTimer = 0,
      pause = false,
      onComplete,
      isGrowing = false,
      className,
      syncTime,
      isServerControlled = false,
    },
    ref,
  ) => {
    // Локальний хук використовуємо тільки якщо це НЕ серверний режим
    const [storedMilliseconds, setStoredMilliseconds] =
      useStickyStateWithExpiry(startTime, timerName, timeToForgotTimer, "time");

    // Внутрішній стейт для відображення
    const [milliseconds, setMilliseconds] = useState(
      isServerControlled && syncTime !== undefined
        ? syncTime
        : storedMilliseconds,
    );

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const reset = () => {
      const time = startTime;
      setMilliseconds(time);
      if (!isServerControlled) setStoredMilliseconds(time);
    };

    useImperativeHandle(ref, () => ({ reset }));

    // 1. СИНХРОНІЗАЦІЯ З СЕРВЕРОМ
    // Ми прибрали useEffect, що викликав setMilliseconds(syncTime),
    // щоб уникнути помилки "setState synchronously within an effect".
    // Тепер ми просто використовуємо syncTime безпосередньо при рендері (див. displayTime нижче).

    // 2. ІНТЕРВАЛ (Тікання)
    useEffect(() => {
      // Якщо на паузі, час вийшов АБО керує сервер - стоп локальний інтервал
      if (pause || (!isGrowing && milliseconds <= 0) || isServerControlled) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

      intervalRef.current = setInterval(() => {
        setMilliseconds((prev) => {
          const nextVal = Math.max(isGrowing ? prev + 10 : prev - 10, 0);

          // В локальному режимі зберігаємо в localStorage
          if (!isServerControlled) {
            // Це трохи важко для performance кожні 10мс писати в storage,
            // але залишаємо як було у тебе для сумісності
            setStoredMilliseconds(nextVal);
          }
          return nextVal;
        });
      }, 10);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [pause, isGrowing, isServerControlled, setStoredMilliseconds]); // Прибрав milliseconds з deps щоб не було re-create інтервалу

    // 3. ЗАВЕРШЕННЯ
    useEffect(() => {
      // В онлайні ми не викликаємо onComplete, бо сервер вирішує кінець
      if (!isServerControlled && milliseconds === 0 && onComplete) {
        onComplete();
      }
    }, [milliseconds, onComplete, isServerControlled]);

    // Визначаємо час для відображення: якщо керує сервер - беремо syncTime, інакше - локальний стейт
    const displayTime =
      isServerControlled && syncTime !== undefined ? syncTime : milliseconds;

    return (
      <div className={`number-timer ${className ? className : ""}`}>
        <h1>{Math.floor(displayTime / 1000)}s</h1>
      </div>
    );
  },
);

export default Timer;
