import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { hexToRgb } from '../components/utils.ts';

export const ConnectFour: React.FC = () => {
  // Створюємо поле з унікальними рядками
  const MAX_COLS: number = 5;
  const MAX_ROWS: number = 5;
  const [field, setField] = useState(
    Array.from({ length: MAX_ROWS }, () => Array(MAX_COLS).fill(0))
  );

  // Стан для зберігання індексів наведеної клітинки
  const [hoveredCell, setHoveredCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<number>(1);
  let playerColor1 = hexToRgb("#0000FF");
  let playerColor2 = hexToRgb("#FF0000");
  console.log(playerColor1,playerColor2)
  // Функції для обробки наведення
  const handleMouseEnter = (rowIndex: number, colIndex: number) => {
    setHoveredCell({ row: rowIndex, col: colIndex });
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  // Функція для знаходження останньої клітинки з 0 у колонці
  const getLastRowInColumn = (
    colIndex: number,
    colValue: number
  ): number | null => {
    for (let rowIndex = MAX_ROWS - 1; rowIndex >= 0; rowIndex--) {
      if (field[rowIndex][colIndex] === colValue) {
        return rowIndex;
      }
    }
    return null;
  };

  function handleClick(columnIndex: number) {
    const lastZeroRow = getLastRowInColumn(columnIndex, 0); // Знаходимо останній рядок з 0
    if (lastZeroRow !== null) {
      const newField = field.map((row) => [...row]); // Копіюємо масив
      newField[lastZeroRow][columnIndex] = currentPlayer; // Вставляємо 1 в знайдений рядок
      setField(newField); // Оновлюємо стан
      setCurrentPlayer((prev) => (prev == 1 ? 2 : 1));
    }
  }

  return (
    <section className="connect-four">
      <h1>Зараз ходить:{currentPlayer}</h1>
      <div
        className="field"
        style={
          {
            "--player-color-1": playerColor1,
            "--player-color-2": playerColor2,
          } as React.CSSProperties
        }
      >
        {field.map((row, rowIndex) => (
          <div className="row" key={rowIndex}>
            {row.map((cell, colIndex) => {
              const lastZeroRow = getLastRowInColumn(colIndex, 0); // Отримуємо останній рядок з 0 у цій колонці
              return (
                <div
                  className={`cell ${
                    hoveredCell?.col === colIndex ? "hovered-col" : ""
                  } ${
                    rowIndex === lastZeroRow && hoveredCell?.col === colIndex
                      ? `hovered-by-player-${currentPlayer}`
                      : ""
                  }
                  ${
                    field[rowIndex][colIndex] !== 0
                      ? `active-by-player-${field[rowIndex][colIndex]}`
                      : ""
                  }`}
                  key={colIndex}
                  onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => {
                    if (lastZeroRow !== null) {
                      handleClick(colIndex); // Оновлюємо поле, якщо є місце в колонці
                    }
                  }}
                >
                  {cell !== 0 && cell}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p>
        Наведено на клітинку:{" "}
        {hoveredCell
          ? `Рядок ${hoveredCell.row + 1}, Стовпець ${hoveredCell.col + 1}`
          : "Ні"}
      </p>
    </section>
  );
};
