import React, { useEffect, useState } from "react";

const ShowTextAfterTime = ({ text, time }: { text: string; time: number }) => {
  const [delayedPlayer, setDelayedPlayer] = useState<string | null>(null);

  useEffect(() => {
    if (text !== null) {
      const timer = setTimeout(() => {
        setDelayedPlayer(text);
      }, time);

      return () => clearTimeout(timer); // Очищаємо таймер при зміні text або демонтажі
    }
  }, [text]);

  return <div>{delayedPlayer===null ? " ": delayedPlayer}</div>;
};

export default ShowTextAfterTime;
