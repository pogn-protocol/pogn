import React, { useEffect, useRef, useState } from "react";

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

  const [gameStarted, setGameStarted] = useState(
    initialGameState.status === "started"
  );

  useEffect(() => {
    if (!message || typeof message !== "object") {
      console.warn("Invalid message object:", message);
      return; // Exit early if message is invalid
    }

    if (!message.unique || processedMessagesRef.current.has(message.unique)) {
      console.log("Skipping processed message:", message);
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
