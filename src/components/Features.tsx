import React from "react";

export const Features = () => {
  const benefits = [
    {
      heading: "A single source of truth",
      text: "When you add work to your Slate calendar we automatically calculate useful insights ",
      icon: "benefits1.svg",
    },
    {
      heading: "Intuitive interface",
      text: "When you add work to your Slate calendar we automatically calculate useful insights ",
      icon: "benefits2.svg",
    },
    {
      heading: "Or with rules",
      text: "When you add work to your Slate calendar we automatically calculate useful insights ",
      icon: "benefits3.svg",
    },
  ];
  return (
    <div>
      <div className="heading">
        <h1>FEATURES</h1>
        <h2>
          Most calendars are designed for teams. Slate is designed for
          freelancers who want a simple way to plan their schedule.
        </h2>
      </div>
      <div className="info-block">
        <div className="left-part"></div>
        <div className="right-part">
          <ul>
            {benefits.map((block) => (
              <li>
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
    </div>
  );
};
