import { useState, useEffect, useRef, useMemo } from "react";
import { GameRoom, Player } from "../types/gameTypes";

interface UseOpponentDisconnectProps {
  isOnline: boolean;
  currentRoom: Partial<GameRoom> | null;
  currentUser: Player | null;
  debounceTime?: number;
  timeoutSeconds?: number;
}

export const useOpponentDisconnect = ({
  isOnline,
  currentRoom,
  currentUser,
  debounceTime = 4000,
  timeoutSeconds = 45,
}: UseOpponentDisconnectProps) => {
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [offlineTimer, setOfflineTimer] = useState(timeoutSeconds);
  const offlineTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const players = currentRoom?.players;
  const opponent = useMemo(() => {
    if (!isOnline || !players || !currentUser) return null;
    return players.find((p) => p.id !== currentUser.id);
  }, [isOnline, players, currentUser]);

  useEffect(() => {
    if (!isOnline || !opponent) {
      setTimeout(() => setShowOfflineModal(false), 0);
      if (offlineTimeoutRef.current) {
        clearTimeout(offlineTimeoutRef.current);
        offlineTimeoutRef.current = null;
      }
      return;
    }

    if (!opponent.isOnline && !showOfflineModal) {
      // Start debounce timer regarding user request
      if (!offlineTimeoutRef.current) {
        offlineTimeoutRef.current = setTimeout(() => {
          setShowOfflineModal(true);
          setOfflineTimer(timeoutSeconds);
        }, debounceTime);
      }
    } else if (opponent.isOnline) {
      // Player returned
      if (offlineTimeoutRef.current) {
        clearTimeout(offlineTimeoutRef.current);
        offlineTimeoutRef.current = null;
      }
      setTimeout(() => setShowOfflineModal(false), 0);
    }
  }, [
    isOnline,
    opponent?.isOnline,
    showOfflineModal,
    opponent,
    debounceTime,
    timeoutSeconds,
  ]);

  // Tick down the offline modal timer
  useEffect(() => {
    if (!showOfflineModal) return;
    const interval = setInterval(() => {
      setOfflineTimer((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [showOfflineModal]);

  return {
    showOfflineModal,
    offlineTimer,
    opponentName: opponent?.username,
  };
};
