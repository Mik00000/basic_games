import { Contents } from "./sections/Contents";
import { Gallery } from "./sections/Gallery";
import { Features } from "./sections/Features";
import { Header } from "./sections/Header";
import { Hero } from "./sections/Hero";
import "./styles/App.css";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { Partners } from "./sections/Partners";
import { Testimonials } from "./sections/Testimonials";
import { Footer } from "./sections/Footer";

import ConnectFourStartMenu from "./games/connectFour/StartMenu";
import MinesweeperStartMenu from "./games/minesweeper/StartMenu";
import Games from "./pages/Games";
import { ConnectFour } from "./games/connectFour/Game";
import { Minesweeper } from "./games/minesweeper/Game";
import  OnlineTester  from "./components/OnlineTester";
function App() {
  return (
    <div className="App">
      <Router>
        <Header />
        <div className="main">
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <Hero />
                  <Features />
                  <Contents />
                  <Gallery />
                  <Partners />
                  <Testimonials />
                </>
              }
            />
            <Route path="/games/" element={<Games />} />
            <Route path="/games/minesweeper" element={<Minesweeper />} />
            <Route
              path="/games/connect4/:shareInfo?/:onlineGameId?"
              element={<ConnectFour />}
            />
            <Route
              path="/games/connect4-menu"
              element={<ConnectFourStartMenu />}
            />
            <Route
              path="/games/minesweeper-menu"
              element={<MinesweeperStartMenu />}
            />            
            <Route
              path="/games/tester"
              element={<OnlineTester/>}
            />
          </Routes>
        </div>
        <Footer />
      </Router>
    </div>
  );
}

export default App;
