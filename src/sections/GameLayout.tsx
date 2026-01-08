import { Outlet } from "react-router-dom";
import { useGameStatus } from "../context/GameContext";
import { useEffect } from "react";

const GameLayout = () => {
  const { setIsInGame } = useGameStatus();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);
  return (
    <div className="game-wrapper">
      <Outlet />
    </div>
  );
};

export default GameLayout;
