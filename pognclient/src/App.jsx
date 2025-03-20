import React, { useState, useEffect, useMemo, useCallback } from "react";
import useWebSocket from "react-use-websocket";
import Player from "./components/Player";
import Dashboard from "./components/Dashboard";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import ErrorBoundary from "./ErrorBoundary";
import Lobby from "./components/Lobby";
import GameConsole from "./components/GameConsole";
import { v4 as uuidv4 } from "uuid";

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
  const [startWebSocket, setStartWebSocket] = useState(false);
  const [initialGameState, setInitialGameState] = useState({});
  const [lobbyMessageHistory, setLobbyMessageHistory] = useState([]);
  const [gameMessageHistory, setGameMessageHistory] = useState([]);

  useEffect(() => {
    if (startWebSocket) {
      console.log("🕐 Waiting before connecting to game WebSocket...");
      setTimeout(() => {
        console.log("✅ Now connecting to Game WebSocket...");
        setStartGameConsole(true);
      }, 3000); // 🔥 Give the server 3 seconds before attempting connection
    }
  }, [startWebSocket]);

  const {
    sendJsonMessage: originalSendLobbyMessage,
    lastJsonMessage: lastLobbyMessage,
  } = useWebSocket(
    useMemo(() => (playerId ? "ws://localhost:8080" : null), [playerId]),
    {
      onOpen: () => {
        console.log("🔵 Lobby WebSocket opened for playerId;", playerId);
        handleLobbyWebSocketOpen();
      },
      //onMessage: (event) => handleWebSocketMessageRef.current(event);
      onClose: () => {
        console.log("🔴 Lobby WebSocket closed.");
      },
    }
  );

  // ✅ Memoized game WebSocket (Only re-runs when `startWebSocket` changes)
  const {
    sendJsonMessage: originalSendGameMessage,
    lastJsonMessage: lastGameMessage,
  } = useWebSocket(
    useMemo(
      () => (startWebSocket ? "ws://localhost:9000" : null),
      [startWebSocket]
    ),
    {
      onOpen: () => {
        console.log("🔵 Game WebSocket opened.");
      },

      onClose: (event) => {
        setStartWebSocket(false);
        console.log("🔴 Game WebSocket closed.", event);
        if (event.wasClean) {
          console.log("💡 WebSocket closed cleanly, resetting game state.");
        } else {
          console.warn(
            "⚠️ Unexpected WebSocket closure, preventing unnecessary resets."
          );
        }
      },
    }
  );
  useEffect(() => {
    if (lastLobbyMessage !== null) {
      //check if type not lobby or has no action or no payload
      setLobbyMessageHistory((prev) => prev.concat(lastLobbyMessage));
      console.log("Added message to lobbyMessageHistory", lobbyMessageHistory);
      if (
        !lastLobbyMessage.type ||
        lastLobbyMessage.type !== "lobby" ||
        !lastLobbyMessage.action ||
        !lastLobbyMessage.payload
      ) {
        console.warn("⚠️ Skipping empty or invalid message:", lastLobbyMessage);
        return;
      }
      console.log("Sending Lobby message:", lastLobbyMessage);
      setLobbyMessage(lastLobbyMessage);
    }
  }, [lastLobbyMessage]);

  useEffect(() => {
    if (lastGameMessage !== null) {
      setGameMessageHistory((prev) => prev.concat(lastGameMessage));
      console.log("Added message to gameMessageHistory", gameMessageHistory);
      if (
        !lastGameMessage.type ||
        lastGameMessage.type !== "game" ||
        !lastGameMessage.action ||
        !lastGameMessage.payload
      ) {
        console.warn("⚠️ Skipping empty or invalid message:", lastGameMessage);
        return;
      }
      console.log("Sending Game message:", lastGameMessage);
      setGameMessage(lastGameMessage);
    }
  }, [lastGameMessage]);

  // Wrap sendJsonMessage to add a UUID
  const sendLobbyMessage = (message) => {
    if (!message) return;

    //make sure they have type as lobby and action and payload
    if (
      !message.type ||
      message.type !== "lobby" ||
      !message.action ||
      !message.payload
    ) {
      console.error("⚠️ Invalid lobby message:", message);
      return;
    }

    const messageWithUUID = {
      ...message,
      uuid: uuidv4(), // 🔥 Generate a new UUID for each message
    };

    console.log("📤 Sending lobby message with UUID:", messageWithUUID);
    originalSendLobbyMessage(messageWithUUID);
  };

  const sendGameMessage = (message) => {
    if (!message) return;

    //make sure they have type as game and action and payload
    if (
      !message.type ||
      message.type !== "game" ||
      !message.action ||
      !message.payload
    ) {
      console.error("⚠️ Invalid game message:", message);
      return;
    }

    const messageWithUUID = {
      ...message,
      uuid: uuidv4(), // 🔥 Generate a new UUID for each message
    };

    console.log("📤 Sending game message with UUID:", messageWithUUID);
    originalSendGameMessage(messageWithUUID);
  };

  const handleLobbyWebSocketOpen = useCallback(() => {
    console.log("logging in...");
    if (playerId) {
      const loginMessage = {
        type: "lobby",
        action: "login",
        payload: { playerId },
      };
      console.log("📤 Sending login message:", loginMessage);
      //  sendLobbyMessageRef.current(loginMessage); // ✅ Use react-use-websocket's `sendMessage`
      sendLobbyMessage(loginMessage);
    } else {
      console.warn("⚠️ playerId is not set. Unable to send login message.");
    }
  }, [playerId, sendLobbyMessage]);

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
        {lastLobbyMessage && (
          <Lobby
            sendMessage={sendLobbyMessage}
            message={lobbyMessage}
            playerId={playerId}
            setStartWebSocket={setStartWebSocket}
            setInitialGameState={setInitialGameState}
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
            setStartWebSocket={setStartWebSocket}
          />
        )}
        {/* <Chat messages={messages} sendMessage={sendMessage} playerId={playerId} /> */}
      </div>
    </ErrorBoundary>
  );
};

export default App;
