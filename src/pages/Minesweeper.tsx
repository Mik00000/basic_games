import React from 'react';

const fieldArea = 16; // Кількість клітинок у рядку/стовпці
const bombPercentage = 40; // Кількість бомб (у відсотках)

// Функція для створення поля гри
function initializeField(areaSize: number, bombPercent: number): number[][] { // Повертаємо масив масивів
  const totalCells = areaSize ** 2;
  const totalBombs = Math.floor(totalCells * bombPercent / 100);

  // Створюємо масив із бомбами та пустими клітинками
  let field = Array(totalBombs).fill(1).concat(Array(totalCells - totalBombs).fill(0));
  field = shuffleArray(field);

  // Розрізаємо поле на рядки
  const cutField: number[][] = [];
  for (let i = 0; i < areaSize; i++) {
    cutField.push(field.splice(0, areaSize));
  }

  return cutField; // Повертаємо розрізане поле
}


function shuffleArray(array: number[]): number[] {
  return array.sort(() => Math.random() - 0.5);
}

const field = initializeField(fieldArea, bombPercentage);

console.log(field);

export const Minesweeper: React.FC = () => {
  return (

      <div id="field">
        {field.map((row, rowIndex) => (
          <div className="row" key={`row-${rowIndex}`}>
            {row.map((cell, cellIndex) => (
              <span className="cell" key={`cell-${rowIndex}-${cellIndex}`}>
                {cell}
              </span>
            ))}
          </div>
        ))}
      </div>

  );
};
