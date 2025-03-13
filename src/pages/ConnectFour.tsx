import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { hexToRgb, useStickyStateWithExpiry } from "../components/utils.ts";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import Timer from "../components/Timer.tsx";
import ShowTextAfterTime from "../components/ShowTextAfterTime.tsx";

export const ConnectFour: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    gameMode = "local",
    playerOneName = "Player 1",
    playerTwoName = "Player 2",
    playerOneColor = "#FF0000",
    playerTwoColor = "#0000FF",
  } = location.state || {};

  const MAX_COLS = 7;
  const MAX_ROWS = 7;
  const TimeToForgotGame = 0.5 * 60 * 60 * 1000;

  const [field, setField] = useStickyStateWithExpiry<number[][]>(
    Array.from({ length: MAX_ROWS }, () => Array(MAX_COLS).fill(0)),
    "connectFourField",
    TimeToForgotGame
  );

  const fieldIsEmpty = field.every((row) => row.every((cell) => cell === 0));

  const [currentPlayer, setCurrentPlayer] = useStickyStateWithExpiry<
    number | null
  >(null, "connectFourCurrentPlayer", TimeToForgotGame);
  const [winner, setWinner] = useStickyStateWithExpiry<number | null>(
    null,
    "connectFourWinner",
    TimeToForgotGame
  );

  const [isPause, setIsPause] = useState<boolean>(true);
  const [playerMaxGameTime] = useState<number>(4 * 60 * 1000);

  const [player1TimerKey, setIsPlayer1TimerKey] = useState(0);
  const [player2TimerKey, setIsPlayer2TimerKey] = useState(0);

  const [timer1RemainingTime, setTimer1RemainingTime] =
    useStickyStateWithExpiry<number>(
      22,
      "circleTimer1RemainingTime",
      TimeToForgotGame
    );
  const [timer2RemainingTime, setTimer2RemainingTime] =
    useStickyStateWithExpiry<number>(
      22,
      "circleTimer2RemainingTime",
      TimeToForgotGame
    );

  const [hoveredCell, setHoveredCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [lastChecker, setLastChecker] = useStickyStateWithExpiry<
    number[] | null
  >(null, "connectFourLastChecker", TimeToForgotGame);

  const playerColor1 = hexToRgb(playerOneColor);
  const playerColor2 = hexToRgb(playerTwoColor);
  const [circleTimer1Key, setCircleTimer1Key] = useState(1);
  const [circleTimer2Key, setCircleTimer2Key] = useState(1);

  const [showCoinToss, setShowCoinToss] = useState(true);
  useEffect(() => {
    if (showCoinToss) setIsPause(true);
  }, [showCoinToss, isPause]);
  const [isNewGame, setIsNewGame] = useState<boolean>(currentPlayer === null);

  const cleanLocalStorage = () => {
    localStorage.removeItem("connectFourField");
    localStorage.removeItem("connectFourCurrentPlayer");
    localStorage.removeItem("connectFourWinner");
    localStorage.removeItem("connectFourLastChecker");
    localStorage.removeItem("connectFourRemainingTimeState");
    localStorage.removeItem("circleTimer1RemainingTime");
    localStorage.removeItem("circleTimer2RemainingTime");
    setIsPlayer1TimerKey((prev) => prev + 1);
    setIsPlayer2TimerKey((prev) => prev + 1);
    setCircleTimer1Key((prev) => prev + 1);
    setCircleTimer2Key((prev) => prev + 1);
    setTimer1RemainingTime(22);
    setTimer2RemainingTime(22);
    localStorage.removeItem("connectFourTimerTime1");
    localStorage.removeItem("connectFourTimerTime2");
  };

  const handleExit = () => {
    cleanLocalStorage();
    navigate("/games/connect4-menu");
  };

  const getLastRowInColumn = (colIndex: number): number | null => {
    for (let rowIndex = MAX_ROWS - 1; rowIndex >= 0; rowIndex--) {
      if (field[rowIndex][colIndex] === 0) {
        return rowIndex;
      }
    }
    return null;
  };

  const checkVictory = (row: number, col: number, player: number): boolean => {
    const directions = [
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: -1 },
    ];

    for (const { row: dRow, col: dCol } of directions) {
      let count = 1;
      for (let i = 1; i < 4; i++) {
        const newRow = row + i * dRow;
        const newCol = col + i * dCol;
        if (
          newRow >= 0 &&
          newRow < MAX_ROWS &&
          newCol >= 0 &&
          newCol < MAX_COLS &&
          field[newRow][newCol] === player
        ) {
          count++;
        } else {
          break;
        }
        if (count >= 4) return true;
      }
      for (let i = 1; i < 4; i++) {
        const newRow = row - i * dRow;
        const newCol = col - i * dCol;
        if (
          newRow >= 0 &&
          newRow < MAX_ROWS &&
          newCol >= 0 &&
          newCol < MAX_COLS &&
          field[newRow][newCol] === player
        ) {
          count++;
        } else {
          break;
        }
        if (count >= 4) return true;
      }
    }
    return false;
  };

  const handleClick = (columnIndex: number) => {
    if (winner !== null) return;

    const lastZeroRow = getLastRowInColumn(columnIndex);
    if (lastZeroRow !== null) {
      const newField = field.map((row) => [...row]);
      newField[lastZeroRow][columnIndex] = currentPlayer!;
      setLastChecker([lastZeroRow, columnIndex]);

      setField(newField);

      if (checkVictory(lastZeroRow, columnIndex, currentPlayer!)) {
        setWinner(currentPlayer);
        cleanLocalStorage();
      } else if (newField.every((row) => row.every((cell) => cell !== 0))) {
        setWinner(0);
        cleanLocalStorage();
      } else {
        setCurrentPlayer((prev) => (prev === 1 ? 2 : 1));
      }
    }
  };

  const handleRestart = () => {
    setField(Array.from({ length: MAX_ROWS }, () => Array(MAX_COLS).fill(0)));
    setLastChecker(null);
    setCurrentPlayer(null);
    setWinner(null);
    setShowCoinToss(true);
    setIsNewGame(true);
    cleanLocalStorage();
  };

  useEffect(() => {
    if (currentPlayer === 1) {
      setCircleTimer2Key((prev) => prev + 1);
      if (timer2RemainingTime !== 22) setTimer2RemainingTime(22);
    } else if (currentPlayer === 2) {
      setCircleTimer1Key((prev) => prev + 1);
      if (timer1RemainingTime !== 22) setTimer1RemainingTime(22);
    }
  }, [currentPlayer, timer1RemainingTime, timer2RemainingTime]);

  useEffect(() => {
    if (fieldIsEmpty && currentPlayer === null && showCoinToss && isNewGame) {
      flipCoin();
    } else if (currentPlayer !== null && !isNewGame && showCoinToss) {
      setShowCoinToss(false);
    }
  }, [fieldIsEmpty, currentPlayer, showCoinToss, isNewGame]);

  function flipCoin() {
    const flipResult = Math.random();
    setTimeout(() => {
      if (flipResult <= 0.5) {
        setCurrentPlayer(1);
      } else {
        setCurrentPlayer(2);
      }
      if (isNewGame) {
        setTimeout(() => {
          setShowCoinToss(false);
          setIsNewGame(false);
        }, 5000);
      }
    }, 100);
  }

  if (!field) {
    return <div>Loading...</div>;
  }

  return (
    <section
      className="connect-four"
      style={
        {
          "--player-color-1": playerColor1,
          "--player-color-2": playerColor2,
          "--row-length": MAX_ROWS,

        } as React.CSSProperties
      }
    >
            <div className="top-bar mobile">

          <button onClick={handleExit} className="exit-btn">
            Exit to Menu
          </button>


          <button
            onClick={() => setIsPause((prev) => !prev)}
            className={`pause-btn ${isPause && "paused"}`}

          >
            {isPause ? "Resume" : "Pause"}
          </button>
          <button onClick={handleRestart} className="restart-btn">
            Restart
          </button>

      </div>
      <div className="top-bar">
        <div className="left-part">
          <button onClick={handleExit} className="exit-btn">
            Exit to Menu
          </button>
        </div>

        <div className="mid-part">
          <div className="player-1-timers">
            <Timer
              startTime={playerMaxGameTime}
              timerName={"connectFourTimerTime1"}
              timeToForgotTimer={TimeToForgotGame}
              pause={!(currentPlayer === 1) || Boolean(winner) || isPause}
              key={player1TimerKey}
              onComplete={() => {
                setWinner(2);
              }}
            />
            <CountdownCircleTimer
              key={circleTimer1Key}
              isPlaying={currentPlayer === 1 && !isPause && !Boolean(winner)}
              duration={22}
              initialRemainingTime={timer1RemainingTime}
              colors={"#d9d9d9"}
              trailColor={`rgb(${playerColor1})`}
              size={40}
              strokeWidth={3}
              onUpdate={(remainingTime) =>
                setTimer1RemainingTime(remainingTime)
              }
              onComplete={() => {
                setCurrentPlayer((prev) => (prev === 1 ? 2 : 1));
              }}
            >
              {({ remainingTime }) => remainingTime}
            </CountdownCircleTimer>
          </div>
          <h1>
            {!showCoinToss &&(winner
              ? winner === 1
                ? playerOneName
                : winner === 2
                ? playerTwoName
                : "Draw"
              : currentPlayer !== null
              ? currentPlayer === 1
                ? playerOneName
                : playerTwoName
              : "")}
          </h1>
          <div className="player-2-timers">
            <CountdownCircleTimer
              key={circleTimer2Key * -1}
              isPlaying={currentPlayer === 2 && !isPause && !Boolean(winner)}
              duration={22}
              initialRemainingTime={timer2RemainingTime}
              colors={"#d9d9d9"}
              trailColor={`rgb(${playerColor2})`}
              size={40}
              strokeWidth={3}
              onUpdate={(remainingTime) =>
                setTimer2RemainingTime(remainingTime)
              }
              onComplete={() => {
                setCurrentPlayer((prev) => (prev === 1 ? 2 : 1));
              }}
            >
              {({ remainingTime }) => remainingTime}
            </CountdownCircleTimer>
            <Timer
              startTime={playerMaxGameTime}
              timerName={"connectFourTimerTime2"}
              timeToForgotTimer={TimeToForgotGame}
              pause={!(currentPlayer === 2) || Boolean(winner) || isPause}
              key={player2TimerKey * -1}
              onComplete={() => {
                setWinner(1);
              }}
            />
          </div>
        </div>
        <div className="right-part">
          <button
            onClick={() => setIsPause((prev) => !prev)}
            className={`pause-btn ${isPause && "paused"}`}

          >
            {isPause ? "Resume" : "Pause"}
          </button>
          <button onClick={handleRestart} className="restart-btn">
            Restart
          </button>
        </div>
      </div>

      <div className="field-main">
        <div className="field">
          {field.map((row, rowIndex) => (
            <div className="row" key={rowIndex}>
              {row.map((_, colIndex) => {
                const lastZeroRow = getLastRowInColumn(colIndex);
                return (
                  <div
                    className={`cell ${
                      hoveredCell?.col === colIndex ? "hovered-col" : ""
                    }`}
                    key={colIndex}
                    onMouseEnter={() =>
                      setHoveredCell({ row: rowIndex, col: colIndex })
                    }
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => {
                      if (lastZeroRow !== null && !isPause)
                        handleClick(colIndex);
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="field-with-checkers">
          {field.map((row, rowIndex) => (
            <div className="row" key={rowIndex}>
              {row.map((cell, colIndex) => {
                const lastZeroRow = getLastRowInColumn(colIndex);
                return (
                  <div
                    className={`cell ${
                      rowIndex === lastZeroRow && hoveredCell?.col === colIndex
                        ? `hovered-by-player-${currentPlayer}`
                        : ""
                    } ${cell !== 0 ? `active-by-player-${cell} falling` : ""} ${
                      lastChecker != null &&
                      lastChecker[0] === rowIndex &&
                      lastChecker[1] === colIndex
                        ? "last-checker"
                        : ""
                    }`}
                    key={colIndex}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {showCoinToss && fieldIsEmpty && (
        <div className="pop-up">
          <div className="pick-first-player">
            <h1 className="heading">
              {currentPlayer !== null && (
                <ShowTextAfterTime
                  text={currentPlayer === 1 ? playerOneName : playerTwoName}
                  time={3000} // Анімація триває 5 секунд
                />
              )}
            </h1>
            <div
              id="coin"
              className={
                currentPlayer === 1
                  ? "heads"
                  : currentPlayer === 2
                  ? "tails"
                  : ""
              }
            >
              <div className="side-a"></div>
              <div className="side-b"></div>
            </div>
          </div>
        </div>
      )}

      {winner !== null && (
        <div
          className="pop-up"
          style={
            {
              "--winner-color":
                winner === 1
                  ? playerColor1
                  : winner === 2
                  ? playerColor2
                  : undefined,
            } as React.CSSProperties
          }
        >
          <div className="content">
            <h1 className="heading">
              {winner === 1 && `${playerOneName} wins`}
              {winner === 2 && `${playerTwoName} wins`}
              {winner === 0 && "Draw"}
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
      {isPause && <div className="pause"/>}
    </section>
  );
};
