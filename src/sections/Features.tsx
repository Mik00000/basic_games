import React from "react";
import feature1 from "../assets/banner/features-1.png";
import feature2 from "../assets/banner/features-2.png";
const benefits = [
  {
    id:0,
    heading: "A single source of truth",
    text: "When you add work to your Slate calendar we automatically calculate useful insights ",
    icon: "benefits1.svg",
  },
  {
    id:1,
    heading: "Intuitive interface",
    text: "When you add work to your Slate calendar we automatically calculate useful insights ",
    icon: "benefits2.svg",
  },
  {
    id:2,
    heading: "Or with rules",
    text: "When you add work to your Slate calendar we automatically calculate useful insights ",
    icon: "benefits3.svg",
  },
];
export const Features = () => {

  return (
    <section className="features">
      <div className="heading">
        <h1>FEATURES</h1>
        <h2>
          Most calendars are designed for teams. Slate is designed for
          freelancers who want a simple way to plan their schedule.
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
                <img src={require(`../assets/icons/${block.icon}`)} alt="benefit-icon" />
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
