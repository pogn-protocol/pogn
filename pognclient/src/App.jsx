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
  const [playerId, setPlayerId] = useState(null);
  const [gamesToInit, setGamesToInit] = useState([]);
  const [messages, setMessages] = useState({});
  const [sendMessageToUrl, setSendMessageToUrl] = useState(() => () => {});
  const [addRelayConnections, setAddRelayConnections] = useState([]);
  const [gameMessages, setGameMessages] = useState({});
  const [lobbyMessages, setLobbyMessages] = useState({});
  const [connections, setConnections] = useState(new Map());
  const [removeRelayConnections, setRemoveRelayConnections] = useState([]);
  const [lobbiesInitialized, setLobbiesInitialized] = useState(false);

  useEffect(() => {
    if (lobbiesInitialized) {
      console.warn("⚠️ Lobbies already initialized. Skipping URL setup...");
      return;
    }
    if (!playerId) {
      console.warn("⚠️ Player ID not set. Skipping URL setup...");
      return;
    }

    console.log("✅ Setting lobby and game URLs...");
    const initialLobbyUrls = [
      { id: "lobby1", url: "ws://localhost:8080", type: "lobby" },
      { id: "lobby2", url: "ws://localhost:8081", type: "lobby" },
    ];
    console.log("🔧 Cleaning up old WebSocket connections on load...");

    setAddRelayConnections(initialLobbyUrls);
    setLobbiesInitialized(true);
  }, [lobbiesInitialized, playerId]);

  useEffect(() => {
    console.log("🔥 App.jsx Re-Rendered!");
  });

  const handleSendMessage = (id, message) => {
    console.log("handleSendMessage", id, message);
    const connection = connections.get(id);
    console.log("connection", connection);
    if (!connection) {
      console.warn(`⚠️ Connection ${id} not found`);
      return;
    }
    if (connection.readyState !== 1) {
      console.warn(`⚠️ Connection ${id} not ready`);
      return;
    }
    message.uuid = uuidv4();
    message.relayId = id;
    console.log(
      `🚀 Sending message to ${id} with UUID ${message.uuid}`,
      message
    );
    sendMessageToUrl(id, message);
  };

  const handleMessage = (id, message) => {
    console.log(`📩 Received from ${id}:`, message);
    if (message.uuid) {
      console.warn("Message UUID:", message.uuid);
    }
    console.log("Message UUID:", message.uuid);
    if (!message) {
      console.warn("⚠️ No message received");
      return;
    }
    if (message.error) {
      console.error("⚠️ Error in message:", message.error);
      return;
    }
    setMessages((prev) => ({
      ...prev,
      [id]: [...(prev[id] || []), message],
    }));
    console.log(messages);
    if (message.type === "lobby") {
      const lobbyId = message.payload.lobbyId;
      if (!lobbyId || lobbyId === undefined) {
        console.warn("⚠️ Lobby ID not found in message payload");
      }
      console.log("🎰 Setting Lobby Message lobbyId:", lobbyId, message);
      setLobbyMessages((prev) => {
        const newMessages = {
          ...prev,
          [lobbyId]: [...(prev[lobbyId] || []), message],
        };
        console.log("Updated lobbyMessages", newMessages);
        return newMessages;
      });
      console.log(lobbyMessages);
      return;
    }

    if (message.payload === "game") {
      const gameId = message.payload.gameId;
      if (!gameId || gameId === undefined) {
        console.warn("⚠️ Game ID not found in message payload");
      }
      console.log("🎰 Setting Game Message gameId:", gameId, message);
      setGameMessages((prev) => ({
        ...prev,
        [gameId]: [...(prev[gameId] || []), message],
      }));
      console.log(gameMessages);
      return;
    }

    console.warn(`⚠️ Unknown message type received from ${id}:`, message);
  };

  useEffect(() => {
    console.log("All messages", messages);
  }, [messages]);

  useEffect(() => {
    console.log("Connections set", connections);
  }, [connections]);

  return (
    <ErrorBoundary>
      <div className="container mt-5">
        <Player setPlayerId={setPlayerId} />
        {playerId && <Dashboard playerName="Player" playerId={playerId} />}
        <div>
          {addRelayConnections && addRelayConnections.length > 0 ? (
            <>
              <h3 className="mt-3">Connections:</h3>
              <WebSocketManager
                addRelayConnections={addRelayConnections}
                onMessage={handleMessage}
                setSendMessage={setSendMessageToUrl}
                setConnections={setConnections}
                connections={connections}
                removeRelayConnections={removeRelayConnections}
              />
            </>
          ) : (
            <p>No connections open...</p>
          )}
        </div>

        {Array.from(connections.entries())
          .filter(
            ([id, connection]) =>
              connection.type === "lobby" && connection.readyState === 1
          )
          .map(([id, connection], index) => {
            console.log("🔍 Checking lobby connection:", id, connection);
            console.log("🔍 Checking lobby message:", lobbyMessages[id]);
            return (
              <Lobby
                key={index}
                lobbyId={id}
                playerId={playerId}
                sendMessage={(msg) => handleSendMessage(id, msg)}
                message={lobbyMessages[id]?.slice(-1)[0] || {}} // Use string key here just to be sure
                connectionUrl={connection.url}
                setGamesToInit={setGamesToInit}
                lobbyConnections={connections}
                setRemoveRelayConnections={setRemoveRelayConnections}
              />
            );
          })}

        {connections.size === 0 && <p>Lobby not started...</p>}
        <GameConsole
          playerId={playerId}
          message={Object.values(gameMessages).flat().slice(-1)[0] || {}}
          sendGameMessage={(id, msg) => handleSendMessage(id, msg)}
          sendLobbyMessage={(id, msg) => handleSendMessage(id, msg)}
          gamesToInit={gamesToInit}
          lobbyUrl={"ws://localhost:8080"}
          gameConnections={
            new Map(
              Array.from(connections.entries()).filter(
                ([id, connection]) => connection.type === "game"
              )
            )
          }
          setAddRelayConnections={setAddRelayConnections}
          setGamesToInit={setGamesToInit}
          gameMessages={gameMessages}
        />
        <div className=" mt-3">
          {/* Render Lobby Messages */}
          {Object.keys(lobbyMessages)
            .sort()
            .map((id, index) => (
              <div key={index}>
                <h3>Lobby Messages from {id}:</h3>

                {lobbyMessages[id].length > 1 && (
                  <details style={{ marginBottom: "8px" }}>
                    <summary>
                      Previous Messages ({lobbyMessages[id].length - 1})
                    </summary>
                    {lobbyMessages[id].slice(0, -1).map((msg, msgIndex) => (
                      <JsonView
                        data={msg}
                        key={`prev-lobby-${id}-${msgIndex}`}
                        shouldExpandNode={() => false} // Always collapsed
                        style={{ fontSize: "14px", lineHeight: "1.2" }}
                      />
                    ))}
                  </details>
                )}

                {/* Last message displayed open */}
                {lobbyMessages[id].slice(-1).map((msg, msgIndex) => (
                  <JsonView
                    data={msg}
                    key={`last-lobby-${id}-${msgIndex}`}
                    shouldExpandNode={(level) => level === 0} // Only expand the first level of the latest message
                    style={{ fontSize: "14px", lineHeight: "1.2" }}
                  />
                ))}
              </div>
            ))}
          {/* Render Game Messages */}
          {Object.keys(gameMessages)
            .sort()
            .map((id, index) => (
              <div key={index}>
                <h3>Game Messages from {id}:</h3>

                {gameMessages[id].length > 1 && (
                  <details style={{ marginBottom: "8px" }}>
                    <summary>
                      Previous Messages ({gameMessages[id].length - 1})
                    </summary>
                    {gameMessages[id].slice(0, -1).map((msg, msgIndex) => (
                      <JsonView
                        data={msg}
                        key={`prev-game-${id}-${msgIndex}`}
                        shouldExpandNode={() => false} // Always collapsed
                        style={{ fontSize: "14px", lineHeight: "1.2" }}
                      />
                    ))}
                  </details>
                )}

                {/* Last message displayed open */}
                {gameMessages[id].slice(-1).map((msg, msgIndex) => (
                  <JsonView
                    data={msg}
                    key={`last-game-${id}-${msgIndex}`}
                    shouldExpandNode={(level) => level === 0} // Only expand the first level of the latest message
                    style={{ fontSize: "14px", lineHeight: "1.2" }}
                  />
                ))}
              </div>
            ))}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;
