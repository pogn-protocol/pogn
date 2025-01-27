import React, { useEffect, useRef, useState } from "react";
import RockPaperScissors from "./RockPaperScissors";

const GameConsole = ({
  message = {},
  sendMessage,
  playerId = "",
  initialGameState = {},
}) => {
  const [gameState, setGameState] = useState({
    ...initialGameState,
    // players: initialGameState.players || [],
    // status: initialGameState.status || "ready-to-join",
    // maxPlayers: initialGameState.maxPlayers || 2,
    // minPlayers: initialGameState.minPlayers || 2,
    // gameAction: "",
    // gameId: initialGameState.gameId || "",
  });
  const processedMessagesRef = useRef(new Set());

  useEffect(() => {
    if (!message || processedMessagesRef.current.has(message.unique)) {
      return;
    }
    processedMessagesRef.current.add(message.unique);
    // Process the message...
  }, [message]); // Only re-run when `message` changes

  const [gameStarted, setGameStarted] = useState(
    initialGameState.status === "started"
  );

  useEffect(() => {
    if (!message || typeof message !== "object") {
      console.warn("Invalid message object:", message);
      return; // Exit early if message is invalid
    }

    console.log("Processing Game message:", message);
    const { action, payload } = message;

    processedMessagesRef.current.add(message.unique);

    switch (action) {
      case "startGame":
        console.log("Game started:", payload);
        setGameStarted(true);
        break;
      case "gameAction":
        console.log("Game action received:", payload);
        setGameState((prevState) => ({
          ...prevState,
          ...payload,
        }));
        break;
      case "winner":
        console.log("Game finished. Winner determined.");
        // Example structure for gameState: include winner, loser, choices, or flags
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

  return (
    <div>
      <h2>Game Console</h2>
      <p>Player ID: {playerId}</p>
      <pre>Game State: {JSON.stringify(gameState, null, 2)}</pre>

      {gameStarted ? (
        <RockPaperScissors
          sendMessage={sendMessage}
          playerId={playerId}
          gameState={gameState}
        />
      ) : (
        <p>Waiting for game to start...</p>
      )}
    </div>
  );
};

export default GameConsole;
