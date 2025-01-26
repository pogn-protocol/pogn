import React, { useEffect, useState, useMemo } from "react";
import RockPaperScissors from "./RockPaperScissors";

const GameConsole = ({ message = {}, sendMessage, playerId = "" }) => {
  const [gameState, setGameState] = useState({
    players: [],
    status: "ready-to-join",
    maxPlayers: 2,
    minPlayers: 2,
    gameAction: "",
    gameId: "",
  });

  const [gameStarted, setGameStarted] = useState(false);
  const [hasJoined, setHasJoined] = useState(false); // Track if the player has joined the game
  const [isJoining, setIsJoining] = useState(false);
  const [playerInLobby, setPlayerInLobby] = useState(false);

  const [processedMessages, setProcessedMessages] = useState(new Set()); // Use a Set for efficient lookups

  const memoizedMessage = useMemo(() => {
    if (
      message &&
      (!message.unique || !processedMessages.has(message.unique))
    ) {
      console.log("Memoizing new message:", message.unique || "No unique ID");
      return message;
    }
    return null;
  }, [message, processedMessages]);

  useEffect(() => {
    if (!memoizedMessage) return; // Skip null or already processed messages

    const { action, payload } = memoizedMessage;
    if (!action || !payload) {
      console.warn("Invalid message:", memoizedMessage);
      return;
    }

    console.log("Processing Game message:", memoizedMessage);

    // Mark the message as processed immutably
    setProcessedMessages((prev) => new Set(prev).add(memoizedMessage.unique));

    switch (action) {
      // case "gameList":
      //   if (payload.games?.length > 0) {
      //     console.log("Game list received:", payload.games);
      //     setGameState((prevState) => ({
      //       ...prevState,
      //       gameId: payload.games[0]?.gameId, // Automatically select the first game
      //     }));
      //   } else {
      //     console.log("No games available.");
      //   }
      //   break;

      // case "updateGamePlayers":
      //   //check if we are on the list
      //   if (payload.players.includes(playerId)) {
      //     setHasJoined(true);
      //     setIsJoining(false);
      //   }
      //   console.log("Updating player list:", payload.players);
      //   setGameState((prevState) => ({
      //     ...prevState,
      //     players: payload.players || [],
      //     gameAction: null,
      //     gameState: payload.state,
      //   }));
      //   break;

      // case "startGame":
      //   console.log("startGame msg recieved:", payload);
      //   if (!gameStarted) {
      //     console.log("Game started.");
      //     setGameState((prevState) => ({
      //       ...prevState,
      //       status: "started",
      //       players: payload.players || [],
      //       gameAction: "start",
      //     }));
      //     setGameStarted(true);
      //   }
      //   break;

      // case "joinStandby":
      //   console.log("Standby for joining game:", payload.playerId);
      //   break;

      case "gameAction":
        console.log("gameAction:", payload);
        setGameState((prevState) => ({
          ...prevState,
          gameAction: payload.gameAction,
          ...payload,
        }));
        break;

      default:
        console.warn(`Unhandled action: ${action}`);
    }
  }, [message, hasJoined]);



  return (
    <div>
      <h2>Game Controller</h2>
      <p>Player ID: {playerId}</p>
      <pre>Game State: {JSON.stringify(gameState, null, 2)}</pre>

      {!gameStarted ? (
        <>
          <button
            onClick={handleStartGame}
            disabled={gameState.gameState !== "readyToStart"}
          >
            Start Game
          </button>
        </>
      ) : (
        <RockPaperScissors
          sendMessage={sendMessage}
          playerId={playerId}
          gameState={gameState}
        />
      )}
    </div>
  );
};

export default GameConsole;
