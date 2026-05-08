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

  return (
    <section className="hero">
      <div className="heading">
        <h1>Work at the speed of thought</h1>
        <h2>
          Most calendars are designed for teams. Slate is designed for
          freelancers who want a simple way to plan their schedule.
        </h2>
      </div>
      <div className="buttons">
        <button className="try-btn">Try For Free</button>
        <button className="learn-btn">Learn More</button>
      </div>
      <div className="banner-background">
        <div
          className="parallax-layer"
          style={{
            transform: `translateY(${parallaxY}px)`,
            filter: `blur(${blurValue}px)`,
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
