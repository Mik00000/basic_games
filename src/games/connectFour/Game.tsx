import React, { useReducer, useState, useEffect, useMemo } from "react";
import { FirstPlayerSelector } from "../../components/game/FirstPlayerSelector/FirstPlayerSelector";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import PauseIcon from "../../assets/icons/pause.svg?react";
import {
  hexToRgb,
  useStickyStateWithExpiry,
} from "../../components/common/utils";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import Timer from "../../components/game/Timer";
import {
  MAX_ROWS,
  CIRCLE_TIMER_DURATION,
  TIME_TO_FORGOT_GAME,
  PLAYER_MAX_GAME_TIME,
  isBoardEmpty,
  getLastEmptyRow,
  GameState as LocalGameState,
} from "./gameLogic";
import { initialGameState } from "./gameLogic";
import { gameReducer } from "./gameReducer";
import { botMove } from "./botBrains";
// Icons are now used in GameControls

// --- ONLINE IMPORTS ---
import { useOnlineGame } from "../../hooks/useOnlineGame";
import { ConnectingScreen } from "../../components/modals/ConnectingScreen";
import { OpponentDisconnectedModal } from "../../components/modals/OpponentDisconnectedModal";
import { useOpponentDisconnect } from "../../hooks/useOpponentDisconnect";

interface C4OnlineState {
  field: number[][];
  currentTurn: string;
  players: string[];
  winner: string | null;
  isFinished: boolean;
  lastChecker: [number, number] | null;
  timers: Record<string, { totalTime: number; lastMoveTimestamp: number }>;
  gameStartTime?: number;
}

import {
  ExitButton,
  MobileExitButton,
  PauseButton,
  RestartButton,
} from "../../components/game/GameControls";
import { PauseOverlay } from "../../components/game/PauseOverlay";

