import React from "react";
import contentsImage1 from "../assets/banner/contents1.png";
import contentsImage2 from "../assets/banner/contents2.png";

export const Contents = () => {
  return (
    <section className="contents">
      <div className="heading">
        <h1>Contents</h1>
        <h2>
          We focus on ergonomics and meeting you where you work. It's only a
          keystroke away.
        </h2>
      </div>
      <div className="content-cards">
        <div className="card">
          <div className="heading">
            <h2>Work</h2>
            <p>
              Ever wondered if you're too reliant on a client for work? Slate
              helps you identify.
            </p>
          </div>
          <button className="btn">Sign Up</button>
          <img src={contentsImage1} alt="card-img" className="card-img" />
        </div>
        <div className="card">
          <div className="heading">
            <h2>Design with real data</h2>
            <p>
              Ever wondered if you're too reliant on a client for work? Slate
              helps you identify .
            </p>
          </div>
          <button className="btn">Try For Free</button>
          <img src={contentsImage2} alt="card-img" className="card-img" />
        </div>
      </div>
    </section>
  );
};
