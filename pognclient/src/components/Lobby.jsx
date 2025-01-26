import React, { useState, useEffect, useRef } from "react";
import "./css/lobby.css";

const Lobby = ({ message, sendMessage, playerId }) => {
  const [lobbyGames, setLobbyGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [hasJoined, setHasJoined] = useState(false); // Track if the player has joined the game
  const [isJoining, setIsJoining] = useState(false);
  const [playerInLobby, setPlayerInLobby] = useState(false);
  const [gameState, setGameState] = useState({
    players: [],
    status: "ready-to-join",
    maxPlayers: 0,
    minPlayers: 0,
    gameAction: "",
    gameId: "",
  });
  const [lobbyPlayers, setLobbyPlayers] = useState([]);

  // useEffect(() => {
  //   setPlayerInLobby(
  //     (players || []).some((player) => player.playerId === playerId)
  //   );
  // }, [players, playerId]);
  //const [processedMessages, setProcessedMessages] = useState([]);
  const processedMessagesRef = useRef(new Set());

  // Process messages and track unique ones
  useEffect(() => {
    console.log("lobby");
    if (!message || typeof message !== "object") {
      console.warn("Invalid message object:", message);
      return; // Exit early if message is invalid
    }

    if (!message.unique || processedMessagesRef.current.has(message.unique)) {
      console.log("Skipping processed message:", message);
      return;
    }

    console.log("Processing Lobby message:", message);
    const { action, payload } = message;

    // Add message to processedMessages
    processedMessagesRef.current.add(message.unique);

    // if (payload.gameState) {
    //   setGameState((prevState) => ({
    //     ...prevState, // Keep existing keys in gameState
    //     ...payload.gameState, // Merge new keys from payload.gameState
    //   }));
    // } else {
    //   //warn
    //   console.warn("No game state found in payload:", payload);
    // }

    switch (action) {
      case "updateGamePlayers":
      //check if we are on the list
      // if (payload.players.includes(playerId)) {
      //   setHasJoined(true);
      //   setIsJoining(false);
      // }
      //   console.log("Updating player list:", payload.players);
      //   setGameState((prevState) => ({
      //     ...prevState,
      //     players: payload.players || [],
      //     gameAction: null,
      //     gameState: payload.state,
      //   }));
      //   break;

      case "startGame":
        console.log("startGame msg recieved:", payload);
        setGameState((prevState) => ({
          ...prevState,
          ...payload,
        }));

        break;

      case "updateLobbyPlayers":
        console.log("Updating player list:", payload.players);

        // Map the payload to the required player format
        if (!payload.players) return;
        const updatedPlayers = (payload.players || []).map((player) => ({
          playerId: player.playerId,
          playerName: player.playerName || "Unknown", // Fallback to "Unknown"
        }));

        // Notify the parent to update the global state
        // if (onUpdatePlayers) {
        //   onUpdatePlayers(updatedPlayers);
        // }

        // Update playersInLobby state
        // if (updatedPlayers.some((player) => player.playerId === playerId)) {
        //   setLobbyPlayers(true);
        // }

        setLobbyPlayers(updatedPlayers);
        break;

      case "joinLobbyStandby":
        console.log("Standby for verification:", payload.playerId);
        break;

      case "verifyPlayer":
        console.log("Verification request received.");
        const verifyMessage = {
          type: "lobby",
          action: "verifyResponse",
          payload: { playerId: playerId },
        };
        console.log("Sending verifyResponse:", verifyMessage);
        sendMessage(verifyMessage);
        break;

      case "playerVerified":
        console.log(`${payload.playerId} has verified.`);
        break;
      case "lobbyGames":
        if (payload.games?.length > 0) {
          console.log("Game list received:", payload.games);

          setLobbyGames((prevGames) => {
            // Map to update or add new games with player data
            const updatedGames = payload.games.map((newGame) => {
              const existingGame = prevGames.find(
                (game) => game.gameId === newGame.gameId
              );
              // If the game exists, merge the players list
              return existingGame
                ? { ...existingGame, players: newGame.players }
                : newGame;
            });
            return updatedGames;
          });
        } else {
          console.log("No games available.");
        }
        break;

      default:
        console.warn(`Unhandled action: ${action}`);
    }
  }, [message, playerId]);

  const handleSelect = (gameId) => {
    console.log(lobbyGames, gameId);
    const selectedGame = lobbyGames.find((game) => game.gameId === gameId);
    console.log(selectedGame);
    if (selectedGame) {
      //gettypes
      console.log(
        "Type of selectedGame.players[0].playerId:",
        typeof selectedGame.players[0],
        selectedGame.players[0]
      );
      console.log("Type of playerId:", typeof playerId, playerId);

      // Check if the current player is in the game's players list
      const isPlayerInGame =
        selectedGame.players?.some((player) => player === String(playerId)) ||
        false;
      setIsJoining(false);
      setHasJoined(isPlayerInGame); // Update hasJoined state
      setSelectedGameId(gameId); // Highlight the selected game

      setGameState((prevState) => {
        return {
          ...prevState, // Retain existing gameState properties
          gameId: gameId, // Always update the gameId
          ...(isPlayerInGame
            ? { status: "canStart" } // If player is in the game, set status to "canStart"
            : { status: undefined }), // Otherwise, reset status or leave it as-is
          maxPlayers: selectedGame.instance?.maxPlayers || 0,
          minPlayers: selectedGame.instance?.minPlayers || 0,
        };
      });

      console.log(
        `Selected Game ID: ${gameId}, Player in Game: ${isPlayerInGame}`
      );
    }
  };

  const handleStartGame = () => {
    console.log("Starting game...", gameState.gameId);
    setGameState((prevState) => ({
      ...prevState,
      status: "starting...",
    }));

    sendMessage({
      type: "lobby",
      action: "startGame",
      payload: { gameId },
    });
  };

  const handleListGames = () => {
    console.log(`${playerId} listing games...`);
    sendMessage({
      type: "lobby",
      action: "getGames",
      payload: {
        playerId,
        gameId: "listGames",
      },
    });
  };

  const handleCreateGame = () => {
    console.log(`${playerId} creating game...`);
    sendMessage({
      type: "lobby",
      action: "createNewGame",
      payload: {
        gameType: "rock-paper-scissors",
        playerId,
        gameId: "new",
      },
    });
  };

  const handleJoinGame = () => {
    //check if max players reached
    if (gameState.players.length >= gameState.maxPlayers) {
      console.log("Game is full. Max players:", gameState.maxPlayers);
      return;
    }
    console.log(`${playerId} joining game... ${gameState.gameId}`);
    //change join text to joining...
    setIsJoining(true);
    sendMessage({
      type: "lobby",
      action: "joinGame",
      payload: {
        game: "rock-paper-scissors",
        playerId,
        gameId: gameState.gameId,
      },
    });
  };

  return (
    <div className="lobby">
      <div className="selectedGameState">
        <h2>Game State</h2>
        <pre>{JSON.stringify(gameState, null, 2)}</pre>
      </div>
      <h2>Lobby</h2>
      <p>Players in Lobby: {lobbyPlayers.length}</p>
      <ul>
        {lobbyPlayers.length > 0 ? (
          lobbyPlayers.map((player, index) => (
            <li key={index}>
              <strong>Player {index + 1}:</strong> {player.playerId}
            </li>
          ))
        ) : (
          <li>No players connected yet</li>
        )}
      </ul>
      <button onClick={handleCreateGame}>Create Game</button>
      <button onClick={handleListGames}>List Games</button>
      <button
        onClick={handleJoinGame}
        disabled={
          hasJoined ||
          isJoining ||
          lobbyPlayers.length === 0 ||
          !gameState.gameId
        }
      >
        {console.log({
          hasJoined,
          isJoining,
          lobbyPlayersLength: lobbyPlayers.length,
          gameId: gameState.gameId,
        })}
        {hasJoined
          ? "Joined" // If the player has joined
          : isJoining
          ? "Joining..." // If the player is in the process of joining
          : "Join Game"}{" "}
      </button>

      {selectedGameId && hasJoined && (
        <button
          onClick={() => handleStartGame(selectedGameId)}
          disabled={
            Object.keys(
              lobbyGames.find((game) => game.gameId === selectedGameId)
                ?.players || {}
            ).length < 2
          } // Enable if 2+ players
          style={{
            marginTop: "10px",
            backgroundColor:
              Object.keys(
                lobbyGames.find((game) => game.gameId === selectedGameId)
                  ?.players || {}
              ).length >= 2
                ? "#28a745" // Green for enabled
                : "#ccc", // Gray for disabled
            cursor:
              Object.keys(
                lobbyGames.find((game) => game.gameId === selectedGameId)
                  ?.players || {}
              ).length >= 2
                ? "pointer"
                : "not-allowed",
          }}
        >
          {Object.keys(
            lobbyGames.find((game) => game.gameId === selectedGameId)
              ?.players || {}
          ).length >= 2
            ? "Start Game"
            : "Waiting for Players"}
        </button>
      )}

      <div className="lobbyGames">
        {lobbyGames.length > 0 ? (
          <ul>
            {lobbyGames.map((game, index) => (
              <li
                key={index}
                onClick={() => handleSelect(game.gameId)} // Handle click to select the game
                style={{
                  cursor: "pointer",
                  padding: "10px",
                  border: "1px solid #ccc",
                  borderRadius: "5px",
                  margin: "5px 0",
                  backgroundColor:
                    selectedGameId === game.gameId ? "#d3f9d8" : "#fff", // Highlight selected
                  fontWeight:
                    selectedGameId === game.gameId ? "bold" : "normal", // Bold selected
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <div>
                    <strong>Game {index + 1}:</strong> {game.gameId}
                  </div>
                  {game.players?.some((player) => player === playerId) && (
                    <span
                      style={{
                        backgroundColor: "#28a745",
                        color: "white",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      Joined
                    </span>
                  )}
                </div>
                <div>
                  <strong>Game Type:</strong> {game.gameType}
                </div>
                <div>
                  <div>
                    <strong>Players:</strong>{" "}
                    {Object.keys(game.players || {}).length} /{" "}
                    {game.instance?.maxPlayers || "N/A"}
                  </div>
                  {game.players && Object.keys(game.players).length > 0 ? (
                    <ul>
                      {Object.entries(game.players).map(
                        ([playerId, playerData], playerIndex) => (
                          <li key={playerIndex}>
                            <strong>Player {playerIndex + 1}:</strong>{" "}
                            {playerId}
                          </li>
                        )
                      )}
                    </ul>
                  ) : (
                    <div>No players connected yet</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No games available</p>
        )}
      </div>
    </div>
  );
};

export default Lobby;
