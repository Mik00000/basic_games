import React from "react";
import feature1 from "../assets/banner/features-1.png";
import feature2 from "../assets/banner/features-2.png";
const benefits = [
  {
    id:0,
    heading: "Instant Play",
    text: "Jump straight into the action directly from your browser. No downloads, no installations required.",
    icon: "benefits1.svg",
  },
  {
    id:1,
    heading: "Cross-Platform",
    text: "Whether you're on desktop, tablet, or mobile, our games are fully optimized for all devices.",
    icon: "benefits2.svg",
  },
  {
    id:2,
    heading: "Play with Friends",
    text: "Create private lobbies, share a link, and start playing with your friends in seconds.",
    icon: "benefits3.svg",
  },
];
export const Features = () => {

  return (
    <section className="features">
      <div className="heading">
        <h1>WHY PLAY HERE</h1>
        <h2>
          Our platform is designed for gamers who want a seamless, fast, and engaging experience.
        </h2>
      </div>
      <div className="info-block">
        <div className="left-part">
          <img src={feature1} alt="feature-banner" />
          <img src={feature2} alt="feature-banner" />
        </div>
        <div className="right-part">
          <ul>
            {benefits.map((block) => (
              <li key={block.id}>
                <div className="heading">
                <img src={new URL(`../assets/icons/${block.icon}`, import.meta.url).href} alt="benefit-icon" />
                <h3>{block.heading}</h3>
                </div>
                <p>{block.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
