import React, { useEffect, useRef, useState } from "react";
import RockPaperScissors from "./RockPaperScissors";
import OddsAndEvens from "./oddsAndEvens";

const GameConsole = ({
  message = {},
  sendMessage,
  playerId = "",
  initialGameState = {},
}) => {
  const [gameState, setGameState] = useState({
    ...initialGameState,
  });
  const processedMessagesRef = useRef(new Set());

  useEffect(() => {
    if (!message || processedMessagesRef.current.has(message.unique)) {
      return;
    }
    processedMessagesRef.current.add(message.unique);
  }, [message]);
  const [gameStarted, setGameStarted] = useState(
    initialGameState.status === "started"
  );

  useEffect(() => {
    if (!message || typeof message !== "object") {
      console.warn("Invalid message object:", message);
      return;
    }

    console.log("Processing Game message:", message);
    const { action, payload } = message;

    processedMessagesRef.current.add(message.unique);

    switch (action) {
      case "gameAction":
        console.log("Game action received:", payload);
        setGameState((prevState) => ({
          ...prevState,
          ...payload,
        }));
        break;
      case "results":
        console.log("Game finished. Winner determined.");
        setGameState((prevState) => ({
          ...prevState,
          status: "complete",
          winner: payload.winner,
          loser: payload.loser,
          choices: payload.choices,
        }));
        break;

      default:
        console.warn(`Unhandled action: ${action}`);
    }
  }, [message]);

  const renderGameComponent = () => {
    switch (gameState.gameType) {
      case "rock-paper-scissors":
        return (
          <RockPaperScissors
            sendMessage={sendMessage}
            playerId={playerId}
            gameState={gameState}
          />
        );
      case "odds-and-evens":
        return (
          <OddsAndEvens
            sendMessage={sendMessage}
            playerId={playerId}
            gameState={gameState}
          />
        );
      default:
        return <p>Game type not supported.</p>;
    }
  };

  return (
    <div>
      <h2>Game Console</h2>
      <p>Player ID: {playerId}</p>
      <pre>Game State: {JSON.stringify(gameState, null, 2)}</pre>

      {gameStarted ? (
        <>{renderGameComponent()}</>
      ) : (
        <p>Waiting for game to start...</p>
      )}
    </div>
  );
};

export default GameConsole;
