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
  const [gamesToInit, setGamesToInit] = useState(new Map());
  const [messages, setMessages] = useState({});
  const [sendMessageToUrl, setSendMessageToUrl] = useState(() => () => {});
  const [addRelayConnections, setAddRelayConnections] = useState([]);
  const [gameMessages, setGameMessages] = useState({});
  const [lobbyMessages, setLobbyMessages] = useState({});
  const [connections, setConnections] = useState(new Map());
  const [removeRelayConnections, setRemoveRelayConnections] = useState([]);
  const [lobbyConnectionsInit, setLobbyConnectionsInit] = useState(false);
  const [selectedLobbyId, setSelectedLobbyId] = useState(null);

  useEffect(() => {
    if (lobbyConnectionsInit) {
      console.warn(
        "⚠️ Already connected to lobbies. Skipping lobby connecting..."
      );
      return;
    }
    if (!playerId) {
      console.warn("⚠️ Player ID not set. Skipping lobby connecting...");
      return;
    }

    console.log("✅ Setting lobby and game URLs...");
    const initialLobbyUrls = [
      { id: "lobby1", url: "ws://localhost:8080", type: "lobby" },
      { id: "lobby2", url: "ws://localhost:8081", type: "lobby" },
    ];
    console.log("🔧 Cleaning up old WebSocket connections on load...");

    setAddRelayConnections(initialLobbyUrls);
    setLobbyConnectionsInit(initialLobbyUrls);
  }, [lobbyConnectionsInit, playerId]);

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
    message.payload.player = playerId;
    console.log(
      `🚀 Sending message to ${id} with UUID ${message.uuid}`,
      message
    );
    sendMessageToUrl(id, message);
  };

  const handleMessage = (id, message) => {
    if (!message) {
      console.warn("⚠️ No message received");
      return;
    }

    console.log(`📩 Received from ${id}:`, message);
    if (message.error) {
      console.error(
        `⚠️ Error Recieved from relay ${message.relayId}: `,
        message.error
      );
      return;
    }
    if (!message.payload) {
      console.warn("⚠️ Missing payload in message");
      return;
    }

    if (!message.uuid) {
      console.warn("Message UUID:", message.uuid);
    }
    console.log("Message UUID:", message.uuid);
    if (message.error) {
      console.error("⚠️ Error in message:", message.error);
      return;
    }
    setMessages((prev) => ({
      ...prev,
      [id]: [...(prev[id] || []), message],
    }));
    if (message.payload.type === "lobby") {
      const lobbyId = message.payload.lobbyId;
      if (!lobbyId || lobbyId === undefined) {
        console.warn("⚠️ Lobby ID not found in message payload");
      }
      console.log("🎰 Setting Lobby Message lobbyId:", lobbyId, message);

      setLobbyMessages((prev) => {
        // Check if the new message is identical to the last message
        const existingMessages = prev[lobbyId] || [];
        const lastMessage = existingMessages[existingMessages.length - 1];

        if (lastMessage?.uuid === message.uuid) {
          console.warn(`⚠️ Duplicate UUID message for lobby ${lobbyId}`);
          return prev;
        }

        return {
          ...prev,
          [lobbyId]: [...existingMessages, message],
        };
      });
      console.log(lobbyMessages);
      return;
    }

    if (message.payload.type === "game") {
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

  useEffect(() => {
    if (!selectedLobbyId) {
      const firstLobbyId = Array.from(connections.entries()).filter(
        ([_, conn]) => conn.type === "lobby"
      )[0]?.[0];
      if (firstLobbyId) {
        setSelectedLobbyId(firstLobbyId);
      }
    }
  }, [connections, selectedLobbyId]);

  // useEffect(() => {
  //   const newGameConnections = [];

  //   gamesToInit.forEach((games, lobbyId) => {
  //     games.forEach((game) => {
  //       if (game.relayId && !connections.has(game.relayId)) {
  //         newGameConnections.push({
  //           id: game.relayId,
  //           url: game.relayUrl, // Assuming `relayUrl` is provided in the game
  //           type: "game",
  //         });
  //       }
  //     });
  //   });

  //   if (newGameConnections.length > 0) {
  //     console.log("🎮 Adding new game connections:", newGameConnections);
  //     setAddRelayConnections((prev) => [...prev, ...newGameConnections]);
  //   }
  // }, [gamesToInit, connections]);

  const connectedLobbies = Array.from(connections.entries()).filter(
    ([_, conn]) => conn.type === "lobby" && conn.readyState === 1
  );

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
                setRemoveRelayConnections={setRemoveRelayConnections}
              />
            </>
          ) : (
            <p>No connections open...</p>
          )}
        </div>

        <div className="col-md-12">
          <h4>Select a Lobby:</h4>

          {/* Lobby selector buttons */}
          <div
            className="border p-2 rounded mb-3"
            style={{ maxHeight: "200px", overflowY: "auto" }}
          >
            {connectedLobbies.map(([id]) => (
              <button
                key={id}
                onClick={() => setSelectedLobbyId(id)}
                className={`btn w-100 text-start mb-1 ${
                  selectedLobbyId === id
                    ? "btn-primary"
                    : "btn-outline-secondary"
                }`}
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {id}
              </button>
            ))}
          </div>

          {/* Only render mounted lobbies that are connected */}
          {connectedLobbies.map(([id, conn]) => (
            <div
              key={id}
              style={{ display: selectedLobbyId === id ? "block" : "none" }}
            >
              <Lobby
                lobbyId={id}
                playerId={playerId}
                sendMessage={(msg) => handleSendMessage(id, msg)}
                message={lobbyMessages[id]?.slice(-1)[0] || {}}
                connectionUrl={conn.url}
                setGamesToInit={setGamesToInit}
                lobbyConnections={connections}
                setRemoveRelayConnections={setRemoveRelayConnections}
              />
            </div>
          ))}
        </div>

        {/* <div className="mb-3" style={{ maxHeight: "200px", overflowY: "auto" }}>
          {Array.from(connections.entries())
            .filter(([_, conn]) => conn.type === "lobby")
            .slice(0, 5)
            .map(([id]) => (
              <button
                key={id}
                onClick={() => setSelectedLobbyId(id)}
                className={`btn w-100 text-start mb-1 ${
                  selectedLobbyId === id
                    ? "btn-primary"
                    : "btn-outline-secondary"
                }`}
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {id}
              </button>
            ))}
        </div> */}
        {/* <div className="col-md-12 row">
          <div className="col-md-4">
            <h4>Select a Lobby:</h4>
            <div
              className="border p-2 rounded"
              style={{ maxHeight: "200px", overflowY: "auto" }}
            >
              {Array.from(connections.entries())
                .filter(([_, conn]) => conn.type === "lobby")
                .slice(0, 5)
                .map(([id]) => (
                  <button
                    key={id}
                    onClick={() => setSelectedLobbyId(id)}
                    className={`btn w-100 text-start mb-1 ${
                      selectedLobbyId === id
                        ? "btn-primary"
                        : "btn-outline-secondary"
                    }`}
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {id}
                  </button>
                ))}
            </div>
          </div>

          <div className="col-md-8">
            {selectedLobbyId && connections.has(selectedLobbyId) && (
              <Lobby
                key={selectedLobbyId}
                lobbyId={selectedLobbyId}
                playerId={playerId}
                sendMessage={(msg) => handleSendMessage(selectedLobbyId, msg)}
                message={lobbyMessages[selectedLobbyId]?.slice(-1)[0] || {}}
                connectionUrl={connections.get(selectedLobbyId).url}
                setGamesToInit={setGamesToInit}
                lobbyConnections={connections}
                setRemoveRelayConnections={setRemoveRelayConnections}
              />
            )}
          </div>
        </div> */}
        {/* <div className="col-md-12">
          <h4>Select a Lobby:</h4>
          <div
            className="border p-2 rounded mb-3"
            style={{ maxHeight: "200px", overflowY: "auto" }}
          >
            {Array.from(connections.entries())
              .filter(([_, conn]) => conn.type === "lobby")
              .slice(0, 5)
              .map(([id, conn]) => (
                <div
                  key={id}
                  style={{ display: selectedLobbyId === id ? "block" : "none" }}
                >
                  <Lobby
                    key={id}
                    lobbyId={id}
                    playerId={playerId}
                    sendMessage={(msg) => handleSendMessage(id, msg)}
                    message={lobbyMessages[id]?.slice(-1)[0] || {}}
                    connectionUrl={conn.url}
                    setGamesToInit={setGamesToInit}
                    lobbyConnections={connections}
                    setRemoveRelayConnections={setRemoveRelayConnections}
                  />
                </div>
              ))} */}

        {/* {Array.from(connections.entries())
              .filter(([_, conn]) => conn.type === "lobby")
              .slice(0, 5)
              .map(([id]) => (
                <button
                  key={id}
                  onClick={() => setSelectedLobbyId(id)}
                  className={`btn w-100 text-start mb-1 ${
                    selectedLobbyId === id
                      ? "btn-primary"
                      : "btn-outline-secondary"
                  }`}
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {id}
                </button>
              ))} */}
        {/* </div> */}

        {/* {selectedLobbyId && connections.has(selectedLobbyId) && (
            <Lobby
              key={selectedLobbyId}
              lobbyId={selectedLobbyId}
              playerId={playerId}
              sendMessage={(msg) => handleSendMessage(selectedLobbyId, msg)}
              message={lobbyMessages[selectedLobbyId]?.slice(-1)[0] || {}}
              connectionUrl={connections.get(selectedLobbyId).url}
              setGamesToInit={setGamesToInit}
              lobbyConnections={connections}
              setRemoveRelayConnections={setRemoveRelayConnections}
            />
          )} */}
        {/* </div> */}

        {/* {playerId &&
          Array.from(connections.entries())
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
            })} */}

        {/* <div className="col-md-12">
          <h4>Select a Lobby:</h4>

          <div
            className="border p-2 rounded mb-3"
            style={{ maxHeight: "200px", overflowY: "auto" }}
          > */}
        {/* {Array.from(connections.entries())
              .filter(([_, conn]) => conn.type === "lobby")
              .slice(0, 5)
              .map(([id]) => (
                <button
                  key={id}
                  onClick={() => setSelectedLobbyId(id)}
                  className={`btn w-100 text-start mb-1 ${
                    selectedLobbyId === id
                      ? "btn-primary"
                      : "btn-outline-secondary"
                  }`}
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {id}
                </button>
              ))} */}
        {/* {connectedLobbies.map(([id]) => (
  <button
    key={id}
    onClick={() => setSelectedLobbyId(id)}
    className={`btn w-100 text-start mb-1 ${
      selectedLobbyId === id ? "btn-primary" : "btn-outline-secondary"
    }`}
    style={{
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    }}
  >
    {id}
  </button>
))} */}

        {/* {connectedLobbies.map(([id, conn]) => (
              <div
                key={id}
                style={{ display: selectedLobbyId === id ? "block" : "none" }}
              >
                <Lobby
                  lobbyId={id}
                  playerId={playerId}
                  sendMessage={(msg) => handleSendMessage(id, msg)}
                  message={lobbyMessages[id]?.slice(-1)[0] || {}}
                  connectionUrl={conn.url}
                  setGamesToInit={setGamesToInit}
                  lobbyConnections={connections}
                  setRemoveRelayConnections={setRemoveRelayConnections}
                />
              </div>
            ))}
          </div> */}

        {/* Render all lobbies, but only show the selected one */}
        {/* {Array.from(connections.entries())
            .filter(([_, conn]) => conn.type === "lobby")
            .slice(0, 5)
            .map(([id, conn]) => (
              <div
                key={id}
                style={{ display: selectedLobbyId === id ? "block" : "none" }}
              >
                <Lobby
                  lobbyId={id}
                  playerId={playerId}
                  sendMessage={(msg) => handleSendMessage(id, msg)}
                  message={lobbyMessages[id]?.slice(-1)[0] || {}}
                  connectionUrl={conn.url}
                  setGamesToInit={setGamesToInit}
                  lobbyConnections={connections}
                  setRemoveRelayConnections={setRemoveRelayConnections}
                />
              </div>
            ))} */}
        {/* </div> */}

        {connections.size === 0 && <p>Lobby not started...</p>}
        {console.log("Player ID", playerId)}
        {console.log("Games to init", gamesToInit)}
        {playerId ? (
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
            setRemoveRelayConnections={setRemoveRelayConnections}
          />
        ) : (
          <p>Game not started...</p>
        )}
        <h3 className="mt-3">Messages Recieved:</h3>

        <div className=" mt-3">
          {/* Render Lobby Messages */}
          {Object.keys(lobbyMessages)
            .sort()
            .map((id, index) => (
              <div key={index}>
                <h5>Lobby Messages from {id}:</h5>

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
                <h5>Game Messages from {id}:</h5>

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
          <h3 className="mt-3">All Messages:</h3>
          {Object.values(messages)
            .flat()
            .map((msg, index, arr) => (
              <div key={index}>
                <JsonView
                  data={msg}
                  shouldExpandNode={(level) =>
                    index === arr.length - 1 ? level === 0 : false
                  } // Expand the last message only
                  style={{
                    fontSize: "14px",
                    lineHeight: "1.2",
                    marginBottom: "8px",
                  }}
                />
              </div>
            ))}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;