export const ConnectFour: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { onlineGameId } = useParams();

  const locState = (location.state || {}) as any;

  const gameMode = locState.gameMode || (onlineGameId ? "online" : "local");
  const isOnline = gameMode === "online";
  const difficulty = locState.difficulty || 1;

  // --- LOCAL LOGIC HOOKS ---
  const localGameId = locState.localGameId || "";
  const gameStateKey = localGameId
    ? `connectFourGameState_${localGameId}`
    : "connectFourGameState";

  const [stickyGameState, setStickyGameState] = useStickyStateWithExpiry(
    initialGameState,
    gameStateKey,
    TIME_TO_FORGOT_GAME,
  );

  const [localState, dispatch] = useReducer(
    gameReducer,
    isOnline ? initialGameState : stickyGameState,
  );

  useEffect(() => {
    if (!isOnline) {
      setStickyGameState(localState);
    }
  }, [localState, setStickyGameState, isOnline]);

  // --- ONLINE LOGIC HOOKS ---
  const {
    isConnected,
    currentRoom,
    currentPlayer: onlineMe,
    gameState: onlineState,
    leaveRoom,
    makeMove,
    sendVote,
  } = useOnlineGame<C4OnlineState>();

  // --- INIT ONLINE GAME ---
  useEffect(() => {
    if (!isOnline) return;

    // Remove the aggressive timeout redirect.
    // Instead, trust the hook state.
    // If we are disconnected but reconnecting, let it spin.

    // Only log if connection takes a while
    const timeout = setTimeout(() => {
      if (!isConnected && !currentRoom) {
        console.log("Still connecting to online game...");
      }
    }, 5000);

    // [FIX] Redirect to lobby if no session found after connection
    if (
      isConnected &&
      !currentRoom &&
      onlineGameId &&
      !localStorage.getItem("game_session")
    ) {
      // If we are connected (socket active) but have no room and no session token,
      // we definitely can't play here. Redirect to lobby to join properly.
      navigate(`/games/connect4/lobby/${onlineGameId}`, { replace: true });
    }

    return () => clearTimeout(timeout);
  }, [isOnline, isConnected, currentRoom, onlineGameId, navigate]);

  // --- HANDLE BROWSER BACK BUTTON ---
  // --- HANDLE COMPONENT UNMOUNT (Navigation/Back Button) ---
  const connectionRef = React.useRef({ isConnected, currentRoom });

  useEffect(() => {
    connectionRef.current = { isConnected, currentRoom };
  }, [isConnected, currentRoom]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount (navigation away)
      const { isConnected, currentRoom } = connectionRef.current;
      if (isOnline && isConnected && currentRoom) {
        console.log("Leaving room on unmount");
        leaveRoom();
      }
    };
  }, [isOnline, leaveRoom]); // leaveRoom is stable, isOnline is config

  // --- DATA MAPPING ---

  // Стейт для примусового оновлення компонента (таймери, анімації)
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (isOnline) {
      setNow(Date.now()); // Update immediately on any online change (e.g. state update)
      // Оновлюємо стейт "теперішнього часу" кожні 200мс
      const interval = setInterval(() => setNow(Date.now()), 200);
      return () => clearInterval(interval);
    }
  }, [isOnline, onlineState]); // Sync when state updates as well

  // --- FIX 1: Додано tick в залежності ---
  // Тепер useMemo перераховується кожні 200мс, перевіряючи Date.now()
  const isStartAnimation = useMemo(() => {
    if (!isOnline || !onlineState?.gameStartTime) return false;
    // Використовуємо стейт now
    return now < onlineState.gameStartTime;
  }, [isOnline, onlineState?.gameStartTime, now]);

  const displayState: LocalGameState = useMemo(() => {
    if (isOnline) {
      if (!onlineState || !currentRoom) return initialGameState;

      const player1Id = onlineState.players[0];
      const player2Id = onlineState.players[1];

      let currentPlayerNum: 1 | 2 | null = null;
      if (onlineState.currentTurn === player1Id) currentPlayerNum = 1;
      else if (onlineState.currentTurn === player2Id) currentPlayerNum = 2;

      let winnerNum: number | null = null;
      if (onlineState.winner === player1Id) winnerNum = 1;
      else if (onlineState.winner === player2Id) winnerNum = 2;
      else if (onlineState.isFinished && !onlineState.winner) winnerNum = 0;

      return {
        field: onlineState.field || [],
        currentPlayer: currentPlayerNum,
        winner: winnerNum,
        lastChecker: onlineState.lastChecker,
        isNewGame: isStartAnimation || onlineState.players.length < 2,
        showCoinToss: isStartAnimation,
      };
    }
    return localState;
  }, [isOnline, onlineState, localState, currentRoom, isStartAnimation]);

  // --- NAMES & COLORS ---
  const p1Id = isOnline ? onlineState?.players?.[0] : undefined;
  const p2Id = isOnline ? onlineState?.players?.[1] : undefined;

  const onlinePlayer1Obj = currentRoom?.players?.find(
    (p: any) => p.id === p1Id,
  );
  const onlinePlayer2Obj = currentRoom?.players?.find(
    (p: any) => p.id === p2Id,
  );

  const p1Name = isOnline
    ? (onlinePlayer1Obj?.username ?? "Player 1")
    : (locState.playerOneName ?? "Player 1");

  const p2NameRaw = isOnline
    ? (onlinePlayer2Obj?.username ?? "Waiting...")
    : (locState.playerTwoName ?? "Player 2");

  const effectivePlayerTwoName =
    !isOnline && gameMode === "bot" ? "Bot" : p2NameRaw;

  const [colorCache, setColorCache] = useState<Record<string, string>>({});

  useEffect(() => {
    const players = currentRoom?.players;
    if (!players) return;
    setColorCache((prev) => {
      const newCache = { ...prev };
      let changed = false;

      players.forEach((p: any) => {
        if (p.id && p.gameData?.color && newCache[p.id] !== p.gameData.color) {
          newCache[p.id] = p.gameData.color;
          changed = true;
        }
      });

      return changed ? newCache : prev;
    });
  }, [currentRoom?.players]);

  const p1Color = isOnline
    ? colorCache[p1Id || ""] ||
      (onlinePlayer1Obj as any)?.gameData?.color ||
      locState.playerOneColor ||
      "#FF0000"
    : locState.playerOneColor || "#FF0000";

  const p2Color = isOnline
    ? colorCache[p2Id || ""] ||
      (onlinePlayer2Obj as any)?.gameData?.color ||
      locState.playerTwoColor ||
      "#0000FF"
    : locState.playerTwoColor || "#0000FF";

  // --- GAMEPLAY HANDLERS ---
  const [isPause, setIsPause] = useState<boolean>(false);
  const [isGameBlocked, setIsGameBlocked] = useState<boolean>(false);
  const [hoveredCell, setHoveredCell] = useState<{
    row: number;
    col: number;
  } | null>(null);

  const [player1TimerKey, setPlayer1TimerKey] = useState(0);
  const [player2TimerKey, setPlayer2TimerKey] = useState(0);
  const [timerSyncKey, setTimerSyncKey] = useState(0); // For forcing sync on drift

  // --- OFFLINE MODAL LOGIC ---

  // --- OFFLINE MODAL LOGIC (Extracted Hook) ---
  const { showOfflineModal, offlineTimer, opponentName } =
    useOpponentDisconnect({
      isOnline,
      currentRoom: currentRoom as any,
      currentUser: onlineMe || null,
    });

  const timer1Key = localGameId
    ? `circleTimer1RemainingTime_${localGameId}`
    : "circleTimer1RemainingTime";
  const timer2Key = localGameId
    ? `circleTimer2RemainingTime_${localGameId}`
    : "circleTimer2RemainingTime";

  const [timer1RemainingTime, setTimer1RemainingTime] =
    useStickyStateWithExpiry<number>(
      CIRCLE_TIMER_DURATION,
      timer1Key,
      TIME_TO_FORGOT_GAME,
    );
  const [timer2RemainingTime, setTimer2RemainingTime] =
    useStickyStateWithExpiry<number>(
      CIRCLE_TIMER_DURATION,
      timer2Key,
      TIME_TO_FORGOT_GAME,
    );

  const [circleTimer1Key, setCircleTimer1Key] = useState(1);
  const [circleTimer2Key, setCircleTimer2Key] = useState(1);

  const cleanLocalStorage = () => {
    // If we have a specific localGameId, clear its specific keys.
    // If not, clear the default legacy keys (or both for safety, but focus on current context).
    const suffix = localGameId ? `_${localGameId}` : "";

    const keys = [
      `connectFourGameState${suffix}`,
      `circleTimer1RemainingTime${suffix}`,
      `circleTimer2RemainingTime${suffix}`,
      `connectFourTimerTime1${suffix}`,
      `connectFourTimerTime2${suffix}`,
    ];
    // Also clear default keys just in case mixed usage (user request: "cleanliness")
    if (localGameId) {
      keys.push(
        "connectFourGameState",
        "circleTimer1RemainingTime",
        "circleTimer2RemainingTime",
        "connectFourTimerTime1",
        "connectFourTimerTime2",
      );
    }

    keys.forEach((key) => localStorage.removeItem(key));
    setPlayer1TimerKey((p) => p + 1);
    setPlayer2TimerKey((p) => p + 1);
    setCircleTimer1Key((p) => p + 1);
    setCircleTimer2Key((p) => p + 1);
    setTimer1RemainingTime(CIRCLE_TIMER_DURATION);
    setTimer2RemainingTime(CIRCLE_TIMER_DURATION);
  };

  const handleExit = async () => {
    if (isOnline) {
      // Manual leave -> Forfeit if playing
      await leaveRoom();
    }
    cleanLocalStorage();
    navigate("/games/connect4-menu");
  };

  const handleRestart = async () => {
    // Ця перевірка тепер працюватиме коректно, бо state.showCoinToss оновиться
    if (state.showCoinToss) return;
    if (isOnline) {
      try {
        await sendVote("restart");
      } catch (e) {
        console.error("Failed to vote", e);
      }
    } else {
      dispatch({ type: "RESET" });
      cleanLocalStorage();
    }
  };

  const getRestartButtonText = () => {
    if (state.showCoinToss) return "Starting..."; // Візуальна підказка

    if (!isOnline) return "Restart";
    const activeVote = currentRoom?.activeVote;
    const isRestartVoting = activeVote?.type === "restart";

    const votesCount = isRestartVoting ? activeVote.voters.length : 0;
    const playersCount = currentRoom?.players?.length || 2;

    const hasIVoted =
      isRestartVoting && onlineMe && activeVote?.voters.includes(onlineMe.id);
    if (hasIVoted) {
      return `Waiting (${votesCount}/${playersCount})`;
    }
    return votesCount > 0
      ? `Restart (${votesCount}/${playersCount})`
      : "Restart";
  };
  const getActiveVoteCount = (voteType: string) => {
    if (!isOnline) return 0;
    const activeVote = currentRoom?.activeVote;
    const isRestartVoting = activeVote?.type === voteType;
    return isRestartVoting ? activeVote.voters.length : 0;
  };

  // --- TIME CALCULATION ---
  const calculateOnlineTime = (pid: string | undefined) => {
    if (!pid || !onlineState?.timers?.[pid]) return PLAYER_MAX_GAME_TIME;

    if (isStartAnimation) {
      return onlineState.timers[pid].totalTime;
    }

    const timerData = onlineState.timers[pid];
    const isActiveTurn = onlineState.currentTurn === pid;

    if (isActiveTurn && !onlineState.winner) {
      const timeElapsed = now - timerData.lastMoveTimestamp;
      return Math.max(timerData.totalTime - timeElapsed, 0);
    } else {
      return timerData.totalTime;
    }
  };

  const calculateTurnTime = (pid: string | undefined) => {
    if (!pid || !onlineState?.timers?.[pid] || !isOnline)
      return CIRCLE_TIMER_DURATION;

    if (isStartAnimation) return CIRCLE_TIMER_DURATION;

    if (onlineState.currentTurn !== pid) return CIRCLE_TIMER_DURATION;
    if (onlineState.winner) return 0;

    const timeElapsedMs = now - onlineState.timers[pid].lastMoveTimestamp;
    const remainingMs = CIRCLE_TIMER_DURATION * 1000 - timeElapsedMs;

    return Math.max(Math.ceil(remainingMs / 1000), 0);
  };

  const handlePauseToggle = async () => {
    if (!isOnline) {
      if (!isGameBlocked) setIsPause((p) => !p);
      return;
    }
    try {
      await sendVote("pause");
    } catch (e) {
      console.error("Failed to vote pause", e);
    }
  };

  const getPauseButtonText = () => {
    if (isStartAnimation) return "Starting...";

    if (!isOnline) return isPause ? "Resume" : "Pause";
    const isPaused = currentRoom?.status === "paused";
    const activeVote = currentRoom?.activeVote;
    const isPauseVoting = activeVote?.type === "pause";
    const baseAction = isPaused ? "Resume" : "Pause";

    if (isPauseVoting) {
      const hasVoted = onlineMe && activeVote?.voters.includes(onlineMe.id);
      const count = activeVote.voters.length;
      const total = currentRoom?.players?.length || 2;
      if (hasVoted) return `Waiting (${count}/${total})`;
      return `${baseAction} (${count}/${total})`;
    }
    return baseAction;
  };

  const p1Time = isOnline ? calculateOnlineTime(p1Id) : 0;
  const p2Time = isOnline ? calculateOnlineTime(p2Id) : 0;

  // Local Effects
  useEffect(() => {
    if (isOnline) return;
    if (
      localState.isNewGame &&
      localState.showCoinToss &&
      isBoardEmpty(localState.field)
    ) {
      setIsPause(true);
      setIsGameBlocked(true);
    }
  }, [
    localState.isNewGame,
    localState.showCoinToss,
    localState.field,
    isOnline,
  ]);

  const handleFirstPlayerSelected = (winnerIndex: number) => {
    dispatch({ type: "SET_PLAYER", player: winnerIndex + 1 });
    dispatch({ type: "HIDE_COIN_TOSS" });
    setIsGameBlocked(false);
    setIsPause(false);
  };

  useEffect(() => {
    if (isOnline) return;
    if (localState.currentPlayer === 1) {
      setCircleTimer2Key((p) => p + 1);
      if (timer2RemainingTime !== CIRCLE_TIMER_DURATION)
        setTimer2RemainingTime(CIRCLE_TIMER_DURATION);
    } else if (localState.currentPlayer === 2) {
      setCircleTimer1Key((p) => p + 1);
      if (timer1RemainingTime !== CIRCLE_TIMER_DURATION)
        setTimer1RemainingTime(CIRCLE_TIMER_DURATION);
    }
  }, [
    localState.currentPlayer,
    timer1RemainingTime,
    timer2RemainingTime,
    isOnline,
  ]);

  useEffect(() => {
    if (
      !isOnline &&
      gameMode === "bot" &&
      localState.currentPlayer === 2 &&
      !localState.winner &&
      !isPause
    ) {
      botMove(localState, dispatch, difficulty);
    }
  }, [
    isOnline,
    gameMode,
    localState.currentPlayer,
    localState.winner,
    isPause,
    localState.field,
    difficulty,
  ]);

  const handleCellClick = (columnIndex: number) => {
    if (displayState.winner !== null || isPause) return;

    if (isOnline) {
      if (!onlineMe || !currentRoom || !currentRoom.players) return;
      if (currentRoom.players.length < 2) {
        console.log("Waiting for opponent...");
        return;
      }
      const isPlayer1 = currentRoom.players?.[0]?.id === onlineMe.id;
      const myPlayerNum = isPlayer1 ? 1 : 2;

      if (displayState.currentPlayer !== myPlayerNum) {
        console.log("Not your turn!");
        return;
      }
      makeMove({ column: columnIndex });
    } else {
      if (gameMode === "bot" && localState.currentPlayer === 2) return;
      if (getLastEmptyRow(localState.field, columnIndex) !== null) {
        dispatch({ type: "DROP_CHECKER", column: columnIndex });
      }
    }
  };

  const rgbPlayer1 = hexToRgb(p1Color);
  const rgbPlayer2 = hexToRgb(p2Color);
  const state = displayState;

  const isWaitingForOpponent =
    isOnline &&
    isConnected &&
    currentRoom &&
    (currentRoom.players?.length || 0) < 2;

  if (isOnline) {
    if (!isConnected || !currentRoom || !onlineMe) {
      return (
        <ConnectingScreen onCancel={() => navigate("/games/connect4-menu")} />
      );
    }
  }

  return (
    <section
      className="connect-four"
      style={
        {
          "--player-color-1": rgbPlayer1,
          "--player-color-2": rgbPlayer2,
          "--row-length": `${MAX_ROWS}`,
        } as React.CSSProperties
      }
    >
      {isOnline && !isConnected && <ConnectingScreen onCancel={handleExit} />}

      {/* {isOnline && isWaitingForOpponent && (
        <WaitingForOpponentScreen
          roomId={currentRoom?.id}
          onCancel={handleExit}
        />
      )} */}

      <div className="top-bar">
        <div className="left-part">
          <ExitButton onClick={handleExit} />
        </div>
        <div className="mid-part">
          <div className="player-1-timers">
            {!isOnline ? (
              <Timer
                startTime={PLAYER_MAX_GAME_TIME}
                timerName={
                  localGameId
                    ? `connectFourTimerTime1_${localGameId}`
                    : "connectFourTimerTime1"
                }
                timeToForgotTimer={TIME_TO_FORGOT_GAME}
                pause={
                  state.currentPlayer !== 1 ||
                  state.currentPlayer !== 1 ||
                  Boolean(state.winner) ||
                  isPause ||
                  isStartAnimation
                }
                key={player1TimerKey}
                onComplete={() => dispatch({ type: "SET_WINNER", winner: 2 })}
              />
            ) : (
              <Timer
                startTime={PLAYER_MAX_GAME_TIME}
                timerName="online_p1"
                isServerControlled={true}
                syncTime={
                  isOnline && currentRoom?.status === "paused"
                    ? undefined
                    : p1Time
                }
                pause={
                  onlineState?.currentTurn !== p1Id ||
                  !!onlineState?.winner ||
                  isStartAnimation ||
                  (isOnline && currentRoom?.status === "paused") ||
                  (isOnline &&
                    currentRoom?.players?.length === 2 &&
                    !currentRoom.players[1].isOnline)
                }
                className="online-timer"
              />
            )}
            <CountdownCircleTimer
              key={
                isOnline
                  ? `p1-turn-${
                      onlineState?.timers?.[p1Id || ""]?.lastMoveTimestamp
                    }-${state.currentPlayer}-${timerSyncKey}`
                  : circleTimer1Key
              }
              isPlaying={
                isOnline
                  ? !isStartAnimation &&
                    state.currentPlayer === 1 &&
                    currentRoom?.status === "playing" &&
                    !state.winner
                  : state.currentPlayer === 1 && !isPause && !state.winner
              }
              duration={CIRCLE_TIMER_DURATION}
              initialRemainingTime={
                isOnline ? calculateTurnTime(p1Id) : timer1RemainingTime
              }
              colors={"#d9d9d9"}
              trailColor={`rgb(${rgbPlayer1})`}
              size={40}
              strokeWidth={3}
              onUpdate={(t) => {
                if (!isOnline) {
                  setTimer1RemainingTime(t);
                } else {
                  // Drift Check
                  if (
                    state.currentPlayer === 1 &&
                    onlineState?.currentTurn === p1Id
                  ) {
                    const realTime = calculateTurnTime(p1Id);
                    if (Math.abs(realTime - t) > 1) {
                      setTimerSyncKey((prev) => prev + 1);
                    }
                  }
                }
              }}
              onComplete={() => {
                dispatch({ type: "SET_PLAYER", player: 2 });
              }}
            >
              {({ remainingTime }) => Math.ceil(remainingTime)}
            </CountdownCircleTimer>
          </div>
          <div
            className="nickname-display"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <h1>
              {!state.showCoinToss &&
                (state.winner !== null
                  ? state.winner === 1
                    ? `${p1Name} wins`
                    : state.winner === 2
                      ? `${effectivePlayerTwoName} wins`
                      : "Draw"
                  : state.currentPlayer === 1
                    ? p1Name
                    : state.currentPlayer === 2
                      ? effectivePlayerTwoName
                      : "Waiting...")}
            </h1>
            {isOnline && currentRoom && (
              <span
                style={{ fontSize: "0.8rem", color: "#aaa", marginTop: "4px" }}
              >
                Room: {currentRoom.id}
              </span>
            )}
          </div>
          <div className="player-2-timers">
            <CountdownCircleTimer
              key={
                isOnline
                  ? `p2-turn-${
                      onlineState?.timers?.[p2Id || ""]?.lastMoveTimestamp
                    }-${state.currentPlayer}-${timerSyncKey}`
                  : circleTimer2Key
              }
              isPlaying={
                isOnline
                  ? !isStartAnimation &&
                    state.currentPlayer === 2 &&
                    currentRoom?.status === "playing" &&
                    !state.winner
                  : state.currentPlayer === 2 && !isPause && !state.winner
              }
              duration={CIRCLE_TIMER_DURATION}
              initialRemainingTime={
                isOnline ? calculateTurnTime(p2Id) : timer2RemainingTime
              }
              colors={"#d9d9d9"}
              trailColor={`rgb(${rgbPlayer2})`}
              size={40}
              strokeWidth={3}
              onUpdate={(t) => {
                if (!isOnline) {
                  setTimer2RemainingTime(t);
                } else {
                  // Drift Check
                  if (
                    state.currentPlayer === 2 &&
                    onlineState?.currentTurn === p2Id
                  ) {
                    const realTime = calculateTurnTime(p2Id);
                    if (Math.abs(realTime - t) > 1) {
                      setTimerSyncKey((prev) => prev + 1);
                    }
                  }
                }
              }}
              onComplete={() => {
                if (!isOnline) dispatch({ type: "SET_PLAYER", player: 1 });
              }}
            >
              {({ remainingTime }) => Math.ceil(remainingTime)}
            </CountdownCircleTimer>
            {!isOnline ? (
              <Timer
                startTime={PLAYER_MAX_GAME_TIME}
                timerName={
                  localGameId
                    ? `connectFourTimerTime2_${localGameId}`
                    : "connectFourTimerTime2"
                }
                timeToForgotTimer={TIME_TO_FORGOT_GAME}
                pause={
                  state.currentPlayer !== 2 ||
                  Boolean(state.winner) ||
                  isPause ||
                  isStartAnimation
                }
                key={player2TimerKey * -1}
                onComplete={() => dispatch({ type: "SET_WINNER", winner: 1 })}
              />
            ) : (
              <Timer
                startTime={PLAYER_MAX_GAME_TIME}
                timerName="online_p2"
                isServerControlled={true}
                syncTime={
                  isOnline && currentRoom?.status === "paused"
                    ? undefined
                    : p2Time
                }
                pause={
                  onlineState?.currentTurn !== p2Id ||
                  !!onlineState?.winner ||
                  isStartAnimation ||
                  (isOnline && currentRoom?.status === "paused") ||
                  (isOnline &&
                    currentRoom?.players?.length === 2 &&
                    !currentRoom.players[0].isOnline)
                }
                className="online-timer"
              />
            )}
          </div>
        </div>
        <div className="right-part">
          <PauseButton
            onClick={handlePauseToggle}
            isPaused={
              (isOnline && currentRoom?.status === "paused") ||
              (!isOnline && isPause)
            }
            style={{ opacity: isStartAnimation ? 0.5 : 1 }}
            disabled={
              (isOnline && currentRoom?.activeVote?.type === "restart") ||
              isStartAnimation
            }
            text={getPauseButtonText()}
            voteCount={getActiveVoteCount("pause")}
          />
          <RestartButton
            onClick={handleRestart}
            disabled={isOnline && (currentRoom?.players?.length || 0) < 2}
            isStartAnimation={isStartAnimation}
            text={getRestartButtonText()}
            voteCount={getActiveVoteCount("restart")}
          />
        </div>
      </div>

      {/* OPPONENT DISCONNECTED MODAL */}
      <OpponentDisconnectedModal
        isOpen={showOfflineModal}
        opponentName={opponentName}
        timer={offlineTimer}
        onExit={handleExit}
      />

      <div className="field-wrapper">
        <div className="field-main">
          <div className="field">
            {state.field.map((row: any, rowIndex: any) => (
              <div className="row" key={rowIndex}>
                {row.map((_: any, colIndex: any) => {
                  const lastEmpty = getLastEmptyRow(state.field, colIndex);
                  const isMyTurnOnline =
                    isOnline &&
                    onlineMe &&
                    ((currentRoom?.players?.[0]?.id === onlineMe.id &&
                      state.currentPlayer === 1) ||
                      (currentRoom?.players?.[1]?.id === onlineMe.id &&
                        state.currentPlayer === 2));
                  const canHover = isOnline
                    ? isMyTurnOnline
                    : !(gameMode === "bot" && state.currentPlayer === 2);

                  return (
                    <div
                      key={colIndex}
                      className={`cell ${
                        hoveredCell?.col === colIndex && canHover
                          ? "hovered-col"
                          : ""
                      }`}
                      onMouseEnter={() =>
                        setHoveredCell({ row: rowIndex, col: colIndex })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => {
                        if (lastEmpty !== null && !isPause)
                          handleCellClick(colIndex);
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="field-with-checkers">
            {state.field.map((row: any, rowIndex: any) => (
              <div className="row" key={rowIndex}>
                {row.map((cell: any, colIndex: any) => {
                  const lastEmpty = getLastEmptyRow(state.field, colIndex);
                  const isHovered =
                    rowIndex === lastEmpty &&
                    hoveredCell?.col === colIndex &&
                    (isOnline
                      ? isOnline &&
                        onlineMe &&
                        ((currentRoom?.players?.[0]?.id === onlineMe.id &&
                          state.currentPlayer === 1) ||
                          (currentRoom?.players?.[1]?.id === onlineMe.id &&
                            state.currentPlayer === 2))
                      : !(gameMode === "bot" && state.currentPlayer === 2));
                  const isActive = cell !== 0;
                  const isLastChecker =
                    state.lastChecker &&
                    state.lastChecker[0] === rowIndex &&
                    state.lastChecker[1] === colIndex;

                  return (
                    <div
                      key={colIndex}
                      className={`cell 
                      ${
                        isHovered
                          ? `hovered-by-player-${state.currentPlayer}`
                          : ""
                      }
                      ${isActive ? `active-by-player-${cell} falling` : ""}
                      ${isLastChecker ? "last-checker" : ""}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <PauseOverlay
          isOnline={isOnline}
          isPaused={
            state.showCoinToss ||
            (!isOnline && isPause) ||
            (isOnline && currentRoom?.status === "paused")
          }
          onResume={handlePauseToggle}
          resumeText={getPauseButtonText()}
          isDisabled={
            (isOnline && currentRoom?.activeVote?.type === "restart") ||
            isStartAnimation
          }
          voteCount={getActiveVoteCount("pause")}
        />
      </div>

      {state.showCoinToss && isBoardEmpty(state.field) && (
        <FirstPlayerSelector
          players={[
            { name: p1Name, color: p1Color },
            {
              name:
                !isOnline && gameMode === "bot"
                  ? "Bot"
                  : isOnline
                    ? p2NameRaw
                    : effectivePlayerTwoName,
              color: p2Color,
            },
          ]}
          onComplete={handleFirstPlayerSelected}
          duration={3500}
          targetWinnerIndex={
            isOnline
              ? onlineState?.currentTurn === p1Id
                ? 0
                : onlineState?.currentTurn === p2Id
                  ? 1
                  : undefined
              : undefined
          }
        />
      )}

      {state.winner !== null && (
        <div
          className="pop-up"
          style={
            {
              "--winner-color":
                state.winner === 1
                  ? rgbPlayer1
                  : state.winner === 2
                    ? rgbPlayer2
                    : undefined,
            } as React.CSSProperties
          }
        >
          <div className="content">
            <h1 className="heading">
              {state.winner === 1 && `${p1Name} wins`}
              {state.winner === 2 && `${effectivePlayerTwoName} wins`}
              {state.winner === 0 && "Draw"}
            </h1>
            <div className="control-buttons">
              <RestartButton
                onClick={handleRestart}
                disabled={isOnline && (currentRoom?.players?.length || 0) < 2}
                title={
                  isOnline && (currentRoom?.players?.length || 0) < 2
                    ? "Waiting for second player..."
                    : "Restart Game"
                }
                text={getRestartButtonText()}
                forceText={true}
                voteCount={getActiveVoteCount("restart")}
              />
              <button className="leave-btn" onClick={handleExit}>
                Leave
              </button>
              <button className="back-btn" onClick={handleExit}>
                Back to menu
              </button>
            </div>
            <div className="winner-checker falling" />
          </div>
        </div>
      )}
      <div className="top-bar mobile">
        <MobileExitButton onClick={handleExit} />
        <PauseButton
          onClick={handlePauseToggle}
          isPaused={
            (isOnline && currentRoom?.status === "paused") ||
            (!isOnline && isPause)
          }
          style={{ opacity: isStartAnimation ? 0.5 : 1 }}
          disabled={
            (isOnline && currentRoom?.activeVote?.type === "restart") ||
            isStartAnimation
          }
          text={getPauseButtonText()}
          voteCount={getActiveVoteCount("pause")}
        />
        <RestartButton
          onClick={handleRestart}
          disabled={isOnline && (currentRoom?.players?.length || 0) < 2}
          isStartAnimation={isStartAnimation}
          text={getRestartButtonText()}
          voteCount={getActiveVoteCount("restart")}
        />
      </div>
    </section>
  );
};
