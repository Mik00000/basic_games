import React, { useState } from "react";
import menuImg from "../assets/icons/menu.svg";
import { ReactComponent as CrossIcon } from "../assets/icons/cross.svg";
import logo from "../assets/logo.png";
import { Link } from "react-router-dom";
const navData = [
  { name: "Home", url: "/home" },
  { name: "Games", url: "/games" },
  { name: "About", url: "/about" },
  { name: "Services", url: "/services" },
  { name: "Contact", url: "/contact" },
];
export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);


  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="header">
      <Link to="/">
        <img src={logo} alt="logo" className="logo" draggable="false" />
      </Link>

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
      <div className={`burger-menu ${isMenuOpen ? "open" : ""}`}>
        <div className="content">
          <button className="cross-btn btn" onClick={toggleMenu}>
            <CrossIcon alt="cross-icon" className="cross-icon" />
          </button>
          <nav>
            <ul>
              {navData.map((nav) => (
                <Link to={nav.url} key={nav.name}>
                  <li>{nav.name}</li>
                </Link>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};
