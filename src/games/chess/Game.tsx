import React, { useEffect, useState } from "react";
import { useGame } from "./useGame";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Pawn from "../../assets/icons/chess/pawn.svg?react";
import Rook from "../../assets/icons/chess/rook.svg?react";
import Knight from "../../assets/icons/chess/knight.svg?react";
import Bishop from "../../assets/icons/chess/bishop.svg?react";
import Queen from "../../assets/icons/chess/queen.svg?react";
import King from "../../assets/icons/chess/king.svg?react";

import { Piece, cleanLocalStorage, getAvailableMoves } from "./gameLogic";
import Timer from "../../components/game/Timer";
import { ConnectingScreen } from "../../components/modals/ConnectingScreen";
import { OpponentDisconnectedModal } from "../../components/modals/OpponentDisconnectedModal";
import { useOpponentDisconnect } from "../../hooks/useOpponentDisconnect";
import {
  ExitButton,
  MobileExitButton,
  PauseButton,
  RestartButton,
} from "../../components/game/GameControls";
import { PauseOverlay } from "../../components/game/PauseOverlay";
import { FirstPlayerSelector } from "../../components/game/FirstPlayerSelector/FirstPlayerSelector";

const pieceComponents: Record<
  string,
  React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string | undefined }
  >
> = {
  pawn: Pawn,
  rook: Rook,
  knight: Knight,
  bishop: Bishop,
  queen: Queen,
  king: King,
};

const PieceDisplay = ({
  type,
  color,
  className = "",
}: {
  type: Piece["type"];
  color: Piece["color"];
  className?: string;
}) => {
  const SvgComponent = pieceComponents[type];
  return SvgComponent ? (
    <SvgComponent className={`piece ${color} ${className}`} />
  ) : null;
};

