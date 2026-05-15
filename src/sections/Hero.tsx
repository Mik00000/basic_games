import { useEffect, useState } from "react";
import { BackgroundChess } from "../components/game/BackgroundChess/BackgroundChess";

export const Hero = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const maxBlur = 10;
  const blurValue = Math.min(2 + scrollY * 0.015, maxBlur);
  const parallaxY = scrollY * 0.4;

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="hero">
      <div className="heading">
        <h1>Play the Best Classic Games</h1>
        <h2>
          Compete with friends online or challenge our AI in Chess, Connect Four, Minesweeper, and Sudoku.
        </h2>
      </div>
      <div className="buttons">
        <button className="try-btn" onClick={() => scrollToSection('featured-games')}>Play Online</button>
        <button className="learn-btn" onClick={() => scrollToSection('all-games')}>Explore Games</button>
      </div>
      <div className="banner-background">
        <div
          className="parallax-layer"
          style={{
            transform: `translateY(${parallaxY}px) translateZ(0)`,
            filter: `blur(${blurValue}px)`,
            willChange: "transform, filter",
            WebkitTransform: `translateY(${parallaxY}px) translateZ(0)`,
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
          }}
        >
          <BackgroundChess />
        </div>
        <div className="overlay-dark"></div>
        <div className="vignette"></div>
        <div className="gradient-fade"></div>
      </div>
    </section>
  );
};
