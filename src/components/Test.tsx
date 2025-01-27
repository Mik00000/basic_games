import React, { useState } from "react";
import Timer from "../components/Timer.tsx";
import { generateRandomNumber } from "../components/utils.ts";

const Test: React.FC = () => {
  const TimeToForgotGame = 3 * 60 * 60 * 1000;
  const [isRunning, setIsRunning] = useState(false);
  const [timerMaxTime, setTimerMaxTime] = useState<number>(3000);

  const [key, setKey] = useState(0); // Ключ для перезапуску

  const handleRestart = () => {
    localStorage.removeItem('connectFourTimerTime');

    setKey((prevKey) => prevKey + 1);
    console.log(key)
  };
  // const handleRestart = () => {
  //   // setTimerTime((prevTime) => (prevTime === timerMaxTime ? prevTime - 1 : timerMaxTime));
    
  // };

  return (
    <div className="a">
      <Timer
        startTime={timerMaxTime}
        timerName={"connectFourTimerTime"}
        timeToForgotTimer={TimeToForgotGame}
        pause={isRunning}
        key={key}
      />  
      <button
        onClick={() => {
          setIsRunning((prev) => !prev);
        }}
      >
        {isRunning ? "Pause" : "Resume"}
      </button>



      <button onClick={handleRestart}>Restart</button> {/* Новий кнопка для оновлення часу */}
    </div>
  );
};

export default Test;
