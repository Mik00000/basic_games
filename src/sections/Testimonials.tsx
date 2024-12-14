import React from "react";
import { Link } from "react-router-dom";

export const Testimonials = () => {


  return (
    <section className="testimonials">
      <div className="heading">
        <h1>Testimonials</h1>
      </div>

      <div className="btn">
        <Link to="/"><button>All Partners</button></Link>
      </div>
    </section>
  );
};
