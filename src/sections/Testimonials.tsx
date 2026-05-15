import React from "react";
import { Link } from "react-router-dom";
const testimonials = [
  {
    author: "Claire Bell",
    subtitle: "chess enthusiast",
    text: "I love how easy it is to set up a private match with my friends. The chess interface is clean and responsive.",
    photo: "user1.png",
  },
  {
    author: "Francisco Lane",
    subtitle: "casual gamer",
    text: "Minesweeper and Sudoku are my go-to games for a quick break. This site runs perfectly on my phone!",
    photo: "user2.png",
  },
  {
    author: "Ralph Fisher",
    subtitle: "competitive player",
    text: "Connect Four online is surprisingly competitive. I've spent hours challenging random players.",
    photo: "user3.png",
  },
  {
    author: "Jorge Murphy",
    subtitle: "puzzle solver",
    text: "The AI difficulty in Chess and Connect Four is well-balanced. Great way to train before playing real opponents.",
    photo: "user4.png",
  },
];
export const Testimonials = () => {
  return (
    <section className="testimonials">
      <div className="heading">
        <h1>Player Reviews</h1>
      </div>
      <div className="content">
        {testimonials.map((testimonial, index) => (
          <div className="block" key={index}>
            <div className="heading">
              <img
                src={new URL(`../assets/users/${testimonial.photo}`, import.meta.url).href}
                alt="user-photo"
                className="user-photo"
              />
              <div className="user-info">
                <h3 className="username">{testimonial.author}</h3>
                <h3 className="user-role">{testimonial.subtitle}</h3>
              </div>
            </div>
            <p className="text">{testimonial.text}</p>
          </div>
        ))}
      </div>

    </section>
  );
};
