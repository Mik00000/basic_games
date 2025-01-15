import React, { useState } from "react";
import Timer from "../components/Timer.tsx";
import { generateRandomNumber } from "../components/utils.ts";

export const ConnectFour: React.FC = () => {
  const TimeToForgotGame = 3 * 60 * 60 * 1000;
  const [isRunning, setIsRunning] = useState(false);
  const [timerMaxTime, setTimerMaxTime] = useState<number>(3000);

  const [timerTime, setTimerTime] = useState<number|null>(null);

  const handleRestart = () => {
    setTimerTime((prevTime) => (prevTime === timerMaxTime ? prevTime - 1 : timerMaxTime));
  };

  return (
    <div className="a">
      <Timer
        startTime={timerMaxTime}
        timerName={"connectFour"}
        timeToForgotTimer={TimeToForgotGame}
        pause={isRunning}
        setTime={timerTime}
      />  
      <button
        onClick={() => {
          setIsRunning((prev) => !prev);
        }}
      >
        {isRunning ? "Pause" : "Resume"}
      </button>

      <button
        onClick={() => {
          setTimerTime(generateRandomNumber(1,1000));
        }}
      >
        A
      </button>
      <button onClick={()=>{
        setIsRunning(false)
        setTimerTime(timerMaxTime)
      }}>
        Restart
      </button>
      <button onClick={handleRestart}>Set Time</button> {/* Новий кнопка для оновлення часу */}
    </div>
  );
};
