# 🎮 Gaming Hub (Basic Games)

This is a web platform for classic games that brings together popular board and puzzle games. The project was developed with a focus on modern design, a user-friendly interface, and multiplayer support for select games.

## 🎲 Available Games

- **Chess** - A classic game with support for single-player and multiplayer modes.
- **Connect Four** - A popular two-player game with the option to play online.
- **Minesweeper** - A classic single-player puzzle game.
- **Sudoku** - A number puzzle with various difficulty levels.

## 🛠 Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** SCSS / CSS
- **Routing:** React Router v7
- **Network/Multiplayer:** Socket.io-client
- **Icons:** Lucide React

## 🚀 Running the project locally

1. **Clone the repository:**

   ```bash
   git clone github.com/Mik00000/basic_games
   cd basic_games
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run start
   ```
   _Note: For multiplayer games (Chess, Connect Four), you also need to run the [backend server](https://github.com/Mik00000/connect-games-server)._

## 📦 Creating a production build

To build an optimized version for production:

```bash
npm run build
```

After that, you can test the build locally:

```bash
npm run preview
```


## 💡 Project Features

- Modern and responsive design (Responsive UI).
- Lobby system for multiplayer matches.
- Use of the Context API to manage game states.
