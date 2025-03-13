import React, {
  useEffect,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { formatTime, useStickyStateWithExpiry } from "./utils.ts";

interface TimerProps {
  startTime: number;
  timerName: string;
  timeToForgotTimer?: number;
  pause?: boolean;
  onComplete?: any;
  isGrowing?: boolean;
  className?: string;
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
      className
    },
    ref
  ) => {
    const [milliseconds, setMilliseconds] = useStickyStateWithExpiry(
      startTime,
      timerName,
      timeToForgotTimer,
      "time"
    );
    const [isRunning, setIsRunning] = useState(!pause);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const reset = () => {
      setMilliseconds(startTime);
    };

    useImperativeHandle(ref, () => ({
      reset,
    }));

    useEffect(() => {
      setIsRunning(!pause);
    }, [pause]);

    useEffect(() => {
      if (isRunning) {
        if (intervalRef.current) clearInterval(intervalRef.current);

        intervalRef.current = setInterval(() => {
          setMilliseconds((prev) =>
            Math.max(isGrowing ? prev + 10 : prev - 10, 0)
          );
        }, 10);
      } else if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [isRunning, setMilliseconds, isGrowing]);

    useEffect(() => {
      if (milliseconds === 0 && onComplete) {
        onComplete();
      }
    }, [milliseconds, onComplete]);

    return (
      <div className={`number-timer ${className}`}>
        <h1>{Math.floor(milliseconds / 1000)}s</h1>
      </div>
    );
  }
);

export default Timer;
