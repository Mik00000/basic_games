import React from "react";
import { Link } from "react-router-dom";
import connectFourImg from "../assets/game-examles/connect-four.png";
import minesweeperImg from "../assets/game-examles/minesweeper.png";
import chessImg from "../assets/game-examles/chess.png";
import sudokuImg from "../assets/game-examles/sudoku.png";

const allGames = [
  {
    name: "Chess",
    url: "/games/chess-menu",
    description: "Classic strategy for developing your mind. (Online / Bot)",
    img: chessImg,
  },
  {
    name: "Connect Four",
    url: "/games/connect4-menu",
    description: "Light and fast game for two players. (Online / Bot)",
    img: connectFourImg,
  },
  {
    name: "Minesweeper",
    url: "/games/minesweeper-menu",
    description: "Classic puzzle game of mine clearance. (Solo)",
    img: minesweeperImg,
  },
  {
    name: "Sudoku",
    url: "/games/sudoku-menu",
    description: "Popular number puzzle to train your brain. (Solo)",
    img: sudokuImg,
  },
];

export const GameCollection = () => {
  return (
    <section id="all-games" className="game-collection">
      <div className="heading">
        <h1>All Games</h1>
        <h2>Choose a game to your liking and start playing right now.</h2>
      </div>
      <div className="collection-grid">
        {allGames.map((game, index) => (
          <Link to={game.url} key={index} className="collection-item" draggable="false">
            <div
              className="bg-image"
              style={{ backgroundImage: `url(${game.img})` }}
            ></div>
            <div className="overlay">
              <div className="content">
                <h3>{game.name}</h3>
                <p>{game.description}</p>
                <span className="play-link">Play Now →</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
