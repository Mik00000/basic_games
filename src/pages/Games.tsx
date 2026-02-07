import React from "react";
import { Link } from "react-router-dom";
import connectFourImg from "../assets/game-examles/connect-four.png";
import minesweeperImg from "../assets/game-examles/minesweeper.png";
import chessImg from "../assets/game-examles/chess.png";

const games = [
  {
    name: "Minesweeper",
    url: "minesweeper-menu",
    description:
      "Classic puzzle game where you uncover tiles while avoiding mines.",
    img: minesweeperImg
  },

  {
    name: "Connect Four",
    url: "connect4-menu",
    description:
      "Two-player strategy game where you align four pieces in a row to win.",
    img:connectFourImg
  },
    {
    name: "Chess",
    url: "chess-menu",
    description:
      "Classic strategy game where you try to checkmate your opponent's king.",
    img:chessImg
  },
];

const Games = () => {
  return (
    <div className="games">
      <h1 className="heading">Games</h1>
      <div className="games-list">
        {games.map((game) => (
          <Link to={game.url} draggable="false">
            <div className="game"
            style={{
                backgroundImage:`url(${game.img})`
            }}>
              <div className="info">
                <h2>{game.name}</h2>
                <h3>{game.description}</h3>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Games;
