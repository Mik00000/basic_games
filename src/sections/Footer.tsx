import React from "react";
import { Link } from "react-router-dom";
import geoIcon from "../assets/icons/geopos.svg";
import phoneIcon from "../assets/icons/mobile.svg";
import xIcon from "../assets/icons/x.svg";
import facebookIcon from "../assets/icons/facebook.svg";
import linkedInIcon from "../assets/icons/linkedIn.svg";

const footerMenus = [
  {
    name: "Finger type",
    content: [
      { name: "Home", url: "/home" },
      { name: "Examples", url: "/examples" },
      { name: "Pricing", url: "/pricing" },
      { name: "Updates", url: "/updates" },
    ],
  },
  {
    name: "Resources",
    content: [
      { name: "Home", url: "/home" },
      { name: "Examples", url: "/examples" },
      { name: "Pricing", url: "/pricing" },
      { name: "Updates", url: "/updates" },
    ],
  },
  {
    name: "About",
    content: [
      { name: "Home", url: "/home" },
      { name: "Examples", url: "/examples" },
      { name: "Pricing", url: "/pricing" },
      { name: "Updates", url: "/updates" },
    ],
  },
];

export const Footer = () => {
  return (
    <footer className="footer">
      <div className="left-part">
        <nav>
          {footerMenus.map((menu, index) => (
            <div className="menu" key={`menu-${index}`}>
              <h3>{menu.name}</h3>
              <ul>
                {menu.content.map((child, childIndex) => (
                  <Link to={child.url} key={childIndex}>
                    <li>{child.name}</li>
                  </Link>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="right-part">
        <div className="company-info">
          <div className="info-block">
            <img src={geoIcon} draggable="false" alt="geo-position-icon" />
            <span>7480 Mockingbird Hill undefined </span>
          </div>
          <div className="info-block">
            <img src={phoneIcon} draggable="false" alt="mobile-icon" />
            <span>(239) 555-0108 </span>
          </div>
        </div>
        <div className="social">
          <Link to="/">
            <img src={xIcon} draggable="false" alt="x" />
          </Link>
          <Link to="/">
            <img src={facebookIcon} draggable="false" alt="facebook" />
          </Link>
          <Link to="/">
            <img src={linkedInIcon} draggable="false" alt="linkedIn" />
          </Link>
        </div>
      </div>
    </footer>
  );
};
