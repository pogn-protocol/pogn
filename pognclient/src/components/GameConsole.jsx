import React, { useEffect, useState, useMemo } from "react";
import RockPaperScissors from "./RockPaperScissors";

const GameConsole = ({
  message = {},
  sendMessage,
  publicKey,
  verifiedPlayers,
}) => {
  const [gameState, setGameState] = useState({
    players: [],
    status: "ready-to-join",
    maxPlayers: 2,
    minPlayers: 2,
    gameAction: null,
  });

  const [gameStarted, setGameStarted] = useState(false);
  const [playerInLobby, setPlayerInLobby] = useState(false);
  const [hasJoined, setHasJoined] = useState(false); // Track if the player has joined the game
  const [isJoining, setIsJoining] = useState(false);

  // Auto-join the game when in the lobby
  useEffect(() => {
    if (playerInLobby && !hasJoined && !isJoining) {
      console.log("Automatically joining the game...");
      handleJoinGame();
    }
  }, [playerInLobby, hasJoined, isJoining]);

  // Auto-start the game when conditions are met
  // useEffect(() => {
  //   if (
  //     gameState.status === "ready-to-join" &&
  //     gameState.players.length >= gameState.minPlayers &&
  //     !gameStarted
  //   ) {
  //     console.log("Automatically starting the game...");
  //     handleStartGame();
  //   }
  // }, [gameState.status, gameState.players, gameStarted]);

  const [processedMessages, setProcessedMessages] = useState(new Set()); // Use a Set for efficient lookups

  // Memoize the message to prevent unnecessary reprocessing
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

    console.log("Processing Game message:", memoizedMessage);

    // Mark the message as processed immutably
    setProcessedMessages((prev) => new Set(prev).add(memoizedMessage.unique));

    switch (action) {
      case "updatePlayers":
        //check if we are on the list
        if (payload.players.includes(publicKey)) {
          setHasJoined(true);
          setIsJoining(false);
        }
        console.log("Updating player list:", payload.players);
        setGameState((prevState) => ({
          ...prevState,
          players: payload.players || [],
          gameAction: null,
        }));
        break;

      case "startGame":
        console.log("startGame mmsg recieved:", payload);
        if (!gameStarted) {
          console.log("Game started.");
          setGameState((prevState) => ({
            ...prevState,
            status: "started",
            players: payload.players || [],
            gameAction: "start",
          }));
          setGameStarted(true);
        }
        break;

      case "verifyPlayer":
        if (isJoining || hasJoined) {
          console.log("Verification request received.");
          handleVerifyPlayer();
        } else {
          console.warn(
            "Received verification request, but player hasn't joined."
          );
        }
        break;

      case "playerVerified":
        console.log(`${payload.publicKey} has verified.`);
        break;

      case "gameAction":
        console.log("gameAction:", payload);
        setGameState((prevState) => ({
          ...prevState,
          gameAction: payload.gameAction,
          payload: payload,
        }));
        break;

      default:
        console.warn(`Unhandled action: ${action}`);
    }
  }, [message, hasJoined]);

  useEffect(() => {
    // Update playerInLobby state when verifiedPlayers changes
    setPlayerInLobby(verifiedPlayers?.includes(publicKey) || false);
  }, [verifiedPlayers, publicKey]);

  const handleStartGame = () => {
    setGameState((prevState) => ({
      ...prevState,
      status: "started",
      gameAction: "start",
    }));

    setGameStarted(true);
    sendMessage({
      type: "game",
      action: "startGame",
      payload: { game: "rock-paper-scissors", publicKey },
    });
  };

  const handleJoinGame = () => {
    console.log(`${publicKey} joining game...`);
    //change join text to joining...
    setIsJoining(true);
    sendMessage({
      type: "game",
      action: "join",
      payload: { game: "rock-paper-scissors", publicKey },
    });
  };

  const handleVerifyPlayer = () => {
    console.log(`Sending verify response for player: ${publicKey}`);
    sendMessage({
      type: "game",
      action: "verifyResponse",
      payload: { game: "rock-paper-scissors", publicKey },
    });
  };

  return (
    <div>
      <h2>Game Controller</h2>
      {!gameStarted ? (
        <>
          <button
            onClick={handleStartGame}
            disabled={
              !playerInLobby || gameStarted || gameState.players.length < 2
            }
          >
            Start Game
          </button>
          <button
            onClick={handleJoinGame}
            disabled={
              hasJoined ||
              isJoining ||
              !playerInLobby ||
              gameState.players.length >= gameState.maxPlayers
            }
          >
            {isJoining ? "Joining..." : hasJoined ? "Joined" : "Join Game"}
          </button>
        </>
      ) : (
        <RockPaperScissors
          sendMessage={sendMessage}
          publicKey={publicKey}
          gameState={gameState}
        />
      )}
    </div>

    // <div>
    //   <h2>Game Controller</h2>

    //   <button
    //     onClick={handleStartGame}
    //     disabled={!playerInLobby || gameStarted || gameState.players.length < 2}
    //   >
    //     Start Game
    //   </button>
    //   <button
    //     onClick={handleJoinGame}
    //     disabled={
    //       hasJoined ||
    //       isJoining ||
    //       !playerInLobby ||
    //       gameState.players.length >= gameState.maxPlayers
    //     }
    //   >
    //     {isJoining ? "Joining..." : hasJoined ? "Joined" : "Join Game"}
    //   </button>

    //   <RockPaperScissors
    //     sendMessage={sendMessage}
    //     publicKey={publicKey}
    //     gameState={gameState}
    //   />
    // </div>
  );
};

export default GameConsole;
