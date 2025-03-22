import React, { useState, useEffect, useMemo, useCallback } from "react";
import Player from "./components/Player";
import Dashboard from "./components/Dashboard";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import ErrorBoundary from "./ErrorBoundary";
import Lobby from "./components/Lobby";
import GameConsole from "./components/GameConsole";
import useWebSockets from "./components/hooks/webSockets";
import ConnectionInterface from "./components/ConnectionInterface";

window.onerror = function (message, source, lineno, colno, error) {
  console.error(
    "🚨 Global Error Caught:",
    message,
    "at",
    source,
    ":",
    lineno,
    ":",
    colno,
    error
  );
};

window.addEventListener("unhandledrejection", function (event) {
  console.error("🚨 Unhandled Promise Rejection:", event.reason);
});

const App = () => {
  const [lobbyMessage, setLobbyMessage] = useState(null);
  const [gameMessage, setGameMessage] = useState(null);
  const [playerId, setPlayerId] = useState(null); // Only open WebSocket after this is set
  const [startGameConsole, setStartGameConsole] = useState(false);
  const [startGameWebSocket, setStartGameWebSocket] = useState(false);
  const [initialGameState, setInitialGameState] = useState({});
  const [playerGames, setPlayerGames] = useState([]);
  const [lobbyWebSocketOpen, setLobbyWebSocketOpen] = useState(false);

  useEffect(() => {
    if (startGameWebSocket) {
      console.log("🕐 Waiting before connecting to game WebSocket...");
      setTimeout(() => {
        console.log("✅ Now connecting to Game WebSocket...");
        setStartGameConsole(true);
      }, 3000); // 🔥 Give the server 3 seconds before attempting connection
    }
  }, [startGameWebSocket]);

  const {
    sendLobbyMessage,
    sendGameMessage,
    connect,
    disconnect,
    updateUrl,
    lobbyStatus,
    gameStatus,
  } = useWebSockets(
    playerId,
    startGameWebSocket,
    "ws://localhost:8080",
    "ws://localhost:9000",
    setLobbyWebSocketOpen,
    setStartGameWebSocket,
    setStartGameConsole,
    setLobbyMessage,
    setGameMessage
  );

  useEffect(() => {
    console.log("logging in...");

    if (playerId && lobbyWebSocketOpen) {
      const loginMessage = {
        type: "lobby",
        action: "login",
        payload: { playerId },
      };
      console.log("📤 Sending login message:", loginMessage);
      sendLobbyMessage(loginMessage);
    } else {
      console.warn("⚠️ playerId is not set. Unable to send login message.");
    }
  }, [playerId, lobbyWebSocketOpen]);

  useEffect(() => {
    console.log("🔥 App.jsx Re-Rendered!");
  });

  return (
    <ErrorBoundary>
      <div className="container mt-5">
        <h1>Game App</h1>
        {/* Generate playerId in Player component */}
        <Player setPlayerId={setPlayerId} />
        {playerId && <Dashboard playerName="Player" playerId={playerId} />}
        <ConnectionInterface
          connect={connect}
          disconnect={disconnect}
          updateUrl={updateUrl}
          lobbyStatus={lobbyStatus}
          gameStatus={gameStatus}
        />
        {lobbyMessage && (
          <Lobby
            sendMessage={sendLobbyMessage}
            message={lobbyMessage}
            playerId={playerId}
            setStartGameWebSocket={setStartGameWebSocket}
            setInitialGameState={setInitialGameState}
            setPlayerGames={setPlayerGames}
            setStartGameConsole={setStartGameConsole}
          />
        )}

        {!startGameConsole ? (
          <p>Waiting for game to start...</p>
        ) : (
          <GameConsole
            playerId={playerId}
            message={gameMessage}
            sendGameMessage={sendGameMessage}
            initialGameState={initialGameState}
            setStartGameConsole={setStartGameConsole}
            sendLobbyMessage={sendLobbyMessage}
            setStartGameWebSocket={setStartGameWebSocket}
            playerGames={playerGames}
          />
        )}
        {/* <Chat messages={messages} sendMessage={sendMessage} playerId={playerId} /> */}
      </div>
    </ErrorBoundary>
  );
};

export default App;
