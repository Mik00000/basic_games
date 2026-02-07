import React from "react";
import { OnlineLobby } from "../../components/menus/OnlineLobby";
import { areColorsTooSimilar } from "../../components/common/utils";

export const ConnectFourLobby: React.FC = () => {
  const validatePlayers = (players: any[]) => {
    let isValid = true;
    let p1Error: string | undefined;
    let p2Error: string | undefined;
    let generalError: string | undefined;

    if (!players || players.length < 2) return { isValid: true };

    const p1 = players[0];
    const p2 = players[1];
    const p1Name = p1.username;
    const p2Name = p2.username;
    const p1Color = p1.gameData?.color || "#ffffff";
    const p2Color = p2.gameData?.color || "#ffffff";

    if (!p1Name.trim()) {
      p1Error = "Player 1 name cannot be empty.";
      isValid = false;
    } else if (p1Name.length > 12) {
      p1Error = "Player 1 name cannot be longer than 12 characters.";
      isValid = false;
    }

    if (!p2Name.trim()) {
      p2Error = "Player 2 name cannot be empty.";
      isValid = false;
    } else if (p2Name.length > 12) {
      p2Error = "Player 2 name cannot be longer than 12 characters.";
      isValid = false;
    }

    if (p1Name === p2Name) {
      generalError = "Players cannot have the same name.";
      isValid = false;
    }

    if (p1Color === p2Color || areColorsTooSimilar(p1Color, p2Color, 75)) {
      generalError = "Players cannot have the same or too similar colors.";
      isValid = false;
    }

    if (
      areColorsTooSimilar(p1Color, "#232930", 90) ||
      areColorsTooSimilar(p1Color, "#181818", 90)
    ) {
      p1Error =
        "Player 1 cannot have the same color as the field or colors that are too similar to it";
      isValid = false;
    }

    if (
      areColorsTooSimilar(p2Color, "#232930", 90) ||
      areColorsTooSimilar(p2Color, "#181818", 90)
    ) {
      p2Error =
        "Player 2 cannot have the same color as the field or colors that are too similar to it";
      isValid = false;
    }

    if (areColorsTooSimilar(p1Color, "#FFFFFF", 80)) {
      p1Error = "Player 1 cannot have too light color";
      isValid = false;
    }

    if (areColorsTooSimilar(p2Color, "#FFFFFF", 80)) {
      p2Error = "Player 2 cannot have too light color";
      isValid = false;
    }

    return { isValid, p1Error, p2Error, generalError };
  };

  return (
    <OnlineLobby
      gameType="connect-four"
      title="Connect Four"
      menuPath="/games/connect4-menu"
      gamePathPrefix="/games/connect4"
      validatePlayers={validatePlayers}
      maxPlayers={2}
    />
  );
};

export default ConnectFourLobby;