const Game = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameModeOrId } = useParams();

  const locState = (location.state || {}) as any;

  // Determine Game Mode & ID
  const param = gameModeOrId || "local";
  const knownModes = ["local", "bot", "lobby"];
  const isParamMode = knownModes.includes(param);

  const onlineGameId = isParamMode ? undefined : param;
  const gameModeTyped = isParamMode ? param : "online";

  const gameMode = (locState.gameMode || gameModeTyped) as
    | "lobby"
    | "local"
    | "bot"
    | "online";
  const isOnline = gameMode === "online";

  const {
    state,
    onCellClick,
    onTimeout,
    onRestart: originalRestart,
    onOnlinePromote,
    isConnected,
    currentRoom,
    currentPlayer,
    leaveRoom,
    dispatch,
    handleMove,
    togglePause,
    sendVote,
  } = useGame(gameMode, onlineGameId);

  const [resetKey, setResetKey] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (isOnline) {
      setNow(Date.now());
      const interval = setInterval(() => setNow(Date.now()), 200);
      return () => clearInterval(interval);
    }
  }, [isOnline]);

  /* isWaitingForOpponent moved to comments as per request (archaic modal logic)
  const isWaitingForOpponent = !!(
    isOnline &&
    isConnected &&
    currentRoom &&
    (currentRoom.players?.length || 0) < 2
  );
  */
  const isWaitingForOpponent = false; // Always false now

  // Derive "Blocked" state
  // Block if:
  // 1. Animation is visually playing (isStartAnimation)
  // 2. Online game and server time says game hasn't started yet
  // 3. Waiting for opponent (already checked in some places but good to be explicit)

  const isStartAnimation = React.useMemo(() => {
    if (!isOnline || !state.onlineParams?.gameStartTime) return false;
    return now < state.onlineParams.gameStartTime;
  }, [isOnline, state.onlineParams, now]);

  const isGameStarted =
    !isOnline ||
    !state.onlineParams?.gameStartTime ||
    Date.now() >= state.onlineParams.gameStartTime;

  const isBlocked =
    !isGameStarted ||
    isWaitingForOpponent ||
    state.isPaused ||
    (isOnline && currentRoom?.status === "paused");

  // Force re-render to check time (optional, but good for removing block exactly when time comes)
  useEffect(() => {
    if (!isGameStarted && state.onlineParams?.gameStartTime) {
      const remaining = state.onlineParams.gameStartTime - Date.now();
      if (remaining > 0) {
        const t = setTimeout(() => {
          // Trigger re-render
          setResetKey((k) => k + 1); // Mock state update
        }, remaining);
        return () => clearTimeout(t);
      }
    }
  }, [isGameStarted, state.onlineParams?.gameStartTime]);

  useEffect(() => {
    // Sync difficulty/mode if provided in location state (e.g. from menu)
    if (!isOnline && locState.difficulty) {
      dispatch({ type: "SET_DIFFICULTY", difficulty: locState.difficulty });
    }
  }, [locState.difficulty, isOnline, dispatch]);

  const handleRestart = async () => {
    if (isStartAnimation) return;
    if (isOnline) {
      try {
        await sendVote("restart");
      } catch (e) {
        console.error("Failed to vote", e);
      }
    } else {
      setResetKey((prev) => prev + 1);
      originalRestart();
    }
  };

  const handlePauseToggle = async () => {
    if (!isOnline) {
      togglePause();
      return;
    }
    // Block pause during animation
    if (isStartAnimation) return;

    try {
      await sendVote("pause");
    } catch (e) {
      console.error("Failed to vote pause", e);
    }
  };

  const getActiveVoteCount = (voteType: string) => {
    if (!isOnline) return 0;
    const activeVote = currentRoom?.activeVote;
    const isRestartVoting = activeVote?.type === voteType;
    return isRestartVoting ? activeVote.voters.length : 0;
  };

  const getRestartButtonText = () => {
    if (isStartAnimation) return "Starting...";

    if (!isOnline) return "Restart";
    const activeVote = currentRoom?.activeVote;
    const isRestartVoting = activeVote?.type === "restart";

    const votesCount = isRestartVoting ? activeVote.voters.length : 0;
    const playersCount = currentRoom?.players?.length || 2;

    // We can check if *I* voted to show "Waiting" text if we want,
    // but the button handles disabled state+count usually.
    // Let's mirror Connect Four logic:
    const hasIVoted =
      isRestartVoting &&
      currentPlayer &&
      activeVote?.voters.includes(currentPlayer.id);

    if (hasIVoted) {
      return `Waiting (${votesCount}/${playersCount})`;
    }
    return votesCount > 0
      ? `Restart (${votesCount}/${playersCount})`
      : "Restart";
  };

  const getPauseButtonText = () => {
    if (isStartAnimation) return "Starting...";

    if (!isOnline) return state.isPaused ? "Resume" : "Pause";

    // In online, "paused" status is global.
    // If game is paused, we vote to Resume.
    // If game is playing, we vote to Pause.
    const isPaused = currentRoom?.status === "paused"; // Or state.isPaused (synced)
    const activeVote = currentRoom?.activeVote;
    const isPauseVoting = activeVote?.type === "pause";
    const baseAction = isPaused ? "Resume" : "Pause";

    if (isPauseVoting) {
      const hasVoted =
        currentPlayer && activeVote?.voters.includes(currentPlayer.id);
      const count = activeVote.voters.length;
      const total = currentRoom?.players?.length || 2;
      if (hasVoted) return `Waiting (${count}/${total})`;
      return `${baseAction} (${count}/${total})`;
    }
    return baseAction;
  };

  const handleExit = async () => {
    if (leaveRoom) await leaveRoom();
    cleanLocalStorage();
    navigate("/games/chess-menu");
  };

  const handlePromotion = (type: Piece["type"]) => {
    if (isOnline) {
      if (onOnlinePromote) onOnlinePromote(type);
    } else {
      dispatch({ type: "PROMOTE_PAWN", pieceType: type });
    }
  };

  const { showOfflineModal, offlineTimer, opponentName } =
    useOpponentDisconnect({
      isOnline,
      currentRoom,
      currentUser: currentPlayer,
    });

  // Drag and Drop State
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    piece: Piece;
    origin: { r: number; c: number };
    startRect: DOMRect;
    currentPos: { x: number; y: number };
    offset: { x: number; y: number };
    isReturning: boolean;
  } | null>(null);

  const handleMouseDown = (
    e: React.MouseEvent,
    r: number,
    c: number,
    cell: any,
  ) => {
    // Prevent default to avoid native drag behavior
    e.preventDefault();

    if (isBlocked) return; // BLOCK INTERACTION

    if (!cell) return;

    // Check if this is a click on a Valid Move target (Capture)
    const isTarget = state.availableMoves.some(
      ([mr, mc]) => mr === r && mc === c,
    );

    if (isTarget) {
      onCellClick(r, c);
      return;
    }

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    // Calculate offset to keep piece under cursor at the same relative position
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    setDragState({
      isDragging: true,
      piece: cell,
      origin: { r, c },
      startRect: rect,
      currentPos: { x: rect.left, y: rect.top },
      offset: { x: offsetX, y: offsetY },
      isReturning: false,
    });

    // Select the cell immediately to show available moves
    onCellClick(r, c);
  };

  useEffect(() => {
    if (!dragState || dragState.isReturning) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDragState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentPos: {
            x: e.clientX - prev.offset.x,
            y: e.clientY - prev.offset.y,
          },
        };
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      // Find the element under the cursor
      // We need to temporarily hide the dragged element or ensure pointer-events: none is set (it is in CSS)
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const cellElement = elements.find((el) => el.classList.contains("cell"));

      let validMoveFound = false;

      if (cellElement) {
        const targetR = parseInt(cellElement.getAttribute("data-row") || "-1");
        const targetC = parseInt(cellElement.getAttribute("data-col") || "-1");

        // Check if it's a valid move

        if (targetR !== -1 && targetC !== -1) {
          if (
            targetR === dragState.origin.r &&
            targetC === dragState.origin.c
          ) {
            // Dropped on same cell - just reset (already selected logic handled by mousedown)
            setDragState(null);
            validMoveFound = true;
          }

          if (!validMoveFound && state.currentTurn === dragState.piece.color) {
            // Check if it's a valid move dynamically using current board state
            // This allows for "pre-moves" (holding piece until turn starts)
            const dynamicAvailableMoves = getAvailableMoves(state, [
              dragState.origin.r,
              dragState.origin.c,
            ]);

            const isDynamicAvailable = dynamicAvailableMoves.some(
              ([mR, mC]) => mR === targetR && mC === targetC,
            );

            if (isDynamicAvailable) {
              // Use handleMove to support both local and online
              // This ensures 'makeMove' is called for online games
              handleMove(
                [dragState.origin.r, dragState.origin.c],
                [targetR, targetC],
              );
              setDragState(null);
              validMoveFound = true;
            }
          }
        }
      }

      if (!validMoveFound) {
        // Trigger return animation
        setDragState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            isReturning: true,
            currentPos: { x: prev.startRect.left, y: prev.startRect.top },
          };
        });

        // Clear state after animation
        setTimeout(() => {
          setDragState(null);
        }, 200); // 200ms matches CSS transition
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    dragState,
    onCellClick,
    state,
    state.availableMoves,
    state.board,
    state.currentTurn,
    dispatch,
    handleMove,
  ]);

  // Disable context menu
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  console.log(state);
  return (
    <section className="chess">
      {isOnline && !isConnected && <ConnectingScreen onCancel={handleExit} />}

      {/* 
      {isOnline && isWaitingForOpponent && (
        <WaitingForOpponentScreen
          roomId={currentRoom?.id}
          onCancel={handleExit}
        />
      )}
      */}

      {isStartAnimation && (
        <FirstPlayerSelector
          players={
            (state.onlineParams?.myColor === "black"
              ? [
                  {
                    name: state.playerInfo.black.name,
                    color: "#000",
                  },
                  {
                    name: state.playerInfo.white.name,
                    color: "#fff",
                  },
                ]
              : [
                  {
                    name: state.playerInfo.white.name,
                    color: "#fff",
                  },
                  {
                    name: state.playerInfo.black.name,
                    color: "#000",
                  },
                ]) as any
          }
          showNames={false}
          targetWinnerIndex={0} // Always 0 because we sort the "winner" (me) to first position in the array above
          duration={3500}
          onComplete={() => {
            if (currentRoom?.id) {
              sessionStorage.setItem(
                `chess_anim_shown_${currentRoom.id}`,
                "true",
              );
            }
          }}
        />
      )}

      <OpponentDisconnectedModal
        isOpen={showOfflineModal}
        opponentName={opponentName}
        timer={offlineTimer}
        onExit={handleExit}
      />

      <div className="top-bar">
        <div className="left-part">
          <ExitButton onClick={handleExit} />
          {/* Difficulty selector removed */}
        </div>
        <div className="mid-part">
          <Timer
            startTime={state.playerInfo.white.remainingTime}
            timerName={`chess_white_${onlineGameId || "local"}`}
            pause={
              state.currentTurn !== "white" || !!state.winner || isBlocked // PAUSE IF BLOCKED
            }
            onComplete={() => onTimeout("white")}
            key={`white_${onlineGameId || "local"}_${resetKey}`} // Use resetKey
            isServerControlled={isOnline}
            syncTime={
              isOnline && !isBlocked
                ? state.playerInfo.white.remainingTime
                : undefined
            }
          />
          <h1 className="current-player">
            {state.currentTurn.charAt(0).toUpperCase() +
              state.currentTurn.slice(1)}
          </h1>
          <Timer
            startTime={state.playerInfo.black.remainingTime}
            timerName={`chess_black_${onlineGameId || "local"}`}
            pause={
              state.currentTurn !== "black" || !!state.winner || isBlocked // PAUSE IF BLOCKED
            }
            onComplete={() => onTimeout("black")}
            key={`black_${onlineGameId || "local"}_${resetKey}`}
            isServerControlled={isOnline}
            syncTime={
              isOnline && !isBlocked
                ? state.playerInfo.black.remainingTime
                : undefined
            }
          />
        </div>
        <div className="right-part">
          <PauseButton
            onClick={handlePauseToggle}
            isPaused={
              (isOnline && currentRoom?.status === "paused") ||
              (!isOnline && state.isPaused)
            }
            text={getPauseButtonText()}
            voteCount={getActiveVoteCount("pause")}
            disabled={
              (isOnline && currentRoom?.activeVote?.type === "restart") ||
              isStartAnimation
            }
            style={{ opacity: isStartAnimation ? 0.5 : 1 }}
          />

          <RestartButton
            onClick={handleRestart}
            text={getRestartButtonText()}
            voteCount={getActiveVoteCount("restart")}
            disabled={
              (isOnline && currentRoom?.activeVote?.type === "pause") ||
              isStartAnimation
            }
            style={{ opacity: isStartAnimation ? 0.5 : 1 }}
          />
        </div>
      </div>
      <div className="board">
        {state.board.map((row, r) => {
          return (
            <div className="row" key={r}>
              {row.map((cell, c) => {
                const isDraggingSource =
                  dragState?.origin.r === r && dragState?.origin.c === c;

                return (
                  <div
                    key={r + "_" + c}
                    data-row={r}
                    data-col={c}
                    onMouseDown={(e) => handleMouseDown(e, r, c, cell)}
                    onClick={() => {
                      if (isBlocked) return; // BLOCK CLICK
                      // If we are just clicking (not dragging), the onMouseDown handles selection for pieces.
                      // We only need onClick for EMPTY squares (to move there if selected).
                      if (!cell && !dragState) {
                        onCellClick(r, c);
                      }
                    }}
                    className={`cell ${(r + c) % 2 === 0 ? "white" : "black"} ${
                      (state.history[state.history.length - 1]?.from[0] === r &&
                        state.history[state.history.length - 1]?.from[1] ===
                          c) ||
                      (state.history[state.history.length - 1]?.to[0] === r &&
                        state.history[state.history.length - 1]?.to[1] === c)
                        ? "last-move"
                        : ""
                    } ${
                      state.selectedCell?.[0] === r &&
                      state.selectedCell?.[1] === c
                        ? "selected"
                        : ""
                    }
                      ${cell?.type === "king" && state.sideInCheck == cell?.color ? "in-check" : ""}`}
                  >
                    {state.pendingPromotion &&
                      state.pendingPromotion.to[0] === r &&
                      state.pendingPromotion.to[1] === c &&
                      (gameMode !== "bot" || state.currentTurn === "white") && (
                        <span className="pawn-promotion-dialog">
                          <button
                            title="Queen"
                            onClick={() => handlePromotion("queen")}
                          >
                            <PieceDisplay
                              type="queen"
                              color={state.currentTurn}
                            />
                          </button>
                          <button
                            title="Rook"
                            onClick={() => handlePromotion("rook")}
                          >
                            <PieceDisplay
                              type="rook"
                              color={state.currentTurn}
                            />
                          </button>
                          <button
                            title="Bishop"
                            onClick={() => handlePromotion("bishop")}
                          >
                            <PieceDisplay
                              type="bishop"
                              color={state.currentTurn}
                            />
                          </button>
                          <button
                            title="Knight"
                            onClick={() => handlePromotion("knight")}
                          >
                            <PieceDisplay
                              type="knight"
                              color={state.currentTurn}
                            />
                          </button>
                        </span>
                      )}
                    {c === 0 && (
                      <span className="coordinate-label rank-label">
                        {8 - r}
                      </span>
                    )}
                    {r === 7 && (
                      <span className="coordinate-label file-label">
                        {String.fromCharCode(97 + c)}
                      </span>
                    )}
                    {state.availableMoves.some(
                      ([moveR, moveC]) => moveR === r && moveC === c,
                    ) && <div className="available-move" />}
                    {cell && (
                      <PieceDisplay
                        type={cell.type}
                        color={cell.color}
                        className={isDraggingSource ? "dragging-hidden" : ""}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="top-bar mobile">
        <MobileExitButton onClick={handleExit} />
         <PauseButton
            onClick={handlePauseToggle}
            isPaused={
              (isOnline && currentRoom?.status === "paused") ||
              (!isOnline && state.isPaused)
            }
            text={getPauseButtonText()}
            voteCount={getActiveVoteCount("pause")}
            disabled={
              (isOnline && currentRoom?.activeVote?.type === "restart") ||
              isStartAnimation
            }
            style={{ opacity: isStartAnimation ? 0.5 : 1 }}
          />
    <RestartButton
            onClick={handleRestart}
            text={getRestartButtonText()}
            voteCount={getActiveVoteCount("restart")}
            disabled={
              (isOnline && currentRoom?.activeVote?.type === "pause") ||
              isStartAnimation
            }
            style={{ opacity: isStartAnimation ? 0.5 : 1 }}
          />
      </div>
      {dragState && (
        <div
          className={`dragged-piece ${dragState.isReturning ? "returning" : ""}`}
          style={{
            top: dragState.currentPos.y,
            left: dragState.currentPos.x,
          }}
        >
          <PieceDisplay
            type={dragState.piece.type}
            color={dragState.piece.color}
          />
        </div>
      )}

      {state.winner !== null && (
        <div
          className="pop-up winner"
          style={
            {
              "--winner-color":
                state.winner === "white"
                  ? "#fff"
                  : state.winner === "black"
                    ? "#000"
                    : undefined,
            } as React.CSSProperties
          }
        >
          <div className="content">
            <h1 className="heading">
              {state.winner === "draw"
                ? "Draw"
                : `${state.winner.charAt(0).toUpperCase() + state.winner.slice(1)} wins!`}
            </h1>
            <div className="control-buttons">
    <RestartButton
            onClick={handleRestart}
            text={getRestartButtonText()}
            voteCount={getActiveVoteCount("restart")}
            disabled={
              (isOnline && currentRoom?.activeVote?.type === "pause") ||
              isStartAnimation
            }
            style={{ opacity: isStartAnimation ? 0.5 : 1 }}
            forceText={true}
          />
              <button className="leave-btn" onClick={handleExit}>
                Leave
              </button>
              <button className="back-btn" onClick={handleExit}>
                Back to menu
              </button>
            </div>
            <div className="winner-piece">
              {state.winner !== "draw" && (
                <PieceDisplay type="pawn" color={state.winner} />
              )}
            </div>
          </div>
        </div>
      )}
      <PauseOverlay
        isOnline={isOnline}
        isPaused={
          (isOnline && currentRoom?.status === "paused") ||
          (!isOnline && state.isPaused)
        }
        onResume={handlePauseToggle}
        resumeText={getPauseButtonText()}
        isDisabled={isStartAnimation}
      />
    </section>
  );
};

export default Game;
