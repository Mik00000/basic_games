import { useEffect, useReducer } from "react";
import { useOnlineGame } from "../../hooks/useOnlineGame";
import { gameReducer } from "./gameReducer";
import { initialGameState } from "./gameLogic";

export const useGame = (mode: "online" | "offline", roomId?: string) => {
  // 1. Local State (always needed for rendering)
  const [state, dispatch] = useReducer(gameReducer, initialGameState);

  // 2. Online Hooks
  const { makeMove: sendToServer, gameState: serverState } = useOnlineGame();

  // 3. Sync Server State (if online)
  useEffect(() => {
    if (mode === "online" && serverState) {
      // dispatch({ type: "SYNC_STATE", newState: serverState });
    }
  }, [mode, serverState]);

  // 4. Unified Action Handler
  const onCellClick = (r: number, c: number) => {
    if (state.selectedCell) {
      dispatch({
        type: "MAKE_MOVE",
        from: state.selectedCell,
        to: [r, c],
      });
    } else {
      dispatch({ type: "SELECT_CELL", cell: [r, c] });
    }
  };

  const onTimeUpdate = (player: "white" | "black", time: number) => {
    dispatch({ type: "UPDATE_TIME", player, time });
  };

  const onTimeout = (player: "white" | "black") => {
    dispatch({ type: "TIMEOUT", player });
  };

  return { state, onCellClick, onTimeUpdate, onTimeout };
};
