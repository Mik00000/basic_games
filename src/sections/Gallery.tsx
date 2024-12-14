import React from "react";
import gallery1 from "../assets/banner/gallery1.png";
import gallery2 from "../assets/banner/gallery2.png";
import gallery3 from "../assets/banner/gallery3.png";
import gallery4 from "../assets/banner/gallery4.png";
import gallery5 from "../assets/banner/gallery5.png";
import gallery6 from "../assets/banner/gallery6.png";
import gallery7 from "../assets/banner/gallery7.png";
import { Link } from "react-router-dom";

export const Gallery = () => {
  return (
    <section className="gallery">
      <div className="heading">
        <h1>Gallery</h1>
        <h2>
          normal We focus on ergonomics and meeting you where you work. It's
          only a keystroke away.
        </h2>
      </div>
      <div className="photos-top photos">
        <img src={gallery1} alt="gallery-photo" className="item" />
        <img src={gallery2} alt="gallery-photo" className="item" />
        <img src={gallery3} alt="gallery-photo" className="item" />
        <img src={gallery4} alt="gallery-photo" className="item" />
      </div>
      <div className="potos-bottom photos">
        <img src={gallery5} alt="gallery-photo" className="item large" />
        <img src={gallery6} alt="gallery-photo" className="item" />
        <img src={gallery7} alt="gallery-photo" className="item large" />
      </div>
      <div className="see-more-btn">
        <Link to="/">
          <button>See More</button>
        </Link>{" "}
      </div>
    </section>
  );
};
