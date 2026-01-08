// GameContext.tsx
import { createContext, PropsWithChildren, useContext, useState } from 'react';

const GameContext = createContext({ isInGame: false, setIsInGame: (val: boolean) => {} });

export const GameProvider = ({ children }: PropsWithChildren) => {
  const [isInGame, setIsInGame] = useState(false);
  return (
    <GameContext.Provider value={{ isInGame, setIsInGame }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameStatus = () => useContext(GameContext);