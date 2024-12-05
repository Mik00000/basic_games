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
function App() {
  return (
    <div className="App">
      <Router>
        <Header />
      </Router>
      <Hero />
      <Features />
      <Gallery />
    </div>
  );
}

export default App;
