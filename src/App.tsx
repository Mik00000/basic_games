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
import { Minesweeper } from "./pages/Minesweeper";
import { ConnectFour } from "./pages/ConnectFour";
import ConnectFourStartMenu from "./sections/ConnectFourStartMenu";
import MinesweeperStartMenu from "./sections/MinesweeperStartMenu";
import Games from "./pages/Games";
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
            <Route
              path="/games/"
              element={<Games />}
            />
            <Route path="/games/minesweeper" element={<Minesweeper />} />
            <Route path="/games/connect4" element={<ConnectFour />} />
            <Route
              path="/games/connect4-menu"
              element={<ConnectFourStartMenu />}
            />
            <Route
              path="/games/minesweeper-menu"
              element={<MinesweeperStartMenu />}
            />
          </Routes>
        </div>
        <Footer />
      </Router>
    </div>
  );
}

export default App;
