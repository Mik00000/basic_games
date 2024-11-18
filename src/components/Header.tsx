import React from "react";

export const Header = () => {
  const logo = require("../assets/logo.png");
  const menuImg = require("../assets/menu.svg");

  return (
    <header className="header">
      <img src={logo} alt="logo" className="logo"/>
      <nav className="nav-list">
        <ul>
          <li>Home</li>
          <li>Product</li>
          <li>About</li>
          <li>Contact</li>
        </ul>
      </nav>
      <div className="login-and-menu">
        <button className="login-btn btn">Login</button>
        <button className="menu-btn btn"><img src={menuImg} alt="menu" /></button>
      </div>
    </header>
  );
};
