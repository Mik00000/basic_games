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
import { Modal } from "../../components/modals/Modal";
import { useOpponentDisconnect } from "../../hooks/useOpponentDisconnect";
import {
  ExitButton,
  PauseButton,
  RestartButton,
} from "../../components/game/GameControls";
import { PauseOverlay } from "../../components/game/PauseOverlay";
import { FirstPlayerSelector } from "../../components/game/FirstPlayerSelector/FirstPlayerSelector";
import { GameTopBar } from "../../components/game/GameTopBar";

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

const Chess = () => {
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
    handleUndo,
    handleDraw,
    handleResign,
  } = useGame(gameMode, onlineGameId);
  console.log(state);
  const [resetKey, setResetKey] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [isFlippedManually, setIsFlippedManually] = useState(false);
  const [isResignModalOpen, setIsResignModalOpen] = useState(false);

  useEffect(() => {
    if (isOnline) {
      setNow(Date.now());
      const interval = setInterval(() => setNow(Date.now()), 200);
      return () => clearInterval(interval);
    }
  }, [isOnline]);

  // No more useEffect for animDone, it's derived now

  // Fallback for interaction (if animation overlay blocks for too long)
  // We'll rely on the 10s fallback in isStartAnimation now.

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
    if (!isOnline || !state.onlineParams?.gameStartTime || !currentRoom?.id)
      return false;

    // Check session storage to see if we've already seen this specific game's animation
    const animKey = `chess_anim_shown_${currentRoom.id}_${state.onlineParams.gameStartTime}`;
    if (sessionStorage.getItem(animKey)) return false;

    // Show animation if we are still within the start window (plus a small grace period)
    const animEndWindow = state.onlineParams.gameStartTime + 2000;
    return now < animEndWindow;
  }, [isOnline, state.onlineParams?.gameStartTime, now, currentRoom?.id]);

  const isGameStarted =
    !isOnline ||
    !state.onlineParams?.gameStartTime ||
    now >= state.onlineParams.gameStartTime;

  const isBlocked =
    !isGameStarted ||
    isWaitingForOpponent ||
    state.isPaused ||
    (isOnline && currentRoom?.status === "paused") ||
    (gameMode === "bot" && state.currentTurn === "black");

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

  const handleRestart = React.useCallback(async () => {
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
  }, [isStartAnimation, isOnline, sendVote, originalRestart]);

  const handlePauseToggle = React.useCallback(async () => {
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
  }, [isOnline, isStartAnimation, sendVote, togglePause]);

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

  const getButtonTitle = (baseTitle: string, voteType: string) => {
    if (!isOnline) return baseTitle;
    const activeVote = currentRoom?.activeVote;
    if (activeVote?.type === voteType) {
      const hasVoted = currentPlayer && activeVote.voters.includes(currentPlayer.id);
      if (!hasVoted) {
        return `Opponent wants to ${voteType.toLowerCase()}`;
      }
      return `Waiting for opponent`;
    }
    return baseTitle;
  };

  const handleExit = React.useCallback(async () => {
    if (leaveRoom) await leaveRoom();
    cleanLocalStorage();
    navigate("/games/chess-menu");
  }, [leaveRoom, navigate]);

  const handlePromotion = React.useCallback(
    (type: Piece["type"]) => {
      if (isOnline) {
        if (onOnlinePromote) onOnlinePromote(type);
      } else {
        dispatch({ type: "PROMOTE_PAWN", pieceType: type });
      }
    },
    [isOnline, onOnlinePromote, dispatch],
  );

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

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent, r: number, c: number, cell: any) => {
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
    },
    [isBlocked, state.availableMoves, onCellClick],
  );

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

  const onCompleteAnim = React.useCallback(() => {
    if (currentRoom?.id && state.onlineParams?.gameStartTime) {
      sessionStorage.setItem(
        `chess_anim_shown_${currentRoom.id}_${state.onlineParams.gameStartTime}`,
        "true",
      );
    }
    // No need to setAnimDone, useMemo will re-evaluate on next 'now' tick or room update
  }, [currentRoom?.id, state.onlineParams?.gameStartTime]);

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
          onComplete={onCompleteAnim}
        />
      )}

      <OpponentDisconnectedModal
        isOpen={showOfflineModal}
        opponentName={opponentName}
        timer={offlineTimer}
        onExit={handleExit}
      />

      <Modal
        isOpen={isResignModalOpen}
        title="Resign?"
        onClose={() => setIsResignModalOpen(false)}
        className="modal--resign-modal"
        actions={
          <>
            <button
              className="back-btn"
              onClick={() => setIsResignModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="leave-btn"
              style={{ backgroundColor: "var(--danger)", borderColor: "var(--danger)" }}
              onClick={() => {
                setIsResignModalOpen(false);
                handleResign();
              }}
            >
              Resign
            </button>
          </>
        }
      >
        <div className="modal-body" style={{ color: "white", padding: "10px 0" }}>
          <p>Are you sure you want to resign? This will result in a loss.</p>
        </div>
      </Modal>

      <GameTopBar
        leftContent={<ExitButton onClick={handleExit} />}
        midContent={
          <>
            <Timer
              startTime={state.playerInfo.white.remainingTime}
              timerName={`chess_white_${onlineGameId || "local"}`}
              pause={
                state.currentTurn !== "white" || !!state.winner || isBlocked
              }
              onComplete={() => onTimeout("white")}
              key={`white_${onlineGameId || "local"}_${resetKey}`}
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
                state.currentTurn !== "black" || !!state.winner || isBlocked
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
          </>
        }
        rightContent={
          <>
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
          </>
        }
      />
      <div
        className="game-layout"
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: "24px",
          width: "100%",
          flexWrap: "wrap",
        }}
      >
        <div className="board">
          {(() => {
            const isFlippedBase =
              isOnline && state.onlineParams?.myColor === "black";
            const isFlipped = isFlippedBase !== isFlippedManually;
            const rows = isFlipped ? [...state.board].reverse() : state.board;

            return rows.map((logicalRow, displayR) => {
              const r = isFlipped ? 7 - displayR : displayR;
              const cols = isFlipped ? [...logicalRow].reverse() : logicalRow;

              return (
                <div className="row" key={r}>
                  {cols.map((cell, displayC) => {
                    const c = isFlipped ? 7 - displayC : displayC;
                    const isDraggingSource =
                      dragState?.origin.r === r && dragState?.origin.c === c;

                    return (
                      <div
                        key={r + "_" + c}
                        data-row={r}
                        data-col={c}
                        onMouseDown={(e) => handleMouseDown(e, r, c, cell)}
                        onClick={() => {
                          if (isBlocked) return;
                          if (!cell && !dragState) {
                            onCellClick(r, c);
                          }
                        }}
                        className={`cell ${(r + c) % 2 === 0 ? "white" : "black"} ${
                          (state.history[state.history.length - 1]?.from[0] ===
                            r &&
                            state.history[state.history.length - 1]?.from[1] ===
                              c) ||
                          (state.history[state.history.length - 1]?.to[0] ===
                            r &&
                            state.history[state.history.length - 1]?.to[1] ===
                              c)
                            ? "last-move"
                            : ""
                        } ${
                          state.selectedCell?.[0] === r &&
                          state.selectedCell?.[1] === c
                            ? "selected"
                            : ""
                        } ${cell?.type === "king" && state.sideInCheck === cell?.color ? "in-check" : ""}`}
                      >
                        {state.pendingPromotion &&
                          state.pendingPromotion.to[0] === r &&
                          state.pendingPromotion.to[1] === c &&
                          (gameMode !== "bot" ||
                            state.currentTurn === "white") && (
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
                        {displayC === 0 && (
                          <span className="coordinate-label rank-label">
                            {8 - r}
                          </span>
                        )}
                        {displayR === 7 && (
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
                            className={
                              isDraggingSource ? "dragging-hidden" : ""
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()}
        </div>

        {/* === Панель керування === */}
        <div
          className="controls"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            padding: "20px",
            border: "3px solid #152e4d",
            width: "280px",
            boxSizing: "border-box",
            flexShrink: 0,
            background: "#1a1a1a",
            minHeight: "400px",
          }}
        >
          <div className="status-section">
            <div className={`turn-indicator ${state.currentTurn}`}>
              <div className="turn-dot" />
              <span>
                {state.currentTurn === "white" ? "White" : "Black"} to move
              </span>
            </div>
            {state.sideInCheck && !state.winner && (
              <div className="check-alert">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>Check!</span>
              </div>
            )}
          </div>

          <div className="action-buttons">
            <button
              className={`action-btn ${getActiveVoteCount("undo") > 0 ? "active-vote" : ""}`}
              style={{ 
                position: "relative",
                backgroundColor: getActiveVoteCount("undo") > 0 ? "var(--warning)" : undefined 
              }}
              title={getButtonTitle("Undo last move", "undo")}
              onClick={handleUndo}
            >
              <span className="icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 7v6h6" />
                  <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
                </svg>
              </span>
              {getActiveVoteCount("undo") > 0 && (
                <span style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-6px",
                  backgroundColor: "var(--danger)",
                  color: "white",
                  fontSize: "0.7rem",
                  fontWeight: "bold",
                  padding: "2px 6px",
                }}>
                  {getActiveVoteCount("undo")}/{currentRoom?.players?.length || 2}
                </span>
              )}
            </button>
            {state.gameMode === "online" && (
              <button
                className={`action-btn ${getActiveVoteCount("draw") > 0 ? "active-vote" : ""}`}
                style={{ 
                  position: "relative",
                  backgroundColor: getActiveVoteCount("draw") > 0 ? "var(--warning)" : undefined 
                }}
                title={getButtonTitle("Offer draw", "draw")}
                onClick={handleDraw}
              >
                <span className="icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </span>
                {getActiveVoteCount("draw") > 0 && (
                  <span style={{
                    position: "absolute",
                    top: "-6px",
                    right: "-6px",
                    backgroundColor: "var(--danger)",
                    color: "white",
                    fontSize: "0.7rem",
                    fontWeight: "bold",
                    padding: "2px 6px",
                    borderRadius: "10px",
                  }}>
                    {getActiveVoteCount("draw")}/{currentRoom?.players?.length || 2}
                  </span>
                )}
              </button>
            )}
            <button
              className="action-btn action-btn--danger"
              title="Resign"
              onClick={() => setIsResignModalOpen(true)}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5 21V4C5 4 6 3 9 3C12 3 12 5 15 5C18 5 19 4 19 4V13C19 13 18 14 15 14C12 14 12 12 9 12C6 12 5 13 5 13"
                  stroke="white"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <button
              className="action-btn"
              title="Flip board"
              onClick={() => setIsFlippedManually((p) => !p)}
            >
              <span className="icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 014-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 01-4 4H3" />
                </svg>
              </span>
            </button>
          </div>

          {/* Захоплені фігури */}
          <div className="captured-section">
            <div className="section-title">
              <h3 className="captured-title">Captured</h3>
              <h3 className="timer">
                {state.currentTurn === "white" ? (
                  <Timer
                    startTime={state.playerInfo.white.remainingTime}
                    timerName={`chess_sidebar_white_${onlineGameId || "local"}`}
                    pause={
                      state.currentTurn !== "white" ||
                      !!state.winner ||
                      isBlocked
                    }
                    isServerControlled={isOnline}
                    syncTime={
                      isOnline && !isBlocked
                        ? state.playerInfo.white.remainingTime
                        : undefined
                    }
                  />
                ) : (
                  <Timer
                    startTime={state.playerInfo.black.remainingTime}
                    timerName={`chess_sidebar_black_${onlineGameId || "local"}`}
                    pause={
                      state.currentTurn !== "black" ||
                      !!state.winner ||
                      isBlocked
                    }
                    isServerControlled={isOnline}
                    syncTime={
                      isOnline && !isBlocked
                        ? state.playerInfo.black.remainingTime
                        : undefined
                    }
                  />
                )}
              </h3>
            </div>
            <div className="captured-row">
              <span className="captured-label">W</span>
              <div className="captured-pieces">
                {state.history
                  .filter((_, idx) => idx % 2 === 0)
                  .filter((m) => m.captured)
                  .map((m, i) => (
                    <span key={i} className="cap-piece">
                      {m.captured === "queen"
                        ? "♛"
                        : m.captured === "rook"
                          ? "♜"
                          : m.captured === "bishop"
                            ? "♝"
                            : m.captured === "knight"
                              ? "♞"
                              : "♟"}
                    </span>
                  ))}
              </div>
            </div>
            <div className="captured-row">
              <span className="captured-label">B</span>
              <div className="captured-pieces">
                {state.history
                  .filter((_, idx) => idx % 2 === 1)
                  .filter((m) => m.captured)
                  .map((m, i) => (
                    <span key={i} className="cap-piece">
                      {m.captured === "queen"
                        ? "♕"
                        : m.captured === "rook"
                          ? "♖"
                          : m.captured === "bishop"
                            ? "♗"
                            : m.captured === "knight"
                              ? "♘"
                              : "♙"}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          {/* Історія ходів */}
          <div className="move-history">
            <h3 className="section-title">Moves</h3>
            <div className="history-list">
              {state.history.length === 0 ? (
                <p className="history-empty">No moves yet</p>
              ) : (
                Array.from(
                  { length: Math.ceil(state.history.length / 2) },
                  (_, i) => {
                    const white = state.history[i * 2];
                    const black = state.history[i * 2 + 1];
                    return (
                      <div key={i} className="history-row">
                        <span className="move-num">{i + 1}.</span>
                        <span className="move white-move">
                          {white?.notation}
                        </span>
                        <span className="move black-move">
                          {black?.notation ?? ""}
                        </span>
                      </div>
                    );
                  },
                )
              )}
            </div>
          </div>
        </div>
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
                : state.winReason === "resign"
                  ? isOnline
                    ? state.winner === state.onlineParams?.myColor
                      ? "Opponent resigned!"
                      : "You resigned!"
                    : `${state.winner === "white" ? "Black" : "White"} resigned!`
                  : `${state.winner === "white" ? "White" : "Black"} won!`}
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

export default Chess;
