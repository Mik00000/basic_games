import React from "react";
import { Link } from "react-router-dom";
import connectFourImg from "../assets/game-examles/connect-four.png";
import chessImg from "../assets/game-examles/chess.png";

const featuredGames = [
  {
    name: "Chess",
    url: "/games/chess-menu",
    description: "Play a classic game of chess with your friends online.",
    img: chessImg,
  },
  {
    name: "Connect Four",
    url: "/games/connect4-menu",
    description: "Connect four pieces in a row faster than your opponent.",
    img: connectFourImg,
  },
];

export const FeaturedGames = () => {
  return (
    <section id="featured-games" className="featured-games">
      <div className="heading">
        <h1>Play Online</h1>
        <h2>
          Test your skills against real players from around the world or invite a friend to a private lobby.
        </h2>
      </div>
      <div className="cards-container">
        {featuredGames.map((game, index) => (
          <div className="game-card" key={index}>
            <div className="image-wrapper">
              <img src={game.img} alt={game.name} />
              <div className="badge">Online Multiplayer</div>
            </div>
            <div className="info">
              <h2>{game.name}</h2>
              <p>{game.description}</p>
              <Link to={game.url}>
                <button className="play-btn">Play Now</button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
