import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useOnlineGame } from "../../hooks/useOnlineGame";
import CopyIcon from "../../assets/icons/copy.svg?react";
import EditIcon from "../../assets/icons/pencil.svg?react";
import CrownIcon from "../../assets/icons/crown.svg?react";
import { Modal } from "../modals/Modal";
import { RoomConflictResolver } from "../modals/RoomConflictResolver";
import { areColorsTooSimilar } from "../common/utils";

// Generic types could be moved to types file, but for now inline is fine or imported
interface OnlineLobbyProps {
  gameType: string;
  title: string;
  menuPath: string; // e.g. "/games/connect4-menu"
  gamePathPrefix: string; // e.g. "/games/connect4"
  minPlayers?: number;
  maxPlayers?: number;
  validatePlayers?: (players: any[]) => {
    isValid: boolean;
    p1Error?: string;
    p2Error?: string;
    generalError?: string;
  };
  defaultSettings?: any;
  accentColor?: string; // For styling (optional)
  fixedPlayerColors?: string[]; // If provided, players get these colors based on index, and cannot change them
}

const ColorPicker = ({
  color,
  onChange,
}: {
  color: string;
  onChange: (c: string) => void;
}) => {
  const [localColor, setLocalColor] = useState(color);
  const [prevColor, setPrevColor] = useState(color);

  if (color !== prevColor) {
    setPrevColor(color);
    if (/^#[0-9A-F]{6}$/i.test(color)) {
      setLocalColor(color);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalColor(e.target.value);
  };

  const handleBlur = () => {
    if (localColor !== color) {
      onChange(localColor);
    }
  };

  return (
    <label
      className="color-picker-wrapper"
      style={{ "--userColor": localColor } as React.CSSProperties}
    >
      <input
        type="color"
        value={localColor}
        onChange={handleChange}
        onBlur={handleBlur}
        className="color-picker-input"
      />
    </label>
  );
};

export const OnlineLobby: React.FC<OnlineLobbyProps> = ({
  gameType,
  title,
  menuPath,
  gamePathPrefix,
  minPlayers = 2,
  maxPlayers = 2,
  validatePlayers,
  defaultSettings = {},
  fixedPlayerColors,
}) => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const location = useLocation();
  const navState = React.useMemo(
    () => (location.state as any) || {},
    [location.state],
  );
  const {
    isConnected,
    currentRoom,
    currentPlayer,
    createRoom,
    joinRoom,
    leaveRoom,
    updatePlayerData,
    startGame,
    inactivityWarning,
    sendHeartbeat,
    clearError,
    error,
  } = useOnlineGame<any>();

  const [isInitializing, setIsInitializing] = useState(false);
  const initializedRoomId = useRef<string | undefined>(undefined);

  const [isIdCopied, setIsIdCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");

  const [conflictRoom, setConflictRoom] = useState<{
    roomId: string;
    gameType?: string;
  } | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [playerOneError, setPlayerOneError] = useState<string | null>(null);
  const [playerTwoError, setPlayerTwoError] = useState<string | null>(null);

  // [FIX] New state for error modal
  const [errorModal, setErrorModal] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const handleNameSave = () => {
    if (tempName.trim() && tempName !== currentPlayer?.username) {
      const newName = tempName.trim();
      updatePlayerData({ username: newName });

      // Update local prefs
      const savedPrefs = localStorage.getItem("user_preferences");
      const prefs = savedPrefs ? JSON.parse(savedPrefs) : {};
      localStorage.setItem(
        "user_preferences",
        JSON.stringify({
          ...prefs,
          username: newName,
        }),
      );
    }
    setIsEditingName(false);
  };

  useEffect(() => {
    // Reset initialization if connection or roomId changes meaningfully
    if (!isConnected) return;

    // Safety check: If we are already in the target room, stop initialization immediately
    if (currentRoom?.id === roomId) {
      initializedRoomId.current = roomId;
      if (isInitializing) {
        // Use setTimeout to avoid synchronous setState warning during render cycle
        setTimeout(() => setIsInitializing(false), 0);
      }
      return;
    }

    if (initializedRoomId.current === roomId) return;

    const init = async () => {
      setIsInitializing(true);
      initializedRoomId.current = roomId;

      // [FIX] Persistence for reload: Check localStorage if navState is empty
      const savedPrefs = localStorage.getItem("user_preferences");
      const prefs = savedPrefs ? JSON.parse(savedPrefs) : {};

      const myName =
        navState.playerOneName ||
        prefs.username ||
        `Guest ${Math.floor(Math.random() * 1000)}`;

      // If fixed colors are used, we don't pick a random color or user color here,
      // but we might not know our index yet. However, for "createRoom" we are P1 (index 0).
      let myColor = navState.playerOneColor || prefs.color || "#ff0000";
      if (fixedPlayerColors && fixedPlayerColors.length > 0) {
        // Assume creator is P1
        if (roomId === "new") {
          myColor = fixedPlayerColors[0];
        }
        // If joining, we don't know index yet, so we will update it later or let the server decide?
        // Actually, let's just let the loop below fix it if it's wrong.
      }

      // Get or create persistent User ID
      let userId = localStorage.getItem(`${gameType}_user_id`);
      if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem(`${gameType}_user_id`, userId);
      }

      // Save preferences immediately if we have them (e.g. from menu)
      if (navState.playerOneName || navState.playerOneColor) {
        localStorage.setItem(
          "user_preferences",
          JSON.stringify({
            username: myName, // save the used name
            color: myColor,
          }),
        );
      }

      const roomSettings = {
        allowChat: true,
        warningTimeout: 60000,
        ...defaultSettings,
      };

      if (roomId === "new") {
        const res = await createRoom({
          name: `${myName}'s Room`,
          gameType: gameType,
          maxPlayers: maxPlayers,
          username: myName,
          userId: userId, // Pass stable ID
          initialState: {},
          settings: roomSettings,
        });

        if (res.success && res.data?.roomId) {
          await updatePlayerData({ color: myColor });
          // Update prefs with confirmed values
          localStorage.setItem(
            "user_preferences",
            JSON.stringify({
              username: myName,
              color: myColor,
            }),
          );
          window.history.replaceState(
            null,
            "",
            `${gamePathPrefix}/lobby/${res.data.roomId}`,
          );
        } else if (
          res.error?.code === "ALREADY_IN_ROOM" &&
          res.error.details?.roomId
        ) {
          setConflictRoom({
            roomId: res.error.details.roomId,
            gameType: res.error.details.gameType,
          });
        } else {
          alert("Failed to create room: " + res.error?.message);
          navigate(menuPath);
        }
      } else if (roomId) {
        // Fix Reload Logic: If we are already in this room, don't join again
        if (currentRoom?.id === roomId) {
          setIsInitializing(false);
          return;
        }

        const res = await joinRoom({
          roomId: roomId,
          username: myName,
          userId: userId, // Pass stable ID
        });
        if (res.success) {
          if (!res.data?.player?.gameData?.color) {
            await updatePlayerData({ color: myColor });
          }
          // Save prefs on successful join
          localStorage.setItem(
            "user_preferences",
            JSON.stringify({
              username: myName, // This might be from prefs or guest
              color: myColor,
            }),
          );
        } else if (
          res.error?.code === "ALREADY_IN_ROOM" &&
          res.error.details?.roomId
        ) {
          setConflictRoom({
            roomId: res.error.details.roomId,
            gameType: res.error.details.gameType,
          });
        } else {
          // [FIX] Use Modal instead of alert
          setErrorModal({
            title: "Failed to join room",
            message: res.error?.message || "Unknown error",
          });
          // alert("Failed to join room: " + res.error?.message);
          // navigate(menuPath);
        }
      }
      setIsInitializing(false);
    };

    init();
  }, [
    isConnected,
    roomId,
    createRoom,
    joinRoom,
    navState,
    navigate,
    updatePlayerData,
    currentRoom?.id,
    gameType,
    gamePathPrefix,
    fixedPlayerColors,
    defaultSettings, // Added to deps
    maxPlayers, // Added to deps
    menuPath, // Added to deps
    isInitializing, // Added to deps
  ]);

  // Handle critical errors like Room Closed

  useEffect(() => {
    // Only redirect if we are actually looking at the lobby of the game we are in.
    if (currentRoom?.status === "playing" && currentRoom.id === roomId) {
      navigate(`${gamePathPrefix}/${currentRoom.id}`, { replace: true });
    }
  }, [currentRoom?.status, currentRoom?.id, navigate, roomId, gamePathPrefix]);

  const handleStartGame = async () => {
    const isValid = validateInputs();
    if (!isValid) return;

    // Optimistic or callback-based navigation
    const res = await startGame();
    if (res.success) {
      // Force navigation if server confirmed start, in case socket event is delayed
      navigate(`${gamePathPrefix}/${roomId}`, { replace: true });
    }
  };

  const handleLeave = async () => {
    await leaveRoom();
    navigate(menuPath);
  };

  const handleColorChange = (newColor: string) => {
    updatePlayerData({ color: newColor });
    // Update local prefs
    const savedPrefs = localStorage.getItem("user_preferences");
    const prefs = savedPrefs ? JSON.parse(savedPrefs) : {};
    localStorage.setItem(
      "user_preferences",
      JSON.stringify({
        ...prefs,
        color: newColor,
      }),
    );
  };

  const copyLink = () => {
    if (currentRoom?.id) navigator.clipboard.writeText(currentRoom.id);
    setIsIdCopied(true);
    setTimeout(() => setIsIdCopied(false), 2000);
  };

  const handleResolveConflict = async (action: "stay" | "leave") => {
    if (action === "stay") {
      if (conflictRoom?.roomId) {
        setConflictRoom(null);
        const targetPrefix = conflictRoom.gameType
          ? `/games/${conflictRoom.gameType}`
          : gamePathPrefix;
        navigate(`${targetPrefix}/lobby/${conflictRoom.roomId}`);
      }
    } else {
      // "leave" means "Abandon old room and force join the new one"
      const myName =
        navState.playerOneName || `Guest ${Math.floor(Math.random() * 1000)}`;
      let userId = localStorage.getItem(`${gameType}_user_id`);
      if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem(`${gameType}_user_id`, userId);
      }

      setConflictRoom(null);
      clearError();
      setIsInitializing(true);

      if (roomId === "new") {
        const res = await createRoom({
          name: `${myName}'s Room`,
          gameType: gameType,
          maxPlayers: maxPlayers,
          username: myName,
          userId: userId,
          initialState: {},
          settings: {
            allowChat: true,
            warningTimeout: 60000,
            ...defaultSettings,
          },
          force: true,
        } as any);

        if (res.success && res.data?.roomId) {
          await updatePlayerData({
            color: navState.playerOneColor || "#ff0000",
          });
          navigate(`${gamePathPrefix}/lobby/${res.data.roomId}`, {
            replace: true,
          });
        } else {
          alert("Failed to force create room: " + res.error?.message);
          setIsInitializing(false);
        }
      } else if (roomId) {
        const res = await joinRoom({
          roomId: roomId,
          username: myName,
          userId: userId,
          force: true,
        } as any);
        if (res.success) {
          if (!res.data?.player?.gameData?.color) {
            await updatePlayerData({
              color: navState.playerOneColor || "#ff0000",
            });
          }
        } else {
          alert("Failed to force join room: " + res.error?.message);
          setIsInitializing(false);
        }
      }
    }
  };

  const handleHeartbeat = async () => {
    await sendHeartbeat();
  };

  const validateInputs = (): boolean => {
    let isValid = true;
    setPlayerOneError(null);
    setPlayerTwoError(null);
    setGeneralError(null);

    if (!currentRoom?.players || currentRoom.players.length < minPlayers)
      return true;

    if (validatePlayers) {
      const result = validatePlayers(currentRoom.players);
      if (!result.isValid) {
        setPlayerOneError(result.p1Error || null);
        setPlayerTwoError(result.p2Error || null);
        setGeneralError(result.generalError || null);
        isValid = false;
      }
    }

    // Fallback default validation (Connect Four specific, should make generic but OK for now)
    // Actually, if we use this for Chess, we might not have colors.
    // For now, let's keep it minimal or check if colors exist.

    const p1 = currentRoom.players[0] as any;
    const p2 = currentRoom.players[1] as any;
    if (p1 && p2 && !validatePlayers) {
      // Basic name check
      if (p1.username === p2.username) {
        setGeneralError("Players cannot have the same name");
        isValid = false;
      }
    }

    return isValid;
  };

  useEffect(() => {
    validateInputs();

    // Enforce fixed colors if defined
    if (fixedPlayerColors && currentRoom?.players && currentPlayer) {
      const myIndex = currentRoom.players.findIndex(
        (p) => p.id === currentPlayer.id,
      );
      if (myIndex !== -1 && fixedPlayerColors[myIndex]) {
        const requiredColor = fixedPlayerColors[myIndex];
        const myCurrentColor = currentPlayer.gameData?.color;
        if (myCurrentColor !== requiredColor) {
          // Determine if we need to update
          // to avoid infinite loop, only update if different
          // Also prevent rapid updates
          updatePlayerData({ color: requiredColor });
        }
      }
    }
  }, [
    currentRoom?.players,
    fixedPlayerColors,
    currentPlayer?.id,
    currentPlayer?.gameData?.color,
  ]);

  if (conflictRoom) {
    return (
      <RoomConflictResolver
        conflictRoomId={conflictRoom.roomId}
        onResolve={handleResolveConflict}
      />
    );
  }

  if (!isConnected || isInitializing) {
    return (
      <Modal isOpen={true} title="Connecting to Lobby...">
        <p>Please wait...</p>
      </Modal>
    );
  }

  if (!currentRoom) {
    return (
      <Modal
        isOpen={true}
        title="Room not found"
        actions={
          <button className="primary" onClick={() => navigate(menuPath)}>
            Back to Menu
          </button>
        }
      >
        <p>
          The room you are trying to join does not exist or has been closed.
        </p>
      </Modal>
    );
  }

  const players = currentRoom.players || [];
  const amIHost = currentRoom.adminId === currentPlayer?.id;
  const canStart = players.length >= minPlayers && amIHost;

  const isCriticalError =
    error && (error.includes("ROOM_CLOSED") || error.includes("Room closed"));
  const effectiveError =
    errorModal ||
    (isCriticalError ? { title: "Room Closed", message: error } : null);

  return (
    <div className="online-lobby">
      <div className="menu-header">
        <h1>{title}</h1>
        <h2
          title="Copy ID"
          onClick={copyLink}
          className={isIdCopied ? "copied" : ""}
        >
          Lobby: {currentRoom.id} <CopyIcon />
        </h2>
      </div>

      {generalError && (
        <div className="error-message general-error">{generalError}</div>
      )}

      <div className="menu-section">
        <h2>
          Players ({players.length}/{maxPlayers})
        </h2>
        <div className="player-settings">
          {players.map((p: any, index: number) => {
            const isMe = p.id === currentPlayer?.id;
            // If fixed colors are enabled, use them for display regardless of what's in p.gameData (visually)
            // or trust p.gameData if we enforce it. Let's trust p.gameData but fallback to fixed if available?
            // Actually, better to just use p.gameData as we are enforcing it via useEffect.
            // BUT for immediate visual feedback before roundtrip, we could use fixed.
            const pColor =
              fixedPlayerColors && fixedPlayerColors[index]
                ? fixedPlayerColors[index]
                : p.gameData?.color || "#ffffff";

            return (
              <div
                key={p.id}
                className="player"
                style={{ borderColor: pColor }}
              >
                <div className="player-info">
                  <span className="role" title="admin">
                    {p.role === "admin" && <CrownIcon />}
                  </span>

                  <span className="username">
                    {isMe && isEditingName ? (
                      <input
                        autoFocus
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onBlur={handleNameSave}
                        maxLength={12}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleNameSave();
                          if (e.key === "Escape") {
                            setIsEditingName(false);
                            setTempName(p.username);
                          }
                        }}
                        className="name-input"
                      />
                    ) : (
                      p.username
                    )}
                  </span>
                  {isMe && !isEditingName && (
                    <div
                      className="edit"
                      onClick={() => {
                        setIsEditingName(true);
                        setTempName(p.username);
                      }}
                      title="Edit Username"
                    >
                      <EditIcon />
                    </div>
                  )}
                </div>
                {index === 0 && playerOneError && (
                  <div className="error-message">{playerOneError}</div>
                )}
                {index === 1 && playerTwoError && (
                  <div
                    className="error-message"
                    style={{
                      color: "red",
                      fontSize: "0.8em",
                      marginTop: "5px",
                    }}
                  >
                    {playerTwoError}
                  </div>
                )}
                {isMe && !fixedPlayerColors && (
                  <div className="player-controls">
                    <label>Change Color:</label>
                    <ColorPicker color={pColor} onChange={handleColorChange} />
                  </div>
                )}
                {isMe && fixedPlayerColors && (
                  <div
                    className="opponent-color-indicator"
                    style={{ background: fixedPlayerColors[index] }}
                  ></div>
                )}
                {!isMe && (
                  <div
                    className="opponent-color-indicator"
                    style={{ background: pColor }}
                  ></div>
                )}
              </div>
            );
          })}

          {players.length < minPlayers && (
            <div className="player waiting">Waiting for opponent...</div>
          )}
        </div>
      </div>

      <div className="menu-actions">
        {amIHost ? (
          <button
            onClick={handleStartGame}
            className="start-button"
            disabled={!canStart}
          >
            Start Game
          </button>
        ) : (
          <div className="waiting-text">Waiting for host to start...</div>
        )}

        <button onClick={handleLeave} className="exit-button">
          Leave Lobby
        </button>
      </div>

      <Modal
        isOpen={!!inactivityWarning}
        title="Are you still there?"
        actions={
          <button className="primary" onClick={handleHeartbeat}>
            I'm here!
          </button>
        }
      >
        <p>{inactivityWarning?.message}</p>
        <p>
          Room will close in{" "}
          {Math.round((inactivityWarning?.timeLeft || 0) / 1000)} seconds.
        </p>
      </Modal>

      <Modal
        isOpen={!!effectiveError}
        title={effectiveError?.title || "Error"}
        actions={
          <button
            className="primary"
            onClick={() => {
              setErrorModal(null);
              if (isCriticalError) clearError?.(); // Очищаємо помилку, якщо вона критична
              navigate(menuPath); // Перехід в меню при закритті
            }}
          >
            Back to Menu
          </button>
        }
        onClose={() => {
          setErrorModal(null);
          if (isCriticalError) clearError?.();
          navigate(menuPath);
        }}
      >
        <p>{effectiveError?.message}</p>
      </Modal>
    </div>
  );
};
export default OnlineLobby;
