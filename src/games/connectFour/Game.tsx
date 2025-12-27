import React, { useReducer, useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  generateRandomNumber,
  hexToRgb,
  useStickyStateWithExpiry,
} from "../../components/utils";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import Timer from "../../components/Timer";
import ShowTextAfterTime from "../../components/ShowTextAfterTime";
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

// --- ONLINE IMPORTS ---
import { useOnlineGame } from "../../hooks/useOnlineGame";

interface C4OnlineState {
  field: number[][];
  currentTurn: string;
  players: string[];
  winner: string | null;
  isFinished: boolean;
  lastChecker: [number, number] | null;
}

export const ConnectFour: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Оновлено згідно твого нового роутингу
  const { onlineGameId } = useParams();

  const locState = (location.state || {}) as any;
  
  // Визначаємо режим гри. 
  // Якщо є onlineGameId в URL (навіть "create") АБО передано state.gameMode === "online"
  const gameMode = locState.gameMode || (onlineGameId ? "online" : "local");
  const isOnline = gameMode === "online";
  const difficulty = locState.difficulty || 1;

  // --- LOCAL LOGIC HOOKS ---
  const [stickyGameState, setStickyGameState] = useStickyStateWithExpiry(
    initialGameState,
    "connectFourGameState",
    TIME_TO_FORGOT_GAME
  );

  const [localState, dispatch] = useReducer(
    gameReducer,
    isOnline ? initialGameState : stickyGameState
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
    createRoom,
    joinRoom,
    leaveRoom,
    makeMove,
  } = useOnlineGame<C4OnlineState>();

  // Зберігаємо флаг, що ми вже спробували ініціалізувати гру, щоб не спамити запитами
  const hasAttemptedJoinRef = useRef(false);

  // --- INIT ONLINE GAME ---
  useEffect(() => {
    if (!isOnline) return;
    
    // ВАЖЛИВО: Чекаємо поки сокет дійсно підключиться!
    if (!isConnected) return;
    
    // Якщо ми вже в кімнаті з цим ID - нічого не робимо
    if (currentRoom?.id && (onlineGameId && onlineGameId !== "create" ? currentRoom.id === onlineGameId : true)) {
        return;
    }

    // Запобіжник від подвійного виклику
    if (hasAttemptedJoinRef.current) return;

    const initOnline = async () => {
      hasAttemptedJoinRef.current = true;

      // Генеруємо випадкове ім'я для гостя, якщо state пустий
      // Це критично, бо сервер відхилить "Player 1", якщо він вже є в кімнаті
      const randomId = Math.floor(Math.random() * 1000);
      const defaultName = `Guest ${randomId}`;
      const myUsername = locState.playerOneName || defaultName;

      // Логіка визначення ID кімнати
      const targetRoomId = onlineGameId === "create" ? undefined : onlineGameId;

      try {
        if (!targetRoomId) {
            // --- CREATE ROOM ---
            console.log("Creating room as:", myUsername);
            const res = await createRoom({
                name: `${myUsername}'s Room`,
                gameType: "connect-four",
                maxPlayers: 2,
                username: myUsername,
                initialState: {} as any, 
            });
            if (!res.success) console.error("Create failed:", res.error);
        } else {
            // --- JOIN ROOM ---
            console.log(`Joining room ${targetRoomId} as:`, myUsername);
            const res = await joinRoom({
                roomId: targetRoomId,
                username: myUsername,
            });
            
            if (!res.success) {
                console.error("Join failed:", res.error);
                alert(`Failed to join: ${res.error?.message}`);
                // Якщо помилка, скидаємо флаг, щоб можна було спробувати ще раз (або перенаправляємо)
                hasAttemptedJoinRef.current = false; 
                navigate("/games/connect4-menu");
            }
        }
      } catch (e) {
        console.error("Error during online init:", e);
        hasAttemptedJoinRef.current = false;
      }
    };

    initOnline();
  }, [isOnline, isConnected, onlineGameId, createRoom, joinRoom, currentRoom?.id, locState.playerOneName, navigate]);

  // --- DATA MAPPING ---
  const displayState: LocalGameState = useMemo(() => {
    if (isOnline) {
      if (!onlineState || !currentRoom) return initialGameState;
      if (!onlineState.field || !Array.isArray(onlineState.field)) return initialGameState;

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
        field: onlineState.field,
        currentPlayer: currentPlayerNum,
        winner: winnerNum,
        lastChecker: onlineState.lastChecker,
        isNewGame: onlineState.players.length < 2,
        showCoinToss: false,
      };
    }
    return localState;
  }, [isOnline, onlineState, localState, currentRoom]);

  // --- NAMES & COLORS ---
  const p1Name = isOnline ? (currentRoom?.players?.[0]?.username ?? "Player 1") : (locState.playerOneName ?? "Player 1");
  const p2NameRaw = isOnline ? (currentRoom?.players?.[1]?.username ?? "Waiting...") : (locState.playerTwoName ?? "Player 2");
  const effectivePlayerTwoName = (!isOnline && gameMode === "bot") ? "Bot" : p2NameRaw;

  const p1Color = locState.playerOneColor || "#FF0000";
  const p2Color = locState.playerTwoColor || "#0000FF";

  // --- GAMEPLAY HANDLERS ---
  const [isPause, setIsPause] = useState<boolean>(false);
  const [isGameBlocked, setIsGameBlocked] = useState<boolean>(false);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  // Timers
  const [player1TimerKey, setPlayer1TimerKey] = useState(0);
  const [player2TimerKey, setPlayer2TimerKey] = useState(0);
  
  const [timer1RemainingTime, setTimer1RemainingTime] =
    useStickyStateWithExpiry<number>(CIRCLE_TIMER_DURATION, "circleTimer1RemainingTime", TIME_TO_FORGOT_GAME);
  const [timer2RemainingTime, setTimer2RemainingTime] =
    useStickyStateWithExpiry<number>(CIRCLE_TIMER_DURATION, "circleTimer2RemainingTime", TIME_TO_FORGOT_GAME);

  const [circleTimer1Key, setCircleTimer1Key] = useState(1);
  const [circleTimer2Key, setCircleTimer2Key] = useState(1);

  const cleanLocalStorage = () => {
    const keys = ["connectFourGameState", "circleTimer1RemainingTime", "circleTimer2RemainingTime", "connectFourTimerTime1", "connectFourTimerTime2"];
    keys.forEach((key) => localStorage.removeItem(key));
    setPlayer1TimerKey((p) => p + 1); setPlayer2TimerKey((p) => p + 1);
    setCircleTimer1Key((p) => p + 1); setCircleTimer2Key((p) => p + 1);
    setTimer1RemainingTime(CIRCLE_TIMER_DURATION); setTimer2RemainingTime(CIRCLE_TIMER_DURATION);
  };

  const handleExit = async () => {
    if (isOnline) await leaveRoom();
    cleanLocalStorage();
    navigate("/games/connect4-menu");
  };

  const handleRestart = () => {
    if (isOnline) {
      alert("Restart is not yet supported in online mode.");
    } else {
      dispatch({ type: "RESET" });
      cleanLocalStorage();
    }
  };

  // Local Effects (CoinToss, Timers, Bot)
  useEffect(() => {
    if (isOnline) return;
    if (localState.isNewGame && localState.showCoinToss && isBoardEmpty(localState.field)) {
      setIsPause(true); setIsGameBlocked(true);
      const flipResult = Math.random();
      setTimeout(() => {
        dispatch({ type: "SET_PLAYER", player: flipResult <= 0.5 ? 1 : 2 });
        setTimeout(() => {
          dispatch({ type: "HIDE_COIN_TOSS" });
          setIsGameBlocked(false); setIsPause(false);
        }, 5000);
      }, 100);
    }
  }, [localState.isNewGame, localState.showCoinToss, localState.field, isOnline]);

  useEffect(() => {
    if (isOnline) return;
    if (localState.currentPlayer === 1) {
      setCircleTimer2Key((p) => p + 1);
      if (timer2RemainingTime !== CIRCLE_TIMER_DURATION) setTimer2RemainingTime(CIRCLE_TIMER_DURATION);
    } else if (localState.currentPlayer === 2) {
      setCircleTimer1Key((p) => p + 1);
      if (timer1RemainingTime !== CIRCLE_TIMER_DURATION) setTimer1RemainingTime(CIRCLE_TIMER_DURATION);
    }
  }, [localState.currentPlayer, timer1RemainingTime, timer2RemainingTime, isOnline]);

  useEffect(() => {
    if (!isOnline && gameMode === "bot" && localState.currentPlayer === 2 && !localState.winner && !isPause) {
      botMove(localState, dispatch, difficulty);
    }
  }, [isOnline, gameMode, localState.currentPlayer, localState.winner, isPause, localState.field, difficulty]);


  // --- CLICK HANDLER ---
  const handleCellClick = (columnIndex: number) => {
    if (displayState.winner !== null || isPause ) return;

    if (isOnline) {
        if (!onlineMe || !currentRoom || !currentRoom.players) return;
        
        // Перевірка чи достатньо гравців
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

  // --- RENDER HELPERS ---
  const rgbPlayer1 = hexToRgb(p1Color);
  const rgbPlayer2 = hexToRgb(p2Color);
  const showTimers = !isOnline;
  const state = displayState;
  
  // Якщо ми в онлайні, підключені, але в кімнаті тільки 1 гравець
  const isWaitingForOpponent = isOnline && isConnected && currentRoom && (currentRoom.players?.length || 0) < 2;

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
      {isOnline && !isConnected && (
         <div className="pop-up"><h1 className="heading">Connecting...</h1></div>
      )}

      {isOnline && isWaitingForOpponent && (
         <div className="pop-up">
           <div className="content">
             <h2 style={{color: "white", marginBottom: "20px"}}>Waiting for opponent...</h2>
             <p style={{color: "#ccc"}}>Share this Room ID:</p>
             <h1 
                className="heading" 
                style={{userSelect: "all", cursor: "pointer", fontSize: "3rem", margin: "10px 0"}} 
                onClick={() => {if(currentRoom?.id) navigator.clipboard.writeText(currentRoom.id)}}
             >
               {currentRoom?.id}
             </h1>
             <button className="exit-btn" onClick={handleExit}>Cancel</button>
           </div>
         </div>
      )}

      <div className="top-bar mobile">
        <button onClick={handleExit} className="exit-btn">Exit</button>
        {!isOnline && (
            <button onClick={() => {if(!isGameBlocked) setIsPause((p) => !p)}} className={`pause-btn ${isPause ? "paused" : ""}`}>
                {isPause ? "Resume" : "Pause"}
            </button>
        )}
        <button onClick={handleRestart} className="restart-btn">Restart</button>
      </div>

      <div className="top-bar">
        <div className="left-part">
          <button onClick={handleExit} className="exit-btn">Exit to Menu</button>
        </div>
        <div className="mid-part">
          <div className="player-1-timers">
            {showTimers && (
                <>
                <Timer
                startTime={PLAYER_MAX_GAME_TIME} timerName={"connectFourTimerTime1"} timeToForgotTimer={TIME_TO_FORGOT_GAME}
                pause={state.currentPlayer !== 1 || Boolean(state.winner) || isPause} key={player1TimerKey}
                onComplete={() => dispatch({ type: "SET_WINNER", winner: 2 })}
                />
                <CountdownCircleTimer
                key={circleTimer1Key} isPlaying={state.currentPlayer === 1 && !isPause && !Boolean(state.winner)}
                duration={CIRCLE_TIMER_DURATION} initialRemainingTime={timer1RemainingTime}
                colors={"#d9d9d9"} trailColor={`rgb(${rgbPlayer1})`} size={40} strokeWidth={3}
                onUpdate={(t) => setTimer1RemainingTime(t)} onComplete={() => dispatch({ type: "SET_PLAYER", player: 2 })}
                >{({ remainingTime }) => remainingTime}</CountdownCircleTimer>
                </>
            )}
          </div>
          <div style={{display: "flex", flexDirection: "column", alignItems: "center"}}>
            <h1>
                {!state.showCoinToss && (state.winner !== null
                    ? state.winner === 1 ? `${p1Name} wins` : state.winner === 2 ? `${effectivePlayerTwoName} wins` : "Draw"
                    : state.currentPlayer === 1 ? p1Name : state.currentPlayer === 2 ? effectivePlayerTwoName : "Waiting...")}
            </h1>
            {isOnline && currentRoom && (
                <span style={{fontSize: "0.8rem", color: "#aaa", marginTop: "4px"}}>Room: {currentRoom.id}</span>
            )}
          </div>
          <div className="player-2-timers">
            {showTimers && (
                <>
                <CountdownCircleTimer
                key={circleTimer2Key * -1} isPlaying={state.currentPlayer === 2 && !isPause && !Boolean(state.winner)}
                duration={CIRCLE_TIMER_DURATION} initialRemainingTime={timer2RemainingTime}
                colors={"#d9d9d9"} trailColor={`rgb(${rgbPlayer2})`} size={40} strokeWidth={3}
                onUpdate={(t) => setTimer2RemainingTime(t)} onComplete={() => dispatch({ type: "SET_PLAYER", player: 1 })}
                >{({ remainingTime }) => remainingTime}</CountdownCircleTimer>
                <Timer
                startTime={PLAYER_MAX_GAME_TIME} timerName={"connectFourTimerTime2"} timeToForgotTimer={TIME_TO_FORGOT_GAME}
                pause={state.currentPlayer !== 2 || Boolean(state.winner) || isPause} key={player2TimerKey * -1}
                onComplete={() => dispatch({ type: "SET_WINNER", winner: 1 })}
                />
                </>
            )}
          </div>
        </div>
        <div className="right-part">
          {!isOnline && (
            <button onClick={() => {if(!isGameBlocked)setIsPause((p) => !p)}} className={`pause-btn ${isPause ? "paused" : ""}`}>
                {isPause ? "Resume" : "Pause"}
            </button>
          )}
          <button onClick={handleRestart} className="restart-btn">Restart</button>
        </div>
      </div>

      <div className="field-main">
        <div className="field">
          {state.field.map((row: any, rowIndex: any) => (
            <div className="row" key={rowIndex}>
              {row.map((_:any, colIndex: any) => {
                const lastEmpty = getLastEmptyRow(state.field, colIndex);
                
                // --- HOVER LOGIC ---
                const isMyTurnOnline = isOnline && onlineMe && (
                     (currentRoom?.players?.[0]?.id === onlineMe.id && state.currentPlayer === 1) ||
                     (currentRoom?.players?.[1]?.id === onlineMe.id && state.currentPlayer === 2)
                );
                const canHover = isOnline ? isMyTurnOnline : !(gameMode === "bot" && state.currentPlayer === 2);

                return (
                  <div
                    key={colIndex}
                    className={`cell ${hoveredCell?.col === colIndex && canHover ? "hovered-col" : ""}`}
                    onMouseEnter={() => setHoveredCell({ row: rowIndex, col: colIndex })}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => { if (lastEmpty !== null && !isPause) handleCellClick(colIndex); }}
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
                const isMyTurnOnline = isOnline && onlineMe && (
                     (currentRoom?.players?.[0]?.id === onlineMe.id && state.currentPlayer === 1) ||
                     (currentRoom?.players?.[1]?.id === onlineMe.id && state.currentPlayer === 2)
                );
                const canHover = isOnline ? isMyTurnOnline : !(gameMode === "bot" && state.currentPlayer === 2);
                const isHovered = rowIndex === lastEmpty && hoveredCell?.col === colIndex && canHover;
                const isActive = cell !== 0;
                const isLastChecker = state.lastChecker && state.lastChecker[0] === rowIndex && state.lastChecker[1] === colIndex;
                
                return (
                  <div
                    key={colIndex}
                    className={`cell 
                      ${isHovered ? `hovered-by-player-${state.currentPlayer}` : ""}
                      ${isActive ? `active-by-player-${cell} falling` : ""}
                      ${isLastChecker ? "last-checker" : ""}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {!isOnline && state.showCoinToss && isBoardEmpty(state.field) && (
        <div className="pop-up">
          <div className="pick-first-player">
            <h1 className="heading">
              {state.currentPlayer !== null && (
                <ShowTextAfterTime text={state.currentPlayer === 1 ? p1Name : effectivePlayerTwoName} time={3000} />
              )}
            </h1>
            <div id="coin" className={state.currentPlayer === 1 ? "heads" : state.currentPlayer === 2 ? "tails" : ""}>
              <div className="side-a"></div><div className="side-b"></div>
            </div>
          </div>
        </div>
      )}

      {state.winner !== null && (
        <div className="pop-up" style={{ "--winner-color": state.winner === 1 ? rgbPlayer1 : state.winner === 2 ? rgbPlayer2 : undefined } as React.CSSProperties}>
          <div className="content">
            <h1 className="heading">
              {state.winner === 1 && `${p1Name} wins`}
              {state.winner === 2 && `${effectivePlayerTwoName} wins`}
              {state.winner === 0 && "Draw"}
            </h1>
            <div className="control-buttons">
              <button className="restart-btn" onClick={handleRestart}>{isOnline ? "Wait (N/A)" : "Restart"}</button>
              <button className="leave-btn" onClick={handleExit}>Leave</button>
              <button className="back-btn" onClick={handleExit}>Back to menu</button>
            </div>
            <div className="winner-checker falling" />
          </div>
        </div>
      )}
      {!isOnline && isPause && <div className="pause" onClick={() => {if(!isGameBlocked) setIsPause((p) => !p)}}/>}
    </section>
  );
};