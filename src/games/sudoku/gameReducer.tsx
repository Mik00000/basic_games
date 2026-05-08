import {
  GameAction,
  GameState,
  initialGameState,
  generateInitialGameState,
  getHint,
} from "./gameLogic";

export const gameReducer = (
  state: GameState,
  action: GameAction,
): GameState => {
  switch (action.type) {
    case "MAKE_MOVE": {
      // Зупиняємо гру, якщо помилок вже забагато (більше 3)
      if (state.mistakesCount >= 3) return state;

      // Клонуємо поле, щоб не мутувати стан напряму
      const newField = state.userField.map((row) => [...row]);
      const { row, col, value } = action.move;
      if (newField[row][col].value !== 0 && !newField[row][col].isError)
        return state;

      // Якщо значення 0, то це стирання клітинки
      if (value === 0) {
        newField[row][col] = {
          ...newField[row][col],
          value: 0,
          isError: false,
        };
        return { ...state, userField: newField, hint: null };
      }

      for (let i = 0; i < 9; i++) {
        if (newField[row][i].notes.has(value)) {
          newField[row][i].notes.delete(value);
        }
        if (newField[i][col].notes.has(value)) {
          newField[i][col].notes.delete(value);
        }
      }

      const isCorrect = state.fullField[row][col] === value;

      // Оновлюємо значення та статус помилки у вибраній клітинці
      newField[row][col] = {
        ...newField[row][col],
        value: value,
        isError: !isCorrect,
      };

      return {
        ...state,
        userField: newField,
        history: [...state.history, { row, col, value, isCorrect }],
        mistakesCount: isCorrect
          ? state.mistakesCount
          : state.mistakesCount + 1,
        hint: null, // Clear hint on move
      };
    }
    case "MAKE_NOTE": {
      const newField = state.userField.map((row) => [...row]);
      const { row, col, value } = action.move;
      const cell = newField[row][col];
      // Створюємо новий Set, щоб React помітив зміну стану
      const newNotes = new Set(cell.notes);
      if (newNotes.has(value)) {
        newNotes.delete(value);
      } else {
        newNotes.add(value);
      }

      newField[row][col] = {
        ...cell,
        notes: newNotes,
      };

      return { ...state, userField: newField, hint: null };
    }
    case "SELECT_CELL":
      return { ...state, selectedCell: action.move, hint: null };
    case "SHOW_HINT": {
      const hint = getHint(state.userField, state.fullField);
      if (hint) {
        // Якщо підказка знайдена, фокус завжди зміщується на неї
        return { ...state, hint, selectedCell: hint.targetCell };
      }
      return { ...state, hint };
    }
    case "RESET":
      return { ...initialGameState};
    case "START_GAME":
      return { ...generateInitialGameState(action.difficulty) };
    case "UNDO_MOVE": {
      if (state.history.length === 0) return state;
      const newField = state.userField.map((row) => [...row]);
      const lastMove = state.history[state.history.length - 1];
      newField[lastMove.row][lastMove.col] = {
        value: 0,
        isError: false,
        isInitial: false,
        notes: new Set<number>(),
      };
      return {
        ...state,
        userField: newField,
        history: state.history.slice(0, -1),
        hint: null,
      };
    }
    case "ERASE_CELL": {
      if (state.userField[action.move.row][action.move.col].isInitial)
        return state;
      const newField = state.userField.map((row) => [...row]);
      const { row, col } = action.move;
      newField[row][col] = {
        value: 0,
        isError: false,
        isInitial: false,
        notes: new Set<number>(),
      };
      return { ...state, userField: newField, hint: null };
    }
    default:
      return state;
  }
};
