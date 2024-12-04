import { Features } from './components/Features.tsx';
import { Header } from './components/Header.tsx';
import { Hero } from './components/Hero.tsx';
import './styles/App.css';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
function App() {
  return (
    <div className="App">
    <Router>
      <Header />
    </Router>
      <Hero/>
      <Features/>
    </div>
  );
}

export default App;
