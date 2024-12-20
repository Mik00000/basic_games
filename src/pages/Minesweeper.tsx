import React, { useState } from "react";

const fieldArea = 16;
const bombPercentage = 20;

type Cell = {
  bomb: boolean;
  flag: boolean;
  bombsAround: number;
  revealed: boolean;
};

function initializeField(areaSize: number, bombPercent: number): number[][] {
  const totalCells = areaSize ** 2;
  const totalBombs = Math.floor((totalCells * bombPercent) / 100);

  let field = Array(totalBombs)
    .fill(1)
    .concat(Array(totalCells - totalBombs).fill(0));
  field = shuffleArray(field);

  const cutField: number[][] = [];
  for (let i = 0; i < areaSize; i++) {
    cutField.push(field.slice(i * areaSize, (i + 1) * areaSize));
  }
  return cutField;
}

function shuffleArray(array: number[]): number[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function transformField(field: number[][]): Cell[][] {
  // const areaSize = field.length;

  const countBombsAround = (row: number, col: number): number => {
    return [-1, 0, 1].reduce((count, i) => {
      return (
        count +
        [-1, 0, 1].reduce((subCount, j) => {
          const newRow = row + i;
          const newCol = col + j;
          return subCount + (field[newRow]?.[newCol] === 1 ? 1 : 0);
        }, 0)
      );
    }, 0);
  };

  return field.map((row, rowIndex) =>
    row.map((cell, colIndex) => ({
      bomb: cell === 1,
      flag: false,
      bombsAround: countBombsAround(rowIndex, colIndex),
      revealed: false,
    }))
  );
}

function ensureSafeFirstClick(
  field: Cell[][],
  row: number,
  col: number
): Cell[][] {
  if (field[row][col].bomb || field[row][col].bombsAround > 0) {
    return initializeSafeField(field.length, row, col);
  }
  return field;
}

function initializeSafeField(
  areaSize: number,
  safeRow: number,
  safeCol: number
): Cell[][] {
  let field: number[][];
  do {
    field = initializeField(areaSize, bombPercentage);
  } while (
    field[safeRow][safeCol] === 1 ||
    hasBombsAround(field, safeRow, safeCol)
  );
  return transformField(field);
}

function hasBombsAround(field: number[][], row: number, col: number): boolean {
  return [-1, 0, 1].some((i) =>
    [-1, 0, 1].some((j) => {
      const newRow = row + i;
      const newCol = col + j;
      return field[newRow]?.[newCol] === 1;
    })
  );
}


export const Minesweeper: React.FC = () => {
  const [field, setField] = useState<Cell[][]>(
    transformField(initializeField(fieldArea, bombPercentage))
  );
  const [firstClick, setFirstClick] = useState(true);
  const [flagCount, setFlagCount] = useState(
    Math.floor((fieldArea ** 2 * bombPercentage) / 100)
  );
  function revealEmptyCells(field: Cell[][], row: number, col: number): Cell[][] {
    const stack: [number, number][] = [[row, col]];
    const visited = new Set<string>();

    while (stack.length) {

      const [r, c] = stack.pop()!;
      const key = `${r},${c}`;
      if (visited.has(key)) continue;
      visited.add(key);
  
      field[r][c].revealed = true;
      //В цьому if проблема, він виконується два рази із за StrictMode
      if(field[r][c].flag) {
        console.log(field[r][c])
        field[r][c].flag = false;
        setFlagCount((prevCount) => {return prevCount+1})
      };
  
      if (field[r][c].bombsAround === 0 && !field[r][c].bomb) {
        // Перевіряємо всі сусідні клітинки
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const newRow = r + i;
            const newCol = c + j;
            if (
              newRow >= 0 &&
              newRow < field.length &&
              newCol >= 0 &&
              newCol < field[0].length &&
              !visited.has(`${newRow},${newCol}`) &&
              !field[newRow][newCol].revealed
            ) {
              stack.push([newRow, newCol]);
            }
          }
        }
      }
    }
    
    return field;
  }
  
  const handleClick = (row: number, col: number) => {
    setField((prevField) => {
      let newField = prevField;

      if (firstClick) {
        const flags = prevField.map((r) => r.map((cell) => cell.flag));

        newField = ensureSafeFirstClick(prevField, row, col);
        newField.forEach((r, rowIndex) =>
          r.forEach((cell, colIndex) => {
            if (flags[rowIndex][colIndex]) {
              cell.flag = true;
            }
          })
        );

        setFirstClick(false);
      }

      if (!newField[row][col].flag) {
        if (newField[row][col].bombsAround === 0 && !newField[row][col].bomb) {
          newField = revealEmptyCells(
            [...newField.map((r) => r.map((cell) => ({ ...cell })))],
            row,
            col
          );
        } else {
          newField[row][col].revealed = true;
        }
      }

      return [...newField];
    });
  };

  const handleRightClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    row: number,
    col: number
  ) => {
    event.preventDefault();
  
    // Заборона взаємодії з відкритими клітинками
    if (field[row][col].revealed) return;
  
    setField((prevField) => {
      const newField = prevField.map((r) => r.map((cell) => ({ ...cell })));
  
      // Якщо клітинка вже має прапорець, його можна зняти
      if (newField[row][col].flag) {
        newField[row][col].flag = false;
      } 
      // Якщо прапорців ще залишилось, можна поставити
      else if (flagCount > 0) {
        newField[row][col].flag = true;
      }
  
      return newField;
    });
  
    // Оновлення кількості прапорців (уникнення подвійного виклику)
    setFlagCount((prevCount) => {
      if (field[row][col].flag) {
        return prevCount + 1; // Прапорець знімається
      } else if (flagCount > 0) {
        return prevCount - 1; // Прапорець додається
      }
      return prevCount;
    });
  };
  
  return (
    <div>
      {flagCount}
      <div id="field">
        {field.map((row, rowIndex) => (
          <div className="row" key={`row-${rowIndex}`}>
            {row.map((cell, cellIndex) => (
              <button
                className="cell"
                key={`cell-${rowIndex}-${cellIndex}`}
                onClick={() => {
                  !cell.flag && handleClick(rowIndex, cellIndex);
                }}
                onContextMenu={(event) =>
                  handleRightClick(event, rowIndex, cellIndex)
                }
                style={{
                  backgroundColor: cell.revealed ? "#ddd" : "#eee",
                }}
              >
                {!cell.flag
                  ? cell.revealed
                    ? cell.bomb
                      ? "💣"
                      : cell.bombsAround || ""
                    : null
                  : "🚩"}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
