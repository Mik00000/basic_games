import React, { useReducer, useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  generateRandomGameId,
  generateRandomNumber,
  hexToRgb,
  useOnlineGame,
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
} from "./gameLogic";
import { initialGameState } from "./gameLogic";
import { gameReducer } from "./gameReducer";
import { botMove } from "./botBrains";

export const ConnectFour: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { onlineGameId, shareInfo } = useParams();

  // Параметри гри передаються через state роутера
  const {
    gameMode = "local",
    playerOneName = "Player 1",
    playerTwoName = "Player 2",
    playerOneColor = "#FF0000",
    playerTwoColor = "#0000FF",
    difficulty = 0,
  } = (location.state || {}) as {
    gameMode?: string;
    playerOneName?: string;
    playerTwoName?: string;
    playerOneColor?: string;
    playerTwoColor?: string;
    difficulty?: number;
  };

  const effectivePlayerTwoName = gameMode === "bot" ? "Bot" : playerTwoName;

  // Використовуємо онлайн-хук лише для online режиму
  const {
    gameState: remoteGameState,
    createRoom,
    joinRoom,
    leaveRoom,
    updateGame,
    getRoomInfo,
    deleteRoom,
    error,
  } = useOnlineGame({
    gameType: "connect4",
    gameId: onlineGameId as string,
    maxPlayers: 2,
    enabled: gameMode === "online",
  });

  // Перевірка існування кімнати та приєднання/створення
  useEffect(() => {
    if (gameMode !== "online") return;

    const checkRoom = async () => {
      try {
        const exists = await getRoomInfo((info) => {return info.exists})
        // Якщо параметри share/host передані, відповідно створюємо або приєднуємося
        getRoomInfo((info) => {
          if (shareInfo === "share") {
            if (!info.exists) navigate("/games/connect4-menu");
            else joinRoom();
          } else if (shareInfo === "host") {
            if (!info.exists) createRoom();
            joinRoom();
          } else {
            navigate("/games/connect4-menu");
          }
        });
      } catch (err) {
        console.error("Error checking online game:", err);
        navigate("/games/connect4-menu");
      }
    };

    checkRoom();
  }, [gameMode, onlineGameId, shareInfo, getRoomInfo, joinRoom, createRoom, navigate]);

  // Локальний стан гри, синхронізований із online режимом
  const [stickyGameState, setStickyGameState] = useStickyStateWithExpiry(
    initialGameState,
    "connectFourGameState",
    TIME_TO_FORGOT_GAME
  );
  const [state, dispatch] = useReducer(gameReducer, stickyGameState);

  // Синхронізація локального стану з persistent сховищем і сервером
  useEffect(() => {
    setStickyGameState(state);
    if (gameMode === "online") {
      updateGame(state);
    }
  }, [state, setStickyGameState, gameMode, updateGame]);

  // Отримання оновлень від серверу: якщо отримано remoteGameState – застосовуємо його
  useEffect(() => {
    if (gameMode === "online" && remoteGameState) {
      dispatch({ type: "SET_STATE", newState: remoteGameState });
    }
  }, [remoteGameState, gameMode]);

  // При розмонтуванні компонента виходимо з кімнати (тільки online)
  useEffect(() => {
    return () => {
      if (gameMode === "online") leaveRoom();
    };
  }, [gameMode, leaveRoom]);

  // Локальні стани UI
  const [isPause, setIsPause] = useState<boolean>(false);
  const [isGameBlocked, setIsGameBlocked] = useState<boolean>(false);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const [player1TimerKey, setPlayer1TimerKey] = useState(0);
  const [player2TimerKey, setPlayer2TimerKey] = useState(0);
  const [circleTimer1Key, setCircleTimer1Key] = useState(1);
  const [circleTimer2Key, setCircleTimer2Key] = useState(1);

  const [timer1RemainingTime, setTimer1RemainingTime] = useStickyStateWithExpiry<number>(
    CIRCLE_TIMER_DURATION,
    "circleTimer1RemainingTime",
    TIME_TO_FORGOT_GAME
  );
  const [timer2RemainingTime, setTimer2RemainingTime] = useStickyStateWithExpiry<number>(
    CIRCLE_TIMER_DURATION,
    "circleTimer2RemainingTime",
    TIME_TO_FORGOT_GAME
  );

  // Функція для очищення локального сховища
  const cleanLocalStorage = useCallback(() => {
    const keys = [
      "connectFourGameState",
      "circleTimer1RemainingTime",
      "circleTimer2RemainingTime",
      "connectFourTimerTime1",
      "connectFourTimerTime2",
    ];
    keys.forEach((key) => localStorage.removeItem(key));
    setPlayer1TimerKey((prev) => prev + 1);
    setPlayer2TimerKey((prev) => prev + 1);
    setCircleTimer1Key((prev) => prev + 1);
    setCircleTimer2Key((prev) => prev + 1);
    setTimer1RemainingTime(CIRCLE_TIMER_DURATION);
    setTimer2RemainingTime(CIRCLE_TIMER_DURATION);
  }, [setTimer1RemainingTime, setTimer2RemainingTime]);

  const handleExit = () => {
    cleanLocalStorage();
    navigate("/games/connect4-menu");
  };

  const handleRestart = () => {
    dispatch({ type: "RESET" });
    cleanLocalStorage();
  };

  // Запуск coin toss при новій грі, якщо поле порожнє
  useEffect(() => {
    if (state.isNewGame && state.showCoinToss && isBoardEmpty(state.field)) {
      setIsPause(true);
      setIsGameBlocked(true);
      const flipResult = Math.random();
      setTimeout(() => {
        dispatch({ type: "SET_PLAYER", player: flipResult <= 0.5 ? 1 : 2 });
        setTimeout(() => {
          dispatch({ type: "HIDE_COIN_TOSS" });
          setIsGameBlocked(false);
          setIsPause(false);
        }, 5000);
      }, 100);
    }
  }, [state.isNewGame, state.showCoinToss, state.field]);

  // Скидання таймерів при зміні гравця
  useEffect(() => {
    if (state.currentPlayer === 1) {
      setCircleTimer2Key((prev) => prev + 1);
      if (timer2RemainingTime !== CIRCLE_TIMER_DURATION)
        setTimer2RemainingTime(CIRCLE_TIMER_DURATION);
    } else if (state.currentPlayer === 2) {
      setCircleTimer1Key((prev) => prev + 1);
      if (timer1RemainingTime !== CIRCLE_TIMER_DURATION)
        setTimer1RemainingTime(CIRCLE_TIMER_DURATION);
    }
  }, [state.currentPlayer, timer1RemainingTime, timer2RemainingTime, setTimer1RemainingTime, setTimer2RemainingTime]);

  // Хід бота, якщо режим bot і зараз його хід
  useEffect(() => {
    if (gameMode === "bot" && state.currentPlayer === 2 && !state.winner && !isPause) {
      botMove(state, dispatch, difficulty);
    }
  }, [gameMode, state.currentPlayer, state.winner, isPause, state.field, difficulty]);

  // Обробка кліку по колонці
  const handleCellClick = (columnIndex: number) => {
    if (state.winner !== null || isPause || (gameMode === "bot" && state.currentPlayer === 2)) return;
    if (getLastEmptyRow(state.field, columnIndex) !== null) {
      dispatch({ type: "DROP_CHECKER", column: columnIndex });
    }
  };

  const rgbPlayer1 = hexToRgb(playerOneColor);
  const rgbPlayer2 = hexToRgb(playerTwoColor);

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
      {/* Верхня панель для мобільних */}
      <div className="top-bar mobile">
        <button onClick={handleExit} className="exit-btn">
          Exit to Menu
        </button>
        <button
          onClick={() => {
            if (!isGameBlocked) setIsPause((prev) => !prev);
          }}
          className={`pause-btn ${isPause ? "paused" : ""}`}
        >
          {isPause ? "Resume" : "Pause"}
        </button>
        <button onClick={handleRestart} className="restart-btn">
          Restart
        </button>
      </div>

      {/* Верхня панель для десктопа */}
      <div className="top-bar">
        <div className="left-part">
          <button onClick={handleExit} className="exit-btn">
            Exit to Menu
          </button>
        </div>
        <div className="mid-part">
          <div className="player-1-timers">
            <Timer
              startTime={PLAYER_MAX_GAME_TIME}
              timerName={"connectFourTimerTime1"}
              timeToForgotTimer={TIME_TO_FORGOT_GAME}
              pause={state.currentPlayer !== 1 || Boolean(state.winner) || isPause}
              key={player1TimerKey}
              onComplete={() => dispatch({ type: "SET_WINNER", winner: 2 })}
            />
            <CountdownCircleTimer
              key={circleTimer1Key}
              isPlaying={state.currentPlayer === 1 && !isPause && !Boolean(state.winner)}
              duration={CIRCLE_TIMER_DURATION}
              initialRemainingTime={timer1RemainingTime}
              colors={"#d9d9d9"}
              trailColor={`rgb(${rgbPlayer1})`}
              size={40}
              strokeWidth={3}
              onUpdate={(remainingTime) => setTimer1RemainingTime(remainingTime)}
              onComplete={() => dispatch({ type: "SET_PLAYER", player: 2 })}
            >
              {({ remainingTime }) => remainingTime}
            </CountdownCircleTimer>
          </div>
          <h1>
            {!state.showCoinToss &&
              (state.winner
                ? state.winner === 1
                  ? `${playerOneName} wins`
                  : state.winner === 2
                  ? `${effectivePlayerTwoName} wins`
                  : "Draw"
                : state.currentPlayer === 1
                ? playerOneName
                : state.currentPlayer === 2
                ? effectivePlayerTwoName
                : "")}
          </h1>
          <div className="player-2-timers">
            <CountdownCircleTimer
              key={circleTimer2Key * -1}
              isPlaying={state.currentPlayer === 2 && !isPause && !Boolean(state.winner)}
              duration={CIRCLE_TIMER_DURATION}
              initialRemainingTime={timer2RemainingTime}
              colors={"#d9d9d9"}
              trailColor={`rgb(${rgbPlayer2})`}
              size={40}
              strokeWidth={3}
              onUpdate={(remainingTime) => setTimer2RemainingTime(remainingTime)}
              onComplete={() => dispatch({ type: "SET_PLAYER", player: 1 })}
            >
              {({ remainingTime }) => remainingTime}
            </CountdownCircleTimer>
            <Timer
              startTime={PLAYER_MAX_GAME_TIME}
              timerName={"connectFourTimerTime2"}
              timeToForgotTimer={TIME_TO_FORGOT_GAME}
              pause={state.currentPlayer !== 2 || Boolean(state.winner) || isPause}
              key={player2TimerKey * -1}
              onComplete={() => dispatch({ type: "SET_WINNER", winner: 1 })}
            />
          </div>
        </div>
        <div className="right-part">
          <button
            onClick={() => {
              if (!isGameBlocked) setIsPause((prev) => !prev);
            }}
            className={`pause-btn ${isPause ? "paused" : ""}`}
          >
            {isPause ? "Resume" : "Pause"}
          </button>
          <button onClick={handleRestart} className="restart-btn">
            Restart
          </button>
        </div>
      </div>

      {/* Поле гри */}
      <div className="field-main">
        <div className="field">
          {state.field.map((row, rowIndex) => (
            <div className="row" key={rowIndex}>
              {row.map((_, colIndex) => {
                const lastEmpty = getLastEmptyRow(state.field, colIndex);
                return (
                  <div
                    key={colIndex}
                    className={`cell ${
                      hoveredCell?.col === colIndex &&
                      !(gameMode === "bot" && state.currentPlayer === 2)
                        ? "hovered-col"
                        : ""
                    }`}
                    onMouseEnter={() => setHoveredCell({ row: rowIndex, col: colIndex })}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => {
                      if (lastEmpty !== null && !isPause) handleCellClick(colIndex);
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="field-with-checkers">
          {state.field.map((row, rowIndex) => (
            <div className="row" key={rowIndex}>
              {row.map((cell, colIndex) => {
                const lastEmpty = getLastEmptyRow(state.field, colIndex);
                const isHovered =
                  rowIndex === lastEmpty &&
                  hoveredCell?.col === colIndex &&
                  !(gameMode === "bot" && state.currentPlayer === 2);
                const isActive = cell !== 0;
                const isLastChecker =
                  state.lastChecker &&
                  state.lastChecker[0] === rowIndex &&
                  state.lastChecker[1] === colIndex;
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

      {/* Pop-up для coin toss */}
      {state.showCoinToss && isBoardEmpty(state.field) && (
        <div className="pop-up">
          <div className="pick-first-player">
            <h1 className="heading">
              {state.currentPlayer !== null && (
                <ShowTextAfterTime
                  text={state.currentPlayer === 1 ? playerOneName : effectivePlayerTwoName}
                  time={3000}
                />
              )}
            </h1>
            <div id="coin" className={state.currentPlayer === 1 ? "heads" : state.currentPlayer === 2 ? "tails" : ""}>
              <div className="side-a"></div>
              <div className="side-b"></div>
            </div>
          </div>
        </div>
      )}

      {/* Pop-up з результатом гри */}
      {state.winner !== null && (
        <div
          className="pop-up"
          style={
            {
              "--winner-color": state.winner === 1 ? rgbPlayer1 : state.winner === 2 ? rgbPlayer2 : undefined,
            } as React.CSSProperties
          }
        >
          <div className="content">
            <h1 className="heading">
              {state.winner === 1 && `${playerOneName} wins`}
              {state.winner === 2 && `${effectivePlayerTwoName} wins`}
              {state.winner === 0 && "Draw"}
            </h1>
            <div className="control-buttons">
              <button className="restart-btn" onClick={handleRestart}>
                Restart
              </button>
              <button
                className="leave-btn"
                onClick={() => {
                  cleanLocalStorage();
                  navigate("/games");
                }}
              >
                Leave
              </button>
              <button
                className="back-btn"
                onClick={() => {
                  cleanLocalStorage();
                  navigate("/games/connect4-menu");
                }}
              >
                Back to menu
              </button>
            </div>
            <div className="winner-checker falling" />
          </div>
        </div>
      )}

      {/* Фоновий шар для паузи */}
      {isPause && (
        <div
          className="pause"
          onClick={() => {
            if (!isGameBlocked) setIsPause((prev) => !prev);
          }}
        />
      )}
    </section>
  );
};

export default ConnectFour;
