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

const MIN_ROWS = 3;
const MIN_COLS = 3;
const TimeToForgotGame = 0.5 * 60 * 60 * 1000;

export const Minesweeper: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const settings = location.state || {};
  const { rows = 4, columns = 4, bombCount = 20 } = settings;
  const gameRows = Math.max(rows, MIN_ROWS);
  const gameCols = Math.max(columns, MIN_COLS);
  const bombNumber = bombCount;
  const timerRef = useRef<TimerHandle>(null);

  useEffect(() => {
    if (localStorage.getItem("minesweeperState") === null) handleRestart();
    if (Object.keys(settings).length === 0) navigate("/games/minesweeper-menu");
  }, [settings, navigate]);

  useEffect(() => {
    if (Object.keys(settings).length === 0) navigate("/games/minesweeper-menu");
  }, []);

  const initialGameState: GameState = createInitialGameState(
    gameRows,
    gameCols,
    bombNumber,
  );

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
  const [pickedTool, setPickedTool] = useState<null | "shovel" | "flag">(
    window.innerWidth <= 768 ? "shovel" : null,
  );

  useEffect(() => {
    setPersistedGameState(state);
  }, [state]);

  useEffect(() => {
    if (state.isPlayerLoose) {
      const timeouts: NodeJS.Timeout[] = [];
      state.field.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          if (cell.bomb && !cell.revealed) {
            const delay = Math.random() * 2000;
            const timeout = setTimeout(() => {
              dispatch({ type: "REVEAL_BOMB", row: rowIndex, col: colIndex });
            }, delay);
            timeouts.push(timeout);
          }
        });
      });
      const popupTimer = setTimeout(() => {
        setShowPopup(true);
      }, 2500);
      timeouts.push(popupTimer);
      return () => {
        timeouts.forEach((timeout) => clearTimeout(timeout));
      };
    }
  }, [state.isPlayerLoose]);

  function handleRestart() {
    dispatch({ type: "RESET_GAME" });
    timerRef.current?.reset();
    setShowPopup(false);
    setPickedTool(null);
  }

  return (
    <div className="minesweeper">
      <div className="top-bar top-bar-1">
        <div className="left-part">
          <button
            onClick={() => navigate("/games/minesweeper-menu")}
            className="exit-btn"
          >
            Exit to Menu
          </button>
        </div>
        <div className="mid-part"></div>
        <div className="right-part">
          <button onClick={handleRestart} className="restart-btn">
            Restart
          </button>
        </div>
      </div>

      <div className="top-bar">
        <div className="left-part">
          <button
            onClick={() => navigate("/games/minesweeper-menu")}
            className="exit-btn"
          >
            Exit to Menu
          </button>
          <button
            className={`shovel-pick picker ${
              pickedTool === "shovel" ? "picked" : ""
            }`}
            onClick={() => setPickedTool("shovel")}
          >
            <img src={shovelIcon} alt="shovel" draggable="false" />
          </button>
        </div>

        <div className="mid-part">
          <div className="time">
            <img src={clockIcon} draggable="false" alt="clock" />
            <Timer
              startTime={0}
              timerName={"minesweeperTimer"}
              isGrowing={true}
              timeToForgotTimer={TimeToForgotGame}
              pause={state.isPlayerLoose}
              ref={timerRef}
              className="timer"
            />
          </div>
          <div className="flag-count">
            <h1>{state.flagCount}</h1>
            <img src={flagIcon} draggable="false" alt="flag" />
          </div>
        </div>

        <div className="right-part">
          <button
            className={`flag-pick picker ${
              pickedTool === "flag" ? "picked" : ""
            }`}
            onClick={() => setPickedTool("flag")}
          >
            <img src={flagIcon} alt="flag" draggable="false" />
          </button>
          <button onClick={handleRestart} className="restart-btn">
            Restart
          </button>
        </div>
      </div>

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
                  if (pickedTool === "shovel" || pickedTool === null) {
                    dispatch({
                      type: "CELL_CLICK",
                      row: rowIndex,
                      col: cellIndex,
                    });
                  } else if (pickedTool === "flag") {
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
                  if (pickedTool === null) {
                    e.preventDefault();
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
