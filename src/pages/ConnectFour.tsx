import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { hexToRgb, useStickyStateWithExpiry } from "../components/utils.ts";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import Timer from "../components/Timer.tsx";

export const ConnectFour: React.FC = () => {
  {
    {
      const cleanLocalStorage = () => {
        localStorage.removeItem("connectFourField");
        localStorage.removeItem("connectFourCurrentPlayer");
        localStorage.removeItem("connectFourWinner");
        localStorage.removeItem("connectFourLastChecker");
        localStorage.removeItem("connectFourRemainingTimeState");
      };

      const location = useLocation();
      const navigate = useNavigate();

      const {
        gameMode = "local",
        playerOneName = "Player 1",
        playerTwoName = "Player 2",
        playerOneColor = "#FF0000",
        playerTwoColor = "#0000FF",
      } = location.state || {};

      const MAX_COLS = 5;
      const MAX_ROWS = 5;
      const TimeToForgotGame = 3 * 60 * 60 * 1000;
      const [field, setField] = useStickyStateWithExpiry<number[][]>(
        Array.from({ length: MAX_ROWS }, () => Array(MAX_COLS).fill(0)),
        "connectFourField",
        TimeToForgotGame
      );

      const [currentPlayer, setCurrentPlayer] =
        useStickyStateWithExpiry<number>(
          1,
          "connectFourCurrentPlayer",
          TimeToForgotGame
        );

      const [winner, setWinner] = useStickyStateWithExpiry<number | null>(
        null,
        "connectFourWinner",
        TimeToForgotGame
      );

      const [isPause, setIsPause] = useState<boolean>(false);
      const [remainingTimeState, setRemainingTime] =
        useStickyStateWithExpiry<number>(
          22,
          "connectFourRemainingTimeState",
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

      const checkVictory = (
        row: number,
        col: number,
        player: number
      ): boolean => {
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

            if (count >= 4) return true; // Вихід, якщо перемога
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

            if (count >= 4) return true; // Вихід, якщо перемога
          }
        }

        return false;
      };

      const handleClick = (columnIndex: number) => {
        if (winner !== null) return;

        const lastZeroRow = getLastRowInColumn(columnIndex);
        if (lastZeroRow !== null) {
          const newField = field.map((row) => [...row]);
          newField[lastZeroRow][columnIndex] = currentPlayer;
          setLastChecker([lastZeroRow, columnIndex]);
          setField(newField);

          if (checkVictory(lastZeroRow, columnIndex, currentPlayer)) {
            setWinner(currentPlayer);
            cleanLocalStorage();
          } else if (newField.every((row) => row.every((cell) => cell !== 0))) {
            setWinner(0); // Нічия
            cleanLocalStorage();
          } else {
            setCurrentPlayer((prev) => (prev === 1 ? 2 : 1));
          }
        }
      };

      const handleRestart = () => {
        setField(
          Array.from({ length: MAX_ROWS }, () => Array(MAX_COLS).fill(0))
        );
        setLastChecker(null);
        setCurrentPlayer(1);
        setWinner(null);
        cleanLocalStorage();
      };

      // useEffect(() => {
      //   if (remainingTimeState <= 0) {
      //     setWinner(0); // Нічия через закінчення часу
      //     cleanLocalStorage();
      //   } є onComplete
      // }, [remainingTimeState]);
      useEffect(() => {
        if (currentPlayer == 1) {
          setCircleTimer2Key((prev)=>prev+1);
        }else{
          setCircleTimer1Key((prev)=>prev+1);

        }
        if (remainingTimeState !== 22) {
          setRemainingTime(22);
        }
      }, [currentPlayer]);
      console.log(remainingTimeState);

      useEffect(() => {

      }, [remainingTimeState]);

      if (!field) {
        return <div>Loading...</div>; // або інший спосіб обробки
      }

      return (
        <section className="connect-four">
          <div className="top-bar">
            <div className="left-part">
              <button onClick={handleExit} className="exit-btn">
                Exit to Menu
              </button>
            </div>

            <div className="mid-part">
              <CountdownCircleTimer
              key={circleTimer1Key}
                isPlaying={currentPlayer == 1 && !isPause}
                duration={22}
                colors={["#004777", "#F7B801", "#A30000", "#A30000"]}
                colorsTime={[22, 15, 8, 0]}
                size={40}
                strokeWidth={3}
                onUpdate={(remainingTime) => setRemainingTime(remainingTime)}
              >
                {({ remainingTime }) => remainingTime}
              </CountdownCircleTimer>
              <h1>
                {winner
                  ? " "
                  : `Current Player: ${
                      currentPlayer === 1 ? playerOneName : playerTwoName
                    }`}
              </h1>
              <CountdownCircleTimer
                            key={circleTimer2Key}

                isPlaying={currentPlayer == 2 && !isPause}
                duration={22}
                colors={["#004777", "#F7B801", "#A30000", "#A30000"]}
                colorsTime={[22, 15, 8, 0]}
                size={40}
                strokeWidth={3}
                onUpdate={(remainingTime) => setRemainingTime(remainingTime)}
              >
                {({ remainingTime }) => remainingTime}
              </CountdownCircleTimer>
            </div>
            <div className="right-part">
              <button onClick={handleRestart} className="restart-btn">
                Restart
              </button>
            </div>
          </div>

          <div
            className="field-main"
            style={
              {
                "--player-color-1": playerColor1,
                "--player-color-2": playerColor2,
              } as React.CSSProperties
            }
          >
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
                          if (lastZeroRow !== null) handleClick(colIndex);
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
                          rowIndex === lastZeroRow &&
                          hoveredCell?.col === colIndex
                            ? `hovered-by-player-${currentPlayer}`
                            : ""
                        } ${
                          cell !== 0 ? `active-by-player-${cell} falling` : ""
                        } ${
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
        </section>
      );
    }
  }
};
