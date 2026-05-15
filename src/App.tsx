import { Header } from "./sections/Header";
import { Hero } from "./sections/Hero";
import "./styles/App.css";
import {
  BrowserRouter as Router,
  Route,
  Routes,
} from "react-router-dom";
import { FeaturedGames } from "./sections/FeaturedGames";
import { GameCollection } from "./sections/GameCollection";
import { Features } from "./sections/Features";
import { Testimonials } from "./sections/Testimonials";
import { Footer } from "./sections/Footer";

import ConnectFourStartMenu from "./games/connectFour/StartMenu";
import MinesweeperStartMenu from "./games/minesweeper/StartMenu";
import Games from "./pages/Games";
import { ConnectFour } from "./games/connectFour/Game";
import { Minesweeper } from "./games/minesweeper/Game";
import ConnectFourLobby from "./games/connectFour/Lobby";
import GameLayout from "./sections/GameLayout";
import { GameProvider } from "./context/GameContext";
import ChessStartMenu from "./games/chess/StartMenu";
import Chess from "./games/chess/Game";
import Sudoku from "./games/sudoku/Game";
import SudokuStartMenu from "./games/sudoku/StartMenu";
import ChessLobby from "./games/chess/Lobby";
function App() {
  return (
    <GameProvider>
      <div className="App">
        <Router>
          {/* <Header /> */}
          <div className="main">
            <Routes>
              <Route
                path="/"
                element={
                  <>
                    <Hero /> 
                    {/*<Features />*/}
                    <FeaturedGames />
                    <GameCollection />
                  </>
                }
              />
              <Route path="/games/" element={<Games />} />

              <Route element={<GameLayout />}>
                <Route path="/games/minesweeper" element={<Minesweeper />} />
                <Route
                  path="/games/connect4/:onlineGameId?"
                  element={<ConnectFour />}
                />
                <Route
                  path="/games/chess/:gameModeOrId?"
                  element={<Chess />}
                />
              <Route path="/games/sudoku" element={<Sudoku />} />

              </Route>

              <Route
                path="/games/connect4-menu"
                element={<ConnectFourStartMenu />}
              />
              <Route
                path="/games/connect4/lobby/:roomId"
                element={<ConnectFourLobby />}
              />
              <Route
                path="/games/minesweeper-menu"
                element={<MinesweeperStartMenu />}
              />
              <Route path="/games/chess-menu" element={<ChessStartMenu />} />
              <Route
                path="/games/chess/lobby/:roomId"
                element={<ChessLobby />}
              />
              <Route path="/games/sudoku-menu" element={<SudokuStartMenu />} />
            </Routes>
          </div>
          <Footer />
        </Router>
      </div>
    </GameProvider>
  );
}

export default App;
