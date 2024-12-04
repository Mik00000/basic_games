import React, { useState } from "react";
import menuImg from "../assets/icons/menu.svg";
import { Link } from "react-router-dom";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const logo = require("../assets/logo.png");

  const navData = [
    { name: "Home", url: "/home" },
    { name: "Games", url: "/games" },
    { name: "About", url: "/about" },
    { name: "Services", url: "/services" },
    { name: "Contact", url: "/contact" },
  ];

  const toggleMenu = () => {
    console.log("AA")
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="header">
      <Link to="/">
        <img src={logo} alt="logo" className="logo" draggable="false" />
      </Link>
        {/* {`nav-list ${isMenuOpen ? "open" : ""}`} */}
      <nav className="nav-list">
        <ul>
          {navData.map((nav) => (
            <Link to={nav.url} key={nav.name}>
              <li>{nav.name}</li>
            </Link>
          ))}
        </ul>
      </nav>
      <div className="login-and-menu">
        <button className="login-btn btn">Login</button>
        <button className="menu-btn btn" onClick={toggleMenu}>
          <img src={menuImg} alt="menu" draggable="false" />
        </button>
      </div>
    </header>
  );
};
