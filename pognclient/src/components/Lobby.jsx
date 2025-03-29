import React, { useState, useEffect, useRef } from "react";
import "./css/lobby.css";
import { JsonView } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";

const Lobby = ({
  playerId,
  sendMessage,
  message,
  setGamesToInit,
  lobbyId,
  setRemoveRelayConnections,
  lobbyConnections,
}) => {
  const [signedIntoLobby, setSignedIntoLobby] = useState(false);
  const [lobbyGames, setLobbyGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [hasJoined, setHasJoined] = useState(false); // Track if the player has joined the game
  const [isJoining, setIsJoining] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState("odds-and-evens");
  const [selectedGamestate, setSelectedGamestate] = useState({
    players: [],
    lobbyStatus: "ready-to-join",
    maxPlayers: 0,
    minPlayers: 0,
    gameAction: "",
    gameId: "",
  });
  const [lobbyPlayers, setLobbyPlayers] = useState([]);
  const [lobbyMessagesReceived, setLobbyMessagesReceived] = useState([]);

  useEffect(() => {
    if (!signedIntoLobby) {
      const connection = lobbyConnections.get(lobbyId);
      console.log("Connection", connection);
      if (connection?.readyState === 1) {
        console.log(
          `✅ Lobby ${lobbyId} connection established. Sending login...`
        );
        sendMessage({
          payload: {
            type: "lobby",
            action: "login",
            lobbyId: lobbyId,
            playerId,
          },
        });
        setSignedIntoLobby(true);
      } else {
        console.warn(`❌ Lobby ${lobbyId} connection not ready yet.`);
      }
    }
  }, [signedIntoLobby]);

  useEffect(() => {
    console.log("Lobby Message Received by Lobby");
    if (!message || Object.keys(message).length === 0) {
      console.warn("Invalid message object:", message);
      return;
    }
    setLobbyMessagesReceived((prev) => [...prev, message]);

    console.log("Processing Lobby message:", message);
    const { payload } = message;
    if (!payload) {
      console.warn("No payload in message:", message);
      return; // ✅ Return early
    }
    const { type, action } = payload;
    if (type !== "lobby") {
      console.warn("Message sent to lobby not of type lobby:", type);
      return; // ✅ Return early
    }
    if (!action) {
      console.warn("No action in payload:", payload);
      return; // ✅ Return early
    }
    const gameId = payload?.gameId;
    //const playerId = payload?.playerId;
    // const lobbyId = payload?.lobbyId;
    if (playerId !== payload?.playerId) {
      console.warn("PlayerId mismatch:", playerId, payload?.playerId);
    }
    if (lobbyId !== payload?.lobbyId) {
      console.warn("LobbyId mismatch:", lobbyId, payload?.lobbyId);
    }

    console.log(
      "LobbyId",
      lobbyId,
      "PlayerId",
      playerId,
      "GameId",
      gameId,
      "Action",
      action,
      "Payload",
      payload
    );
    if ((!gameId, !playerId, !lobbyId)) {
      console.warn("Missing gameId, playerId, or lobbyId in payload:", payload);
      return; // ✅ Return early
    }

    switch (action) {
      case "refreshLobby":
        console.log("Game list received:", payload);
        setLobbyGames(payload.lobbyGames || []);
        setLobbyPlayers(payload.lobbyPlayers || []);
        console.log("selectedGameId", selectedGameId);
        // const playerGames = payload.lobbyGames.filter((game) =>
        //   game.players?.some((player) => player === playerId)
        // );
        //lobbyGames has an array of games, each game has an array of players
        const playerGames = payload.lobbyGames.filter((game) =>
          game.players?.includes(playerId)
        );

        console.log("playerGames", playerGames);

        if (playerGames.length > 0) {
          console.log("Player is in a valid game:", playerGames);
          console.log(playerGames);
          // setGamesToInit((prev) => [...prev, ...playerGames]);
          //gamestoinit is a map now set the games with the lobby id
          console.log(
            "Setting games to init:",
            playerGames,
            "For lobbyId:",
            lobbyId
          );
          setGamesToInit((prev) => {
            const updatedMap = new Map(prev);
            updatedMap.set(lobbyId, playerGames);
            return updatedMap;
          });
          // const gameId = playerGames[0].gameId; // Get the first gameId from the filtered games
          // setSelectedGameId(gameId); // Highlight the selected game
          // setSelectedGamestate((prevState) => ({
          //   ...prevState,
          //   ...playerGames[0],
          // }));
        } else {
          console.log("Player is not in any valid game. Staying in the lobby.");
          setSelectedGameId(null);
          setHasJoined(false);
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
      if (selectedGame.players?.length > 0) {
        console.log(
          "Type of selectedGame.players[0]:",
          typeof selectedGame.players[0],
          selectedGame.players[0]
        );
      }
      console.log("Type of playerId:", typeof playerId, playerId);

      const isPlayerInGame =
        Array.isArray(selectedGame.players) &&
        selectedGame.players.includes(String(playerId));

      console.log("isPlayerInGame", isPlayerInGame);
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
      payload: {
        type: "lobby",
        lobbyId: lobbyId,
        action: "startGame",
        playerId,
        gameId: selectedGamestate.gameId,
      },
    });
  };

  const handleListGames = () => {
    console.log(`${playerId} listing games...`);
    sendMessage({
      payload: {
        type: "lobby",
        lobbyId: lobbyId,
        action: "refreshLobby",
        playerId,
      },
    });
  };

  const handleCreateGame = () => {
    console.log(`${playerId} creating game of type ${selectedGameType}`);
    sendMessage({
      payload: {
        type: "lobby",
        lobbyId: lobbyId,
        action: "createNewGame",
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
      payload: {
        type: "lobby",
        lobbyId: lobbyId,
        action: "joinGame",
        game: "rock-paper-scissors",
        playerId,
        gameId: selectedGamestate.gameId,
      },
    });
  };

  const connectionState = lobbyConnections.get(lobbyId)?.readyState;
  console.log(lobbyConnections);
  console.log("Connection state:", connectionState);
  const connectionColor =
    connectionState === 1 ? "green" : connectionState === 3 ? "red" : "yellow";
  console.log("Connection color:", connectionColor);

  const connectionTitle =
    connectionState === 1
      ? "Connected"
      : connectionState === 0
      ? "Connecting..."
      : connectionState === 2
      ? "Closing..."
      : "Disconnected";
  console.log("Connection title:", connectionTitle);

  return (
    <div className="lobby">
      <div
        key={lobbyId}
        style={{
          marginBottom: "20px",
          padding: "10px",
          border: "1px solid #ccc",
        }}
      >
        <h5>Lobby ID: {lobbyId}</h5>
        <div className="d-flex  mb-2">
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              backgroundColor: connectionColor,
              border: "1px solid #333",
            }}
            title={connectionTitle}
          ></div>
          <div style={{ marginLeft: "10px" }}>
            <p> {connectionTitle}</p>
          </div>
        </div>
      </div>
      <div>
        <h5>Lobby Messages Received</h5>
        <JsonView
          data={lobbyMessagesReceived}
          shouldExpandNode={(level, value, field) => {
            if (level === 0) return true; // Expand root
            if (
              level === 1 &&
              Array.isArray(lobbyMessagesReceived) &&
              lobbyMessagesReceived.length > 0 &&
              value === lobbyMessagesReceived[lobbyMessagesReceived.length - 1]
            ) {
              return true; // Expand first level of last message
            }
            return false;
          }}
          style={{ fontSize: "14px", lineHeight: "1.2" }}
        />
      </div>
      <div className="selectedGameState">
        <h5>Selected Game State</h5>
        <JsonView
          data={selectedGamestate}
          shouldExpandNode={(level) => level === 0} // Expand only the first level
          style={{ fontSize: "14px", lineHeight: "1.2" }}
        />
      </div>
      <h5>LobbyId: {lobbyId}</h5>
      <p>Players in Lobby: {lobbyPlayers.length}</p>
      <ul>
        {lobbyPlayers.length > 0 ? (
          lobbyPlayers.map((player, index) => (
            <li key={index}>
              <strong>Player {index + 1}:</strong> {player}
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
        {hasJoined
          ? "Joined" // If the player has joined
          : isJoining
          ? "Joining..." // If the player is in the process of joining
          : "Join Game"}{" "}
      </button>

      {hasJoined &&
        selectedGameId &&
        (selectedGamestate.lobbyStatus === "canStart" ||
          selectedGamestate.lobbyStatus === "readyToStart") && (
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
                  {game.players?.includes(playerId) && (
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
