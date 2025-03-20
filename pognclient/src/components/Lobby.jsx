import React, { useState, useEffect, useRef } from "react";
import "./css/lobby.css";

const Lobby = ({
  message,
  sendMessage,
  playerId,
  setStartWebSocket,
  setInitialGameState,
  setStartGameConsole,
}) => {
  const [lobbyGames, setLobbyGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [hasJoined, setHasJoined] = useState(false); // Track if the player has joined the game
  const [isJoining, setIsJoining] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState("odds-and-evens");
  const [selectedGamestate, setSelectedGamestate] = useState({
    players: [],
    status: "ready-to-join",
    maxPlayers: 0,
    minPlayers: 0,
    gameAction: "",
    gameId: "",
  });
  const [lobbyPlayers, setLobbyPlayers] = useState([]);

  useEffect(() => {
    console.log("lobby useEffect");
    if (!message || Object.keys(message).length === 0) {
      console.warn("Invalid message object:", message);
      return;
    }

    console.log("Processing Lobby message:", message);
    const { action, payload } = message;

    switch (action) {
      case "refreshLobby":
        console.log("Game list received:", payload);
        setLobbyGames(payload.lobbyGames || []);
        setLobbyPlayers(payload.lobbyPlayers || []);
        console.log("selectedGameId", selectedGameId);
        const playerGame = payload.lobbyGames.find(
          (game) => game.gameId === selectedGameId // ✅ Use the game that was actually selected
        );

        if (playerGame) {
          console.log(
            `Player ${playerId} is in a valid game (readyToStart/started):`,
            playerGame
          );

          // Preselect the game
          setSelectedGameId(playerGame.gameId);
          setSelectedGamestate((prevState) => ({
            ...prevState,
            ...playerGame,
          }));

          const isPlayerInGame = playerGame.players?.some(
            (player) => player === String(playerId)
          );

          setHasJoined(isPlayerInGame);

          if (playerGame.status === "started") {
            console.log(
              "Game has started. Transitioning to GameConsole.",
              playerGame
            );
            // setStartWebSocket(true);
            // setStartGame(true);
            setStartWebSocket((prev) => {
              if (prev) {
                console.log("🚨 WebSocket already started. Skipping...");
                return true; // Don't change state
              }
              console.log(
                `✅ Player ${playerId} is in the game. Attaching to relay.`
              );
              setInitialGameState({ ...playerGame });
              return true; // Change state to start WebSocket
            });

            // setInitialGameState({
            //   ...playerGame,
            // });
          } else {
            console.log("Game is not started yet. Staying in the lobby.");
            setStartGameConsole(false);
            setInitialGameState({});
          }
        } else {
          console.log("Player is not in any valid game. Staying in the lobby.");

          // Reset the game state
          setSelectedGameId(null);
          // setSelectedGamestate({
          //   players: [],
          //   status: "ready-to-join",
          //   maxPlayers: 0,
          //   minPlayers: 0,
          //   gameAction: "",
          //   gameId: "",
          // });
          setHasJoined(false);
          setInitialGameState({});
          setStartGameConsole(false);
          setStartWebSocket(false);
        }
        break;
      case "startGame":
        const game = payload.game;
        console.log("Starting game...", game);
        if (new Set(game.players).has(playerId)) {
          console.log(
            `✅ Player ${playerId} is in the game. Attempting to attach to relay.`
          );

          setStartWebSocket((prev) => {
            if (prev) {
              console.log("🚨 WebSocket already started. Skipping...");
              return true; // Don't change state
            }
            console.log(`✅ Attaching to relay.`);
            setInitialGameState({ ...game });
            return true; // Change state to start WebSocket
          });
        } else {
          console.log(`⚠️ Player ${playerId} is not in this game. Ignoring.`);
        }
        break;
      default:
        console.warn(`Unhandled action: ${action}`);
    }
  }, [message, playerId]);

  const handleSelect = (gameId) => {
    console.log(lobbyGames, gameId);
    const selectedGame = lobbyGames.find((game) => game.gameId === gameId);
    console.log("Selected Game:", selectedGame);

    if (selectedGame) {
      // Check the types for debugging
      if (selectedGame.players?.length > 0) {
        console.log(
          "Type of selectedGame.players[0]:",
          typeof selectedGame.players[0],
          selectedGame.players[0]
        );
      }
      console.log("Type of playerId:", typeof playerId, playerId);

      // Check if the current player is in the game's players list
      const isPlayerInGame =
        selectedGame.players?.some((player) => player === String(playerId)) ||
        false;
      console.log("isPlayerInGame", isPlayerInGame);
      // Update states
      setIsJoining(false);
      setHasJoined(isPlayerInGame); // Correctly update hasJoined state
      setSelectedGameId(gameId); // Highlight the selected game
      setSelectedGamestate((prevState) => ({
        ...prevState,
        ...selectedGame,
      }));

      console.log(
        `Selected Game ID: ${gameId}, Player in Game: ${isPlayerInGame}`
      );
    }
  };
  const handleStartGame = () => {
    console.log("Starting game...", selectedGamestate.gameId);
    sendMessage({
      type: "lobby",
      lobbyId: "default",
      action: "startGame",
      payload: {
        // selectedGamestate,
        playerId,
        gameId: selectedGamestate.gameId,
      },
    });
  };

  const handleListGames = () => {
    console.log(`${playerId} listing games...`);
    sendMessage({
      type: "lobby",
      lobbyId: "default",
      action: "refreshLobby",
      payload: {
        playerId,
        gameId: "refreshLobby",
      },
    });
  };

  const handleCreateGame = () => {
    console.log(`${playerId} creating game of type ${selectedGameType}`);
    sendMessage({
      type: "lobby",
      lobbyId: "default",
      action: "createNewGame",
      payload: {
        gameType: selectedGameType, // Include game type
        playerId,
        gameId: "new",
      },
    });
  };

  const handleJoinGame = () => {
    console.log(`${playerId} joining game... ${selectedGamestate.gameId}`);
    setIsJoining(true);
    sendMessage({
      type: "lobby",
      lobbyId: "default",
      action: "joinGame",
      payload: {
        game: "rock-paper-scissors",
        playerId,
        gameId: selectedGamestate.gameId,
      },
    });
  };

  return (
    <div className="lobby">
      <div className="selectedGameState">
        <h2>Selected Game State</h2>
        <pre>{JSON.stringify(selectedGamestate, null, 2)}</pre>
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
      <select
        value={selectedGameType}
        onChange={(e) => setSelectedGameType(e.target.value)}
      >
        <option value="rock-paper-scissors">Rock Paper Scissors</option>
        <option value="odds-and-evens">Odds and Evens</option>
      </select>
      <button onClick={handleCreateGame}>Create Game</button>

      <button onClick={handleListGames}>List Games</button>
      <button
        onClick={handleJoinGame}
        disabled={
          hasJoined ||
          isJoining ||
          lobbyPlayers.length === 0 ||
          !selectedGamestate.gameId ||
          selectedGamestate.players.length >=
            selectedGamestate.instance.maxPlayers
        }
      >
        {/* {console.log({
          hasJoined,
          isJoining,
          lobbyPlayersLength: lobbyPlayers.length,
          gameId: selectedGamestate.gameId,
        })} */}
        {hasJoined
          ? "Joined" // If the player has joined
          : isJoining
          ? "Joining..." // If the player is in the process of joining
          : "Join Game"}{" "}
      </button>

      {hasJoined &&
        selectedGameId &&
        (selectedGamestate.status === "canStart" ||
          selectedGamestate.status === "readyToStart") && (
          <button
            onClick={handleStartGame}
            disabled={
              Object.keys(
                lobbyGames.find((game) => game.gameId === selectedGameId)
                  ?.players || {}
              ).length < 2 // Disable if less than 2 players
            }
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
                  : "not-allowed", // Pointer for clickable, not-allowed otherwise
            }}
          >
            {Object.keys(
              lobbyGames.find((game) => game.gameId === selectedGameId)
                ?.players || {}
            ).length >= 2
              ? "Start Game" // Show "Start Game" if 2+ players
              : "Waiting for Players"}{" "}
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
