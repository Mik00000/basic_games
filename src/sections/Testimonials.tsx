import React from "react";
import { Link } from "react-router-dom";
const testimonials = [
  {
    author: "Claire Bell",
    subtitle: "designer",
    text: "Slate helps you see how many more days you need to work to reach your financial goal for the month and year.",
    photo: "user1.png",
  },
  {
    author: "Francisco Lane",
    subtitle: "designer",
    text: "Slate helps you see how many more days you need to work to reach your financial goal for the month and year.",

    photo: "user2.png",
  },
  {
    author: "Ralph Fisher",
    subtitle: "designer",
    text: "Slate helps you see how many more days you need to work to reach your financial goal for the month and year.",

    photo: "user3.png",
  },
  {
    author: "Jorge Murphy",
    subtitle: "designer",
    text: "Slate helps you see how many more days you need to work to reach your financial goal for the month and year.",

    photo: "user4.png",
  },
];
export const Testimonials = () => {
  return (
    <section className="testimonials">
      <div className="heading">
        <h1>Testimonials</h1>
      </div>
      <div className="content">
        {testimonials.map((testimonial, index) => (
          <div className="block" key={index}>
            <div className="heading">
              <img
                src={require(`../assets/users/${testimonial.photo}`)}
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
