import React, { useEffect, useState } from "react";

const RockPaperScissors = ({ sendMessage, publicKey, gameState }) => {
  const [localGameState, setLocalGameState] = useState({
    status: "started", // Game status: waiting, in-progress, complete
    winner: null, // Winner's public key
    loser: null, // Loser's public key
    choices: {}, // Player choices: { publicKey: choice }
    draw: false, // Whether the game ended in a draw
  });

  // Handle game actions received from the server
  useEffect(() => {
    console.log("Received game action");
    // const gameAction = gameState?.gameAction;
    const { gameAction, payload } = gameState || {};

    if (!gameAction) {
      console.warn("No gameAction received.");
      return;
    }

    console.log("RPS message received:", gameAction);

    switch (gameAction) {
      case "start":
        console.log("Game started. Players can now choose choices.");
        setLocalGameState((prevState) => ({
          ...prevState,
          status: "started",
        }));
        break;

      case "choiceMade":
        console.log("Choice recorded.");
        break;

      case "winner":
        console.log("Game finished. Winner determined.");
        // Example structure for gameState: include winner, loser, choices, or flags
        setLocalGameState((prevState) => ({
          ...prevState,
          status: "complete",
          winner: payload.winner,
          loser: payload.loser,
          choices: payload.choices,
        }));
        break;

      case "draw":
        console.log("Game ended in a draw.");
        setLocalGameState((prevState) => ({
          ...prevState,
          status: "complete",
          draw: true,
        }));
        break;

      case "reset":
        console.log("Game reset.");
        // setLocalGameState({
        //   status: "complete",
        //   winner: null,
        //   loser: null,
        //   choices: {},
        //   draw: false,
        // });
        break;

      default:
        console.warn(`Unhandled gameAction: ${gameAction}`);
        break;
    }
  }, [gameState]);

  const handleMakeChoice = (choice) => {
    setLocalGameState((prevState) => ({
      ...prevState,
      status: "waiting",
    }));
    const message = {
      type: "game",
      action: "gameAction",
      payload: {
        game: "rock-paper-scissors", // Game name
        choice, // Player's choice
        publicKey, // Player's public
      },
    };

    console.log("Sending choice:", message);
    sendMessage(message);
  };

  return (
    <div>
      <h2>Rock Paper Scissors</h2>

      {/* Game Status: In-Progress */}
      {localGameState.status === "waiting" && (
        <p> Waiting for opponent to Choose </p>
      )}
      {localGameState.status === "started" && (
        <div>
          <h3>Select Your Choice</h3>
          <button onClick={() => handleMakeChoice("rock")}>Rock</button>
          <button onClick={() => handleMakeChoice("paper")}>Paper</button>
          <button onClick={() => handleMakeChoice("scissors")}>Scissors</button>
        </div>
      )}
      {/* Game Status: Complete */}
      {localGameState.status === "complete" && (
        <>
          {localGameState.draw ? (
            <p>The game ended in a draw!</p>
          ) : (
            <p>
              Winner: {localGameState.winner}, Loser: {localGameState.loser}
            </p>
          )}
          <h3>Choices</h3>
          <ul>
            {Object.entries(localGameState.choices).map(([player, choice]) => (
              <li key={player}>
                {player}: {choice}
              </li>
            ))}
          </ul>
        </>
      )}
      {/* Player List */}
      <h3>Players</h3>
      <ul>
        {gameState.players?.map((player, index) => (
          <li key={index}>{player}</li>
        ))}
      </ul>
    </div>
  );
};

export default RockPaperScissors;
