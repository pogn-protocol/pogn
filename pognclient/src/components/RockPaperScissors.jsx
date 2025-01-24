import React, { useEffect, useState } from "react";

const RockPaperScissors = ({ sendMessage, playerId, gameState }) => {
  const [localGameState, setLocalGameState] = useState({
    status: "started",
    winner: null,
    loser: null,
    choices: {}, // Ensure it's an empty object
    draw: false,
  });

  // Handle game actions received from the server
  useEffect(() => {
    console.log("Received game action");
    // const gameAction = gameState?.gameAction;
    const { gameAction = "", payload = {} } = gameState || {};

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
        //   status: "waiting",
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

  const handleMakeChoice = (gameAction) => {
    setLocalGameState((prevState) => ({
      ...prevState,
      status: "waiting",
    }));
    const message = {
      type: "game",
      action: "gameAction",
      payload: {
        game: "rock-paper-scissors", // Game name
        gameAction, // Player's choice
        playerId, // Player's public
        gameId: gameState.gameId, // Game ID
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
            {localGameState.choices &&
            Object.keys(localGameState.choices).length > 0 ? (
              Object.entries(localGameState.choices).map(([player, choice]) => (
                <li key={player}>
                  {player}: {choice}
                </li>
              ))
            ) : (
              <li>No choices made yet.</li>
            )}
          </ul>
        </>
      )}
      {/* Player List */}
      {/* Player List */}
      <h3>Players</h3>
      <ul>
        {gameState.players?.length > 0 ? (
          gameState.players.map((player, index) => (
            <li key={index}>{player}</li>
          ))
        ) : (
          <li>No players in the game yet.</li>
        )}
      </ul>
    </div>
  );
};

export default RockPaperScissors;
