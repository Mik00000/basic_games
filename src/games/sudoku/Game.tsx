import { useReducer, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { gameReducer } from "./gameReducer";
import { initialGameState } from "./gameLogic";
import Timer from "../../components/game/Timer";
import {
  ExitButton,
  PauseButton,
  RestartButton,
} from "../../components/game/GameControls";
import { PauseOverlay } from "../../components/game/PauseOverlay";
import { GameTopBar } from "../../components/game/GameTopBar";

const Sudoku = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [isNotesActive, setIsNotesActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (location.state && location.state.difficulty) {
      dispatch({ type: "START_GAME", difficulty: location.state.difficulty });
    }
  }, [location.state]);

  const handleExit = () => {
    navigate("/");
  };

  const handlePauseToggle = () => {
    setIsPaused((prev) => !prev);
  };

  const handleRestart = () => {
    dispatch({ type: "RESET" });
    setIsPaused(false);
  };

  const getPauseButtonText = () => (isPaused ? "Resume" : "Pause");
  const getRestartButtonText = () => "Restart";

  function handleCellClick(rowIndex: number, colIndex: number) {
    dispatch({ type: "SELECT_CELL", move: { row: rowIndex, col: colIndex } });

    //dispatch({ type: 'MAKE_MOVE', move: { row: rowIndex, col: colIndex } });
  }
  const isCellHighlighted = (
    rowIndex: number,
    colIndex: number,
  ): "highlighted" | "selected" | "same-number" | "" => {
    if (!state.selectedCell) return "";
    const { row: selRow, col: selCol } = state.selectedCell;

    if (
      state.selectedCell.row === rowIndex &&
      state.selectedCell.col === colIndex
    )
      return "selected";

    if (selRow === rowIndex && selCol === colIndex) return "highlighted";

    if (selRow === rowIndex || selCol === colIndex) return "highlighted";

    const startRow = Math.floor(selRow / 3) * 3;
    const startCol = Math.floor(selCol / 3) * 3;

    if (
      rowIndex >= startRow &&
      rowIndex < startRow + 3 &&
      colIndex >= startCol &&
      colIndex < startCol + 3
    )
      return "highlighted";

    // Якщо вибрана клітинка не порожня і її значення збігається з поточною
    if (
      state.userField[selRow][selCol].value !== 0 &&
      state.userField[selRow][selCol].value ===
        state.userField[rowIndex][colIndex].value
    )
      return "same-number";

    return "";
  };

  const getHintCellClass = (rowIndex: number, colIndex: number): string => {
    if (!state.hint) return "";
    const highlight = state.hint.highlightCells.find(
      (h) => h.row === rowIndex && h.col === colIndex,
    );
    if (!highlight) return "";
    return `hint-${highlight.type}`; // 'hint-target', 'hint-related', 'hint-secondary'
  };



  const isGameOver =
    state.mistakesCount >= 3 ||
    state.userField.every((row) =>
      row.every((cell) => cell.value !== 0 && !cell.isError),
    );

  return (
    <section className="sudoku">
      <GameTopBar
        leftContent={<ExitButton onClick={handleExit} />}
        midContent={
          <>
            <h1 className="game-name">Sudoku</h1>
            <h3 className="errors">Errors: {state.mistakesCount}/3</h3>
            <div className="timer-container">
              <Timer
                startTime={0}
                timerName={`sudoku_timer_${state.gameId}`}
                isGrowing={true}
                pause={isGameOver || isPaused}
              />
            </div>
          </>
        }
        rightContent={
          <>
            <PauseButton
              onClick={handlePauseToggle}
              isPaused={isPaused}
              text={getPauseButtonText()}
            />
            <RestartButton onClick={handleRestart} text={getRestartButtonText()} />
          </>
        }
      />
      <div className="game">
      <div className={`board ${state.hint ? "hint-active" : ""} ${isPaused ? "paused" : ""}`}>
        <PauseOverlay
          isOnline={false}
          isPaused={isPaused}
          onResume={handlePauseToggle}
        />
        {state.userField.map((row, rowIndex) => (
          <div key={rowIndex} className="row">
            {row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                // Виділяємо помилкові або початкові клітинки через відповідні класи
                className={`cell ${isCellHighlighted(rowIndex, colIndex)} ${getHintCellClass(rowIndex, colIndex)} ${cell.isError ? "error" : ""} ${cell.isInitial ? "initial" : ""}`}
                onClick={() => handleCellClick(rowIndex, colIndex)}
              >
                {cell.value === 0 ? (
                  <div className="notes-grid">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <span key={num} className="note-number">
                        {cell.notes.has(num) ? num : ""}
                      </span>
                    ))}
                  </div>
                ) : (
                  cell.value
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="controls">
        <div className="action-buttons">
          <button
            className="action-btn"
            title="Undo"
            onClick={() => dispatch({ type: "UNDO_MOVE" })}
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
            {/* <span className="label">Back</span> */}
          </button>
          <button
            className="action-btn"
            title="Erase"
            onClick={() =>
              state.selectedCell &&
              dispatch({
                type: "ERASE_CELL",
                move: {
                  row: state.selectedCell.row,
                  col: state.selectedCell.col,
                },
              })
            }
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
                <path d="M20 5H9l-7 7 7 7h11a2 2 0 002-2V7a2 2 0 00-2-2z" />
                <line x1="18" y1="9" x2="12" y2="15" />
                <line x1="12" y1="9" x2="18" y2="15" />
              </svg>
            </span>
            {/* <span className="label">Erase</span> */}
          </button>
          <button
            className={`action-btn ${isNotesActive ? "active" : ""}`}
            title="Notes"
            onClick={() => setIsNotesActive((prev) => !prev)}
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
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </span>
            {/* <span className="label">Notes</span> */}
          </button>
          <button
            className={`action-btn ${state.hint ? "active" : ""}`}
            title="Hint"
            onClick={() => dispatch({ type: "SHOW_HINT" })}
            
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
                <path d="M9 18h6" />
                <path d="M10 22h4" />
                <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0012 4a4.65 4.65 0 00-4.5 7.5c.76.76 1.23 1.52 1.41 2.5" />
              </svg>
            </span>
            {/* <span className="label">Hint</span> */}
          </button>
        </div>

        <div className="numpad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              className="num-btn"
              onClick={() =>
                state.selectedCell &&
                (isNotesActive
                  ? dispatch({
                      type: "MAKE_NOTE",
                      move: {
                        row: state.selectedCell.row,
                        col: state.selectedCell.col,
                        value: num,
                      },
                    })
                  : dispatch({
                      type: "MAKE_MOVE",
                      move: {
                        row: state.selectedCell.row,
                        col: state.selectedCell.col,
                        value: num,
                      },
                    }))
              }
            >
              {num}
            </button>
          ))}
        </div>

        {state.hint && (
          <div className="hint-popup">
            <h3>Hint</h3>
            <p className="hint-message">{state.hint.message}</p>
            <div className="hint-type">{state.hint.type.replace("_", " ")}</div>
          </div>
        )}
      </div>
      </div>
    </section>
  );
};

export default Sudoku;
