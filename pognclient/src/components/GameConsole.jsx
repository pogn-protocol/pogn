import React, { useEffect, useState, useMemo } from "react";
import RockPaperScissors from "./RockPaperScissors";

const GameConsole = ({ message = {}, sendMessage, playerId = "", players }) => {
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

  useEffect(() => {
    console.log(
      "hasJoined:",
      hasJoined,
      "isJoining:",
      isJoining,
      "gameState:",
      gameState
    );
    console.log("players:", players);
    if (gameState.gameId) {
      console.log("Game has gameId:", gameState.gameId);
    }
    let timeoutId;

    if (
      players.some((player) => player.playerId === playerId) &&
      !hasJoined &&
      !isJoining &&
      !gameState.gameId
    ) {
      timeoutId = setTimeout(() => {
        console.log("Automatically creating a game...");
        handleCreateGame();
      }, 5000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId); // Cleanup the timeout
      }
    };
  }, [players, hasJoined, isJoining, gameState.gameId, playerId]);

  // Auto-join the game when in the lobby
  // useEffect(() => {
  //   if (
  //     players.some((p) => p.playerId === playerId) &&
  //     !hasJoined &&
  //     !isJoining &&
  //     !gameState.gameId
  //   ) {
  //     console.log("Automatically creating a game...");
  //     handleCreateGame();
  //   }
  // }, [players, hasJoined, isJoining, gameState.gameId, playerId]);

  //autojoin when we have a gameId
  // useEffect(() => {
  //   if (playerInLobby && gameState.gameId && !hasJoined && !isJoining) {
  //     //console.log("Automatically joining the game...");
  //     //handleJoinGame();
  //   }
  // }, [gameState.gameId]);

  useEffect(() => {
    setPlayerInLobby(
      (players || []).some((player) => player.playerId === playerId)
    );
  }, [players, playerId]);

  useEffect(() => {
    let requestCount = 0; // Counter to track the number of requests sent

    if (!gameState.gameId) {
      const intervalId = setInterval(() => {
        if (requestCount < 5) {
          console.log("Sending getGames request...");
          sendMessage({
            type: "game",
            action: "getGames",
            payload: {
              playerId,
              gameId: "getGames",
            },
          });
          requestCount += 1; // Increment the counter
        } else {
          clearInterval(intervalId); // Stop the interval after 5 requests
        }
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(intervalId); // Cleanup interval on unmount
    }
  }, [gameState.gameId, sendMessage, playerId]);

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
    if (!action || !payload) {
      console.warn("Invalid message:", memoizedMessage);
      return;
    }

    console.log("Processing Game message:", memoizedMessage);

    // Mark the message as processed immutably
    setProcessedMessages((prev) => new Set(prev).add(memoizedMessage.unique));

    switch (action) {
      case "gameList":
        if (payload.games?.length > 0) {
          console.log("Game list received:", payload.games);
          setGameState((prevState) => ({
            ...prevState,
            gameId: payload.games[0]?.gameId, // Automatically select the first game
          }));
        } else {
          console.log("No games available.");
        }
        break;

      case "updateGamePlayers":
        //check if we are on the list
        if (payload.players.includes(playerId)) {
          setHasJoined(true);
          setIsJoining(false);
        }
        console.log("Updating player list:", payload.players);
        setGameState((prevState) => ({
          ...prevState,
          players: payload.players || [],
          gameAction: null,
          gameState: payload.state,
        }));
        break;

      case "startGame":
        console.log("startGame msg recieved:", payload);
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

      case "joinStandby":
        console.log("Standby for joining game:", payload.playerId);
        break;

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
      payload: {
        game: "rock-paper-scissors",
        playerId,
        gameId: gameState.gameId,
      },
    });
  };

  const handleCreateGame = () => {
    console.log(`${playerId} creating game...`);
    sendMessage({
      type: "game",
      action: "createNewGame",
      payload: {
        gameType: "rock-paper-scissors",
        playerId,
        gameId: "new",
      },
    });
  };

  const handleJoinGame = () => {
    console.log(`${playerId} joining game... ${gameState.gameId}`);
    //change join text to joining...
    setIsJoining(true);
    sendMessage({
      type: "game",
      action: "joinGame",
      payload: {
        game: "rock-paper-scissors",
        playerId,
        gameId: gameState.gameId,
      },
    });
  };

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
          <button
            onClick={handleJoinGame}
            disabled={
              hasJoined || isJoining || !playerInLobby || !gameState.gameId
            }
          >
            {isJoining ? "Joining..." : hasJoined ? "Joined" : "Join Game"}
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
    //     playerId={playerId}
    //     gameState={gameState}
    //   />
    // </div>
  );
};

export default GameConsole;
