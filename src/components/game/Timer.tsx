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
  syncTime?: number;
  isServerControlled?: boolean;
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
    const [storedMilliseconds, setStoredMilliseconds] =
      useStickyStateWithExpiry(startTime, timerName, timeToForgotTimer, "time");

    const [milliseconds, setMilliseconds] = useState(
      isServerControlled && syncTime !== undefined
        ? syncTime
        : storedMilliseconds,
    );

    const [prevSyncTime, setPrevSyncTime] = useState(syncTime);
    const [prevIsServerControlled, setPrevIsServerControlled] =
      useState(isServerControlled);

    if (
      syncTime !== prevSyncTime ||
      isServerControlled !== prevIsServerControlled
    ) {
      setPrevSyncTime(syncTime);
      setPrevIsServerControlled(isServerControlled);

      if (isServerControlled && syncTime !== undefined) {
        setMilliseconds(syncTime);
      }
    }

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
      // Якщо на паузі або час вийшов - стоп локальний інтервал
      if (pause || (!isGrowing && milliseconds <= 0)) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

      const lastTickRef = { current: Date.now() };

      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const delta = now - lastTickRef.current;
        lastTickRef.current = now;

        setMilliseconds((prev) => {
          let nextVal;
          if (isGrowing) {
            nextVal = prev + delta;
          } else {
            nextVal = Math.max(prev - delta, 0);
          }

          // В локальному режимі зберігаємо в localStorage
          if (!isServerControlled) {
            setStoredMilliseconds(nextVal);
          }
          return nextVal;
        });
      }, 100); // 100ms interval is enough for UI updates, delta handles accuracy

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [pause, isGrowing, isServerControlled, setStoredMilliseconds]);

    // 3. ЗАВЕРШЕННЯ
    useEffect(() => {
      // В онлайні ми не викликаємо onComplete, бо сервер вирішує кінець
      if (!isServerControlled && milliseconds === 0 && onComplete) {
        onComplete();
      }
    }, [milliseconds, onComplete, isServerControlled]);

    // Використовуємо milliseconds для відображення (воно тепер синхронізоване + тікає)
    const displayTime = milliseconds;

    return (
      <div className={`number-timer ${className ? className : ""}`}>
        <h1>{Math.floor(displayTime / 1000)}s</h1>
      </div>
    );
  },
);

export default Timer;
