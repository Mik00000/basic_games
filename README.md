# 🎮 Gaming Hub (Basic Games)

Gaming Hub is a modern, responsive web platform that aggregates classic board and puzzle games, including **Chess**, **Connect Four**, **Minesweeper**, and **Sudoku**. Built using React, TypeScript, and Vite, the platform features premium UI aesthetics, smooth animations, solo bot gameplay, and real-time multiplayer lobbies powered by Socket.io.

---

## 🎥 Gameplay Demos

Here you can watch the platform in action, demonstrating both local AI bots and real-time online multiplayer gameplay.

### 1. Landing Page & Connect Four (vs Bot)
A demonstration of the glassmorphic homepage layout and a Connect Four match against the integrated AI bot:
<video src="https://github.com/user-attachments/assets/b89c1edf-92a1-4afa-aab5-21053e66d29c"></video>

### 2. Chess (vs Bot Mode)
Playing a game of Chess against the local chess bot:
<video src="https://github.com/user-attachments/assets/ab3a1d84-1dce-445e-ab5f-da7744e7dfb3"></video>

### 3. Online Chess (Multiplayer Lobby System)
Demonstrating real-time room creation, Room ID sharing, and real-time opponent interaction over WebSockets:
<video src="https://github.com/user-attachments/assets/d819cddc-a17d-489b-9342-b6a262ee04d9"></video>

### 4. Sudoku (with Hints & Note-Taking)
A walk-through of Sudoku gameplay, highlighting dynamic board initialization, notes toggle, and the automated hint engine:
<video src="https://github.com/user-attachments/assets/3a954370-ec26-4b2f-8655-706f73cb8719"></video>

---

## 🎲 Core Features

*   **Real-time Multiplayer:** Private room lobbies, matching IDs, connection statuses, and socket event-driven synchronization for Chess and Connect Four.
*   **Intelligent AI Bots:** Local bot modes with adjustable difficulties (from Easy to Expert/Monkey) using custom search algorithms (e.g., Minimax).
*   **Sudoku Puzzle Engine:** Real-time generation of Sudoku boards based on selected difficulty, note-taking (pencil marks), mistake counters, and a hint generator (supporting Full House, Hidden Single, Naked Single).
*   **Minesweeper Engine:** Dynamic mine placement, board state caching (`localStorage` preservation), and responsive, auto-scaling grids.
*   **Premium Visuals:** Custom CSS/SCSS with glassmorphic cards, glowing border highlights, layout transitions, and responsive navigation header/footer grids.

---

## 🛠 Tech Stack

*   **Frontend Framework:** React 19, TypeScript, Vite
*   **Styling:** SCSS / Vanilla CSS
*   **Routing:** React Router v7
*   **Real-Time Sync:** Socket.io-client (communicating with the [Multiplayer Backend](https://github.com/Mik00000/connect-games-server))
*   **Icons:** Lucide React

---

## 🚀 Running the Project Locally

### 1. Clone the repository:
```bash
git clone https://github.com/Mik00000/basic_games.git
cd basic_games
```

### 2. Install dependencies:
```bash
npm install
```

### 3. Start the development server:
```bash
npm run start
```
> 💡 *Note: To play multiplayer games online, you also need to clone and run the backend server: [connect-games-server](https://github.com/Mik00000/connect-games-server).*

---

## 📦 Production Build

To build and preview the optimized production bundle:
```bash
npm run build
npm run preview
```

---

## 💡 Technical Debt & Retrospective

> [!NOTE]
> *This is an older project written during earlier stages of my development journey. While it is fully functional and visually polished, looking back at the codebase now reveals several architectural areas I would refactor to align with production-grade standards.*

If I were to rebuild this project today, I would implement the following improvements:

1.  **State Management & Reducer Isolation:**
    *   *Current Debt:* The global game states are managed using React Context API alongside complex `useReducer` hooks. Some state transitions trigger redundant renders across the board.
    *   *Refactored Approach:* I would introduce a state manager like **Zustand** or **Redux Toolkit** to decouple state logic from components, enabling slice-based state subscription and optimizing re-rendering performance.

2.  **Logic & UI Separation (Custom Hooks):**
    *   *Current Debt:* Heavy game logic (such as the Sudoku solver/generator, minimax minimax bot decisions, and chess rules) is tightly bound to either component files or context providers.
    *   *Refactored Approach:* I would abstract the core game engines into pure logic files and expose them to components through dedicated custom hooks (e.g., `useSudokuEngine`, `useChessRules`), making the UI components strictly presentational and highly testable.

3.  **Strict Routing & State Types:**
    *   *Current Debt:* Several routes rely on loose `location.state` properties (e.g. `location.state.difficulty`) which aren't strictly typed, leading to potential runtime issues if navigated incorrectly.
    *   *Refactored Approach:* I would define type-safe route schemas and use strict validation (via libraries like **Zod**) for path params and WebSocket payload events to ensure end-to-end data integrity.

4.  **WebSocket Optimization & Scalability:**
    *   *Current Debt:* Real-time lobbies send full-board updates over Socket.io on every move. This can cause high network overhead and is prone to synchronization conflicts under poor connection speeds.
    *   *Refactored Approach:* I would refactor the network layer to transmit delta moves (e.g., sending only the coordinate and value of the played piece) and implement optimistic state updates on the client side, accompanied by server-side authoritative validation to prevent cheating.

5.  **Styling Architecture:**
    *   *Current Debt:* The project utilizes a combination of precompiled SCSS and traditional CSS stylesheet overrides, resulting in some styling redundancies and base mixin side-effects (e.g. global padding presets).
    *   *Refactored Approach:* I would adopt **Tailwind CSS** or **CSS Modules** to guarantee scoped styles, prevent selector collisions, and improve development speed.
