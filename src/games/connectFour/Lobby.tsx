import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useOnlineGame } from "../../hooks/useOnlineGame";
import CopyIcon from "../../assets/icons/copy.svg?react";
import EditIcon from "../../assets/icons/pencil.svg?react";
import CrownIcon from "../../assets/icons/crown.svg?react";
import { Modal } from "../../components/Modal";

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

export const ConnectFourLobby: React.FC = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const location = useLocation();
  const navState = React.useMemo(
    () => (location.state as any) || {},
    [location.state]
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
  } = useOnlineGame<any>();

  const [isInitializing, setIsInitializing] = useState(false);
  const initialized = useRef(false);

  const [isIdCopied, setIsIdCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");

  const [conflictRoom, setConflictRoom] = useState<{ roomId: string } | null>(
    null
  );

  // Inactivity Warning Effect

  const handleNameSave = () => {
    if (tempName.trim() && tempName !== currentPlayer?.username) {
      updatePlayerData({ username: tempName.trim() });
    }
    setIsEditingName(false);
  };

  useEffect(() => {
    if (!isConnected || initialized.current) return;

    const init = async () => {
      setIsInitializing(true);
      initialized.current = true;

      const myName =
        navState.playerOneName || `Guest ${Math.floor(Math.random() * 1000)}`;
      const myColor = navState.playerOneColor || "#ff0000";

      if (roomId === "new") {
        const res = await createRoom({
          name: `${myName}'s Room`,
          gameType: "connect-four",
          maxPlayers: 2,
          username: myName,
          initialState: {},
          settings: { allowChat: true, warningTimeout: 60000 },
        });

        if (res.success && res.data?.roomId) {
          await updatePlayerData({ color: myColor });
          window.history.replaceState(
            null,
            "",
            `/games/connect4/lobby/${res.data.roomId}`
          );
        } else if (
          res.error?.code === "ALREADY_IN_ROOM" &&
          res.error.details?.roomId
        ) {
          setConflictRoom({ roomId: res.error.details.roomId });
        } else {
          alert("Failed to create room: " + res.error?.message);
          navigate("/games/connect4-menu");
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
        });
        if (res.success) {
          if (!res.data?.player?.gameData?.color) {
            await updatePlayerData({ color: myColor });
          }
        } else if (
          res.error?.code === "ALREADY_IN_ROOM" &&
          res.error.details?.roomId
        ) {
          setConflictRoom({ roomId: res.error.details.roomId });
        } else {
          alert("Failed to join room: " + res.error?.message);
          navigate("/games/connect4-menu");
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
    currentRoom?.id, // Added dependency
  ]);

  useEffect(() => {
    if (currentRoom?.status === "playing") {
      navigate(`/games/connect4/${currentRoom.id}`, { replace: true });
    }
  }, [currentRoom?.status, currentRoom?.id, navigate]);

  const handleStartGame = async () => {
    await startGame();
  };

  const handleLeave = async () => {
    await leaveRoom();
    navigate("/games/connect4-menu");
  };

  const handleColorChange = (newColor: string) => {
    updatePlayerData({ color: newColor });
  };

  const copyLink = () => {
    if (currentRoom?.id) navigator.clipboard.writeText(currentRoom.id);
  };

  const handleCopyClick = () => {
    if (isIdCopied) return;
    copyLink();

    setIsIdCopied(true);

    setTimeout(() => {
      setIsIdCopied(false);
    }, 2000);
  };

  const handleResolveConflict = async (action: "stay" | "join_new") => {
    if (action === "stay") {
      // Go to the room we are already in
      if (conflictRoom?.roomId) {
        setConflictRoom(null);
        navigate(`/games/connect4/lobby/${conflictRoom.roomId}`); // Or just join logic?
        // Better: Reset everything and let the router handle it
        // Actually, if we just navigate, the useEffect will trigger and see we are in room
      }
    } else {
      // Leave current room first, then try to join the NEW one (which is in params)
      await leaveRoom();
      setConflictRoom(null); // Clear conflict
      clearError(); // Clear error state in hook
      initialized.current = false; // Allow init to run again
      // Trigger re-run of init logic??
      // Since we are clearing initialized.current, and dependencies might not change enough, we might need to force it.
      // But actually, leaving room updates currentRoom, which triggers effects?
      // Let's just manually call init logic or reload page?
      // Simplest: just reload page or navigate to same URL to trigger re-mount?
      // Or recursively call init?
      window.location.reload();
    }
  };

  const handleHeartbeat = async () => {
    await sendHeartbeat();
  };

  if (conflictRoom) {
    return (
      <Modal
        isOpen={true}
        title="Already in a Room"
        actions={
          <>
            <button
              className="secondary"
              onClick={() => handleResolveConflict("stay")}
            >
              Return to Old Room
            </button>
            <button
              className="primary"
              onClick={() => handleResolveConflict("join_new")}
            >
              Leave & Join New
            </button>
          </>
        }
      >
        <p>
          You are already in another room ({conflictRoom.roomId}). Do you want
          to leave it and join this one?
        </p>
      </Modal>
    );
  }

  if (!isConnected || isInitializing) {
    return (
      <div className="pop-up-warning">
        <h1 className="heading">Connecting to Lobby...</h1>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="pop-up-warning">
        <h1 className="heading">Room not found</h1>
      </div>
    );
  }

  const players = currentRoom.players || [];
  const amIHost = currentRoom.adminId === currentPlayer?.id;
  const canStart = players.length === 2 && amIHost;

  return (
    // Змінив назву класу на більш специфічну, щоб відповідати SCSS
    <div className="connect-four-lobby">
      <div className="menu-header">
        <h1>Connect Four</h1>
        <h2
          title="Copy ID"
          onClick={handleCopyClick}
          className={isIdCopied ? "copied" : ""}
        >
          Lobby: {currentRoom.id} <CopyIcon />
        </h2>
      </div>

      <div className="menu-section">
        <h2>Players ({players.length}/2)</h2>
        <div className="player-settings">
          {players.map((p: any) => {
            const isMe = p.id === currentPlayer?.id;
            const pColor = p.gameData?.color || "#ffffff";

            return (
              <div
                key={p.id}
                className="player"
                // Динамічний стиль залишаємо тут, бо він залежить від даних
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

                {isMe && (
                  <div className="player-controls">
                    <label>Change Color:</label>
                    <ColorPicker color={pColor} onChange={handleColorChange} />
                  </div>
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

          {players.length < 2 && (
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

      {/* Inactivity Modal */}
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
    </div>
  );
};

export default ConnectFourLobby;
