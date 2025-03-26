import React, { useState, useEffect, useRef, useCallback } from "react";
import Player from "./components/Player";
import Dashboard from "./components/Dashboard";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import ErrorBoundary from "./ErrorBoundary";
import Lobby from "./components/Lobby";
import GameConsole from "./components/GameConsole";
import WebSocketManager from "./components/WebSocketManager";
import { JsonView } from "react-json-view-lite";
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
  const [playerId, setPlayerId] = useState(null); // Only open WebSocket after this is set
  const [gamesToInit, setGamesToInit] = useState([]);
  const [messages, setMessages] = useState({});
  const [sendMessageToUrl, setSendMessageToUrl] = useState(() => () => {}); // ✅ State to hold the sendMessageToUrl funct
  const [lobbiesLoggedIn, setLobbiesLoggedIn] = useState(false);
  const connectionsRef = useRef(new Map());
  const [addRelayConnections, setAddRelayConnections] = useState([]);
  const [gameMessages, setGameMessages] = useState({});
  const [lobbyMessages, setLobbyMessages] = useState({});
  const [connections, setConnections] = useState(new Map());

  useEffect(() => {
    if (!playerId) {
      console.warn("⚠️ Player ID not set. Skipping URL setup...");
      return;
    }
    console.log("✅ Setting lobby and game URLs...");
    const initialLobbyUrls = [
      { id: "defaultLobby1", url: "ws://localhost:8080", type: "lobby" },
    ];
    console.log("🔧 Cleaning up old WebSocket connections on load...");

    if (addRelayConnections.length === 0) {
      setAddRelayConnections(initialLobbyUrls);
      console.log("🔗 Initial URLs set:", initialLobbyUrls);
    } else {
      console.log("⚠️ URLs already set, skipping initialization.");
    }
    //}
  }, [playerId]);

  useEffect(() => {
    console.log("🔥 App.jsx Re-Rendered!");
  });

  const handleSendMessage = (id, message) => {
    if (sendMessageToUrl) {
      console.log(`🚀 Sending message to ${id}:`, message);
      message.uuid = uuidv4();
      let connection = connectionsRef.current.get(id);
      console.log("connection", connection);
      connection.sendJsonMessage(message);
    } else {
      console.warn(`⚠️ No sendMessage function available for ${id}`);
    }
  };
  const handleMessage = (id, message) => {
    console.log(`📩 Received from ${id}:`, message);
    setMessages((prev) => ({
      ...prev,
      [id]: [...(prev[id] || []), message],
    }));

    if (message.type === "lobby") {
      setLobbyMessages((prev) => ({
        ...prev,
        [id]: [...(prev[id] || []), message],
      }));
      return;
    }

    if (message.type === "game") {
      console.log("🎰 Received lobby message:", message);
      setGameMessages((prev) => ({
        ...prev,
        [id]: [...(prev[id] || []), message],
      }));
      return;
    }

    console.warn(`⚠️ Unknown message type received from ${id}:`, message);
  };

  useEffect(() => {
    console.log("All messages", messages);
  }, [messages]);

  return (
    <ErrorBoundary>
      <div className="container mt-5">
        <div>
          {addRelayConnections && addRelayConnections.length > 0 ? (
            <>
              <h1>Game App with Dynamic WebSockets</h1>
              <WebSocketManager
                addRelayConnections={addRelayConnections}
                onMessage={handleMessage}
                setSendMessage={setSendMessageToUrl}
                setRelayStates={setRelayStates}
                setConnections={setConnections}
              />
              <button
                onClick={() =>
                  handleSendMessage("ws://localhost:8080", {
                    action: "login",
                    playerId,
                  })
                }
              >
                Send Login Message
              </button>
            </>
          ) : (
            <p>No initial URLs provided.</p>
          )}

          <div>
            {Object.keys(messages).map((id, index) => (
              <div key={index}>
                <h3>Messages from {id}:</h3>
                {messages[id].map((msg, index) => (
                  <JsonView
                    data={msg}
                    key={index}
                    shouldExpandNode={(level) => level === 0}
                    style={{ fontSize: "14px", lineHeight: "1.2" }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <h1>Game App</h1>
        {/* Generate playerId in Player component */}
        <Player setPlayerId={setPlayerId} />
        {playerId && <Dashboard playerName="Player" playerId={playerId} />}
        {Array.from(connections.entries())
          .filter(([id, connection]) => connection.type === "lobby")
          .map(([id, connection], index) => (
            <Lobby
              key={index}
              playerId={playerId}
              startGameRelays={handleStartGameRelays}
              sendMessage={(msg) => handleSendMessage(id, msg)}
              message={Object.values(lobbyMessages).flat().slice(-1)[0] || {}}
              connectionUrl={connection.url}
            />
          ))}
        {connections.size === 0 && <p>Lobby not started...</p>}

        {/* {!startGameConsole ? (
          <p>Game Console Not Started...</p>
        ) : ( */}
        <GameConsole
          playerId={playerId}
          message={Object.values(gameMessages).flat().slice(-1)[0] || {}}
          sendGameMessage={(id, msg) => handleSendMessage(id, msg)}
          initialGameState={initialGameState}
          sendLobbyMessage={(id, msg) => handleSendMessage(id, msg)}
          gamesToInit={gamesToInit}
          lobbyUrl={"ws://localhost:8080"}
          gameRelaysReady={gameRelaysReady}
          connections={
            new Map(
              Array.from(connections.entries()).filter(
                ([id, connection]) => connection.type === "game"
              )
            )
          }
        />
        {/* )} */}
        {/* <Chat messages={messages} sendMessage={sendMessage} playerId={playerId} /> */}
      </div>
    </ErrorBoundary>
  );
};

export default App;
