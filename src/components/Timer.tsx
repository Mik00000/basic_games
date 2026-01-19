import React, {
  useEffect,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useStickyStateWithExpiry } from "./utils";

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
  onTimeUpdate?: (time: number) => void;
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
      onTimeUpdate,
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
    useEffect(() => {
      if (isServerControlled && syncTime !== undefined) {
        setMilliseconds(syncTime);
      }
    }, [syncTime, isServerControlled]);

    // Use refs for callbacks to avoid restarting intervals on re-renders (important for performance during drag)
    const onTimeUpdateRef = useRef(onTimeUpdate);
    const onCompleteRef = useRef(onComplete);

    useEffect(() => {
      onTimeUpdateRef.current = onTimeUpdate;
      onCompleteRef.current = onComplete;
    }, [onTimeUpdate, onComplete]);

    // 2. ІНТЕРВАЛ (Тікання)
    useEffect(() => {
      // Якщо на паузі або час вийшов - стоп
      if (pause || (!isGrowing && milliseconds <= 0)) {
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
          if (onTimeUpdateRef.current && nextVal % 1000 === 0) {
            onTimeUpdateRef.current(nextVal);
          }
          return nextVal;
        });
      }, 10);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [pause, isGrowing, isServerControlled, setStoredMilliseconds]); // Прибрав milliseconds з deps щоб не було re-create інтервалу

    // 3. ЗАВЕРШЕННЯ ТА ОНОВЛЕННЯ
    useEffect(() => {
      // В онлайні ми не викликаємо onComplete, бо сервер вирішує кінець
      if (!isServerControlled && milliseconds === 0 && onCompleteRef.current) {
        onCompleteRef.current();
      }

      // Синхронізуємо час при паузі (вихідний сигнал)
      // ВАЖЛИВО: Ми НЕ викликаємо onTimeUpdate тут, щоб не перезаписати TIME_REWARD
      // Останній тік інтервалу вже оновив час.
    }, [milliseconds, isServerControlled, pause]);

    // 4. СИНХРОНІЗАЦІЯ ВХІДНОГО ЧАСУ (REWARD)
    useEffect(() => {
      if (pause && Math.abs(milliseconds - startTime) > 500) {
        setMilliseconds(startTime);
        if (!isServerControlled) setStoredMilliseconds(startTime);
      }
    }, [
      pause,
      startTime,
      milliseconds,
      isServerControlled,
      setStoredMilliseconds,
    ]);

    return (
      <div className={`number-timer ${className}`}>
        <h1>{Math.floor(milliseconds / 1000)}s</h1>
      </div>
    );
  },
);

export default Timer;
