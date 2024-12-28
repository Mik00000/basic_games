import { Contents } from "./sections/Contents.tsx";
import { Gallery } from "./sections/Gallery.tsx";
import { Features } from "./sections/Features.tsx";
import { Header } from "./sections/Header.tsx";
import { Hero } from "./sections/Hero.tsx";
import "./styles/App.css";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { Partners } from "./sections/Partners.tsx";
import { Testimonials } from "./sections/Testimonials.tsx";
import { Footer } from "./sections/Footer.tsx";
import { Minesweeper } from "./pages/Minesweeper.tsx";
import { ConnectFour } from "./pages/ConnectFour.tsx";
function App() {
  return (
    <div className="App">
      <Router>
        <Header />
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
          <Route path="/games/minesweeper" element={<Minesweeper />} />
          <Route path="/games/connect4" element={<ConnectFour />} />

        </Routes>
        <Footer />
      </Router>
    </div>
  );
}

export default App;
