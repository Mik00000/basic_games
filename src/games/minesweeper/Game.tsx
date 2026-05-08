import React, { useReducer, useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStickyStateWithExpiry } from "../../components/common/utils";
import Timer, { TimerHandle } from "../../components/game/Timer";
import clockIcon from "../../assets/icons/clock.svg";
import shovelIcon from "../../assets/icons/shovel.svg";
import bombIcon from "../../assets/icons/bomb.svg";
import flagIcon from "../../assets/icons/flag-1.svg";
import { gameReducer } from "./gameReducer";
import { createInitialGameState, GameState } from "./gameLogic";
import { GameTopBar } from "../../components/game/GameTopBar";

const MIN_ROWS = 3;
const MIN_COLS = 3;
const TimeToForgotGame = 0.5 * 60 * 60 * 1000;

export const Minesweeper: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const settings = React.useMemo(() => location.state || {}, [location.state]);
  const { rows = 4, columns = 4, bombCount = 20 } = settings;
  const gameRows = Math.max(rows, MIN_ROWS);
  const gameCols = Math.max(columns, MIN_COLS);
  const bombNumber = bombCount;
  const timerRef = useRef<TimerHandle>(null);
  const losingAnimStarted = useRef(false);
  const losingTimeouts = useRef<NodeJS.Timeout[]>([]);

  const initialGameState: GameState = React.useMemo(() => createInitialGameState(
    gameRows,
    gameCols,
    bombNumber,
  ), [gameRows, gameCols, bombNumber]);

  const [persistedGameState, setPersistedGameState] =
    useStickyStateWithExpiry<GameState>(
      initialGameState,
      "minesweeperState",
      TimeToForgotGame,
    );

  const [state, dispatch] = useReducer(
    gameReducer,
    persistedGameState || initialGameState,
  );

  const [showPopup, setShowPopup] = useState(false);

  const handleRestart = React.useCallback(() => {
    losingTimeouts.current.forEach(clearTimeout);
    losingTimeouts.current = [];
    dispatch({ type: "RESET_GAME" });
    timerRef.current?.reset();
    setShowPopup(false);
    losingAnimStarted.current = false;
  }, [dispatch, timerRef]);

  useEffect(() => {
    if (Object.keys(settings).length === 0) {
      navigate("/games/minesweeper-menu");
    }
  }, [settings, navigate]);

  useEffect(() => {
    if (state.rows !== gameRows || state.cols !== gameCols || state.bombCount !== bombNumber) {
      // Використовуємо setTimeout, щоб уникнути помилки каскадного рендеру
      const timeout = setTimeout(() => handleRestart(), 0);
      return () => clearTimeout(timeout);
    }
  }, [gameRows, gameCols, bombNumber, handleRestart, state.rows, state.cols, state.bombCount]);

  useEffect(() => {
    setPersistedGameState(state);
  }, [state, setPersistedGameState]);

  useEffect(() => {
    if (state.isPlayerLoose && !losingAnimStarted.current) {
      losingAnimStarted.current = true;
      state.field.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          if (cell.bomb && !cell.revealed) {
            const delay = Math.random() * 2000;
            const timeout = setTimeout(() => {
              dispatch({ type: "REVEAL_BOMB", row: rowIndex, col: colIndex });
            }, delay);
            losingTimeouts.current.push(timeout);
          }
        });
      });
      const popupTimer = setTimeout(() => {
        setShowPopup(true);
      }, 2500);
      losingTimeouts.current.push(popupTimer);
    }
  }, [state.isPlayerLoose, state.field, dispatch]);

  useEffect(() => {
    return () => {
      losingTimeouts.current.forEach(clearTimeout);
    };
  }, []);



  return (
    <div className="minesweeper">
      <GameTopBar
        leftContent={
          <>
            <button
              onClick={() => navigate("/games/minesweeper-menu")}
              className="exit-btn"
            >
              Exit to Menu
            </button>
            <button
              className={`shovel-pick picker ${
                state.pickedTool === "shovel" ? "picked" : ""
              }`}
              onClick={() => dispatch({ type: "SET_PICKED_TOOL", tool: "shovel" })}
            >
              <img src={shovelIcon} alt="shovel" draggable="false" />
            </button>
          </>
        }
        midContent={
          <>
            <div className="time">
              <img src={clockIcon} draggable="false" alt="clock" />
              <Timer
                startTime={0}
                timerName={"minesweeperTimer"}
                isGrowing={true}
                timeToForgotTimer={TimeToForgotGame}
                pause={state.isPlayerLoose || state.isPlayerWin}
                ref={timerRef}
                className="timer"
              />
            </div>
            <div className="flag-count">
              <h1>{state.flagCount}</h1>
              <img src={flagIcon} draggable="false" alt="flag" />
            </div>
          </>
        }
        rightContent={
          <>
            <button
              className={`flag-pick picker ${
                state.pickedTool === "flag" ? "picked" : ""
              }`}
              onClick={() => dispatch({ type: "SET_PICKED_TOOL", tool: "flag" })}
            >
              <img src={flagIcon} alt="flag" draggable="false" />
            </button>
            <button onClick={handleRestart} className="restart-btn">
              Restart
            </button>
          </>
        }
      />

      <div id="field">
        {state.field.map((row, rowIndex) => (
          <div className="row" key={`row-${rowIndex}`}>
            {row.map((cell, cellIndex) => (
              <button
                className={`cell ${
                  cell.revealed
                    ? cell.bomb
                      ? "bomb revealed"
                      : cell.bombsAround
                        ? `bombs-around bombs-around-${cell.bombsAround} revealed`
                        : "revealed"
                    : cell.flag
                      ? "flag"
                      : ""
                }`}
                key={`cell-${rowIndex}-${cellIndex}`}
                onClick={() => {
                  if (state.pickedTool === "shovel" || state.pickedTool === null) {
                    dispatch({
                      type: "CELL_CLICK",
                      row: rowIndex,
                      col: cellIndex,
                    });
                  } else if (state.pickedTool === "flag") {
                    dispatch({
                      type: "CELL_RIGHT_CLICK",
                      row: rowIndex,
                      col: cellIndex,
                    });
                  }
                }}
                onDoubleClick={() =>
                  dispatch({
                    type: "CELL_DOUBLE_CLICK",
                    row: rowIndex,
                    col: cellIndex,
                  })
                }
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (state.pickedTool === null) {
                    dispatch({
                      type: "CELL_RIGHT_CLICK",
                      row: rowIndex,
                      col: cellIndex,
                    });
                  }
                }}
              >
                {cell.revealed ? (
                  cell.bomb ? (
                    <img src={bombIcon} draggable="false" alt="bomb" />
                  ) : (
                    cell.bombsAround || ""
                  )
                ) : cell.flag ? (
                  <img src={flagIcon} draggable="false" alt="bomb" />
                ) : (
                  ""
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      {((state.isPlayerLoose && showPopup) || state.isPlayerWin) && (
        <div className="pop-up loose-or-win">
          <div className="content">
            <h1 className="heading">
              {state.isPlayerLoose ? "You Lose(" : "You Win!"}
            </h1>
            <div className="control-buttons">
              <button onClick={handleRestart} className="restart-btn">
                Restart
              </button>
              <button className="leave-btn" onClick={() => navigate("/games")}>
                Leave
              </button>
              <button
                className="back-btn"
                onClick={() => navigate("/games/minesweeper-menu")}
              >
                Back to menu
              </button>
            </div>
            {state.isPlayerLoose && (
              <div className="bomb-example">
                <div>
                  <img src={bombIcon} draggable="false" alt="bomb" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Minesweeper;
