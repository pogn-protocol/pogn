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
  const [startGameConsole, setStartGameConsole] = useState(false);
  const [initialGameState, setInitialGameState] = useState({});
  const [playerGames, setPlayerGames] = useState([]);
  const [lobbyUrls, setLobbyUrls] = useState([]);
  const [lobbyConnections, setLobbyConnections] = useState([]);
  const [messages, setMessages] = useState({});
  const [sendMessageToUrl, setSendMessageToUrl] = useState(() => () => {}); // ✅ State to hold the sendMessageToUrl funct
  const [addConnection, setAddConnection] = useState(() => () => {}); // ✅ State to hold the addConnection funct
  const [startGameWebSocket, setStartGameWebSocket] = useState(false);
  const [connections, setConnections] = useState(new Map());
  const [lobbiesLoggedIn, setLobbiesLoggedIn] = useState(false);
  const connectionsRef = useRef(new Map());
  const [connectionsUpdated, setConnectionsUpdated] = useState(Date.now());
  const [lobbyConnectionsReady, setLobbyConnectionsReady] = useState(false);
  const [addRelayConnections, setAddRelayConnections] = useState([]);
  const [gameMessages, setGameMessages] = useState({});
  const [gameRelaysReady, setGameRelaysReady] = useState(false);
  const [initConnections, setInitConnections] = useState(false);
  const [wsOpenSuccess, setWsOpenSuccess] = useState(null);

  // sets Urls to init
  useEffect(() => {
    if (!playerId) {
      console.warn("⚠️ Player ID not set. Skipping URL setup...");
      return;
    }

    // Check if lobbyUrls already contains the desired URL to avoid re-setting
    //if (lobbyUrls.length === 0) {

    console.log("✅ Setting lobby and game URLs...");
    const initialLobbyUrls = [
      { id: "defaultLobby1", url: "ws://localhost:8080", type: "lobby" },
    ];
    //setLobbyUrls(initialLobbyUrls);
    console.log("🔧 Cleaning up old WebSocket connections on load...");

    // Iterate through existing WebSocket connections and close them
    //  if (connectionsRef.current && connectionsRef.current.size > 0) {
    // connectionsRef.current.forEach((connection, url) => {
    //   try {
    //     console.log(`🔌 Closing leftover connection for ${url}`);
    //     connection.sendJsonMessage({ action: "disconnect" });
    //     connection.close();
    //     connectionsRef.current.delete(url);
    //   } catch (error) {
    //     console.error(`❌ Error cleaning up connection for ${url}:`, error);
    //   }
    // });
    // }
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

  //sends login when all lobby connections are ready
  useEffect(() => {
    console.log("🔍 Checking all lobby connections...");
    console.log("connectionsRef.current", connectionsRef.current);
    if (!playerId) {
      console.warn("⚠️ Player ID not set. Skipping login...");
      return;
    }
    if (lobbiesLoggedIn) {
      console.warn("⚠️ Player already logged in. Skipping login...");
      return;
    }
    if (connectionsRef.current.size === 0) {
      console.warn(
        "⚠️ No connections available. Skipping lobby connections..."
      );
      return;
    }
    // Check if any lobby connection is not open
    const anyNotReady = Array.from(connectionsRef.current.values()).some(
      (connection) => {
        return connection.type === "lobby" && connection.readyState !== 1;
      }
    );

    if (anyNotReady) {
      console.warn(
        "⚠️ One or more lobby connections are not ready. Skipping login..."
      );
      return;
    }

    console.log("🚀 All lobby connections are ready!");
    // Send login message to all lobby connections
    connectionsRef.current.forEach((connection, id) => {
      console.log("🔍 Checking connection:", connection);
      if (connection.type !== "lobby") return;

      console.log("✅ Found open lobby connection", connection);

      const loginMessage = {
        type: "lobby",
        action: "login",
        payload: { playerId },
      };
      console.log(`📤 Sending login message to ${id}:`, loginMessage);
      connection.sendJsonMessage(loginMessage);
    });

    setLobbiesLoggedIn(true);
  }, [playerId, lobbiesLoggedIn, lobbyConnectionsReady]);

  //sets setGameRelaysReady when all game connections are ready
  useEffect(() => {
    // if (startGameConsole) {
    //   console.warn(
    //     "⚠️ Game Console already started. Skipping game connections check..."
    //   );
    //   return;
    // }
    console.log("🔍 Checking all game connections...");
    if (connectionsRef.current.size === 0) {
      console.warn("⚠️ No connections available. Skipping game connections...");
      return;
    }
    console.log("connectionsRef.current", connectionsRef.current);
    // Check if any game connection is not open
    const gameConnections = Array.from(connectionsRef.current.entries()).filter(
      ([, connection]) => connection.type === "game"
    );

    if (gameConnections.length === 0) {
      console.warn("⚠️ No game connections found. Skipping login...");
      return;
    }

    let allReady = true;

    gameConnections.forEach(([id, connection]) => {
      console.log(
        `🔍 Checking connection ID: ${id}, Type: ${connection.type}, ReadyState: ${connection.readyState}`
      );
      if (connection.readyState !== 1) {
        console.warn(`⚠️ Connection ${id} is not ready`);
        allReady = false;
      }
    });

    if (!allReady) {
      console.warn(
        "⚠️ One or more game connections are not ready. Skipping login..."
      );
      return;
    }

    console.log("🚀 All game connections are ready!");
    setStartGameConsole(true);
  }, [wsOpenSuccess, startGameConsole]);

  //sets setLobbyConnectionsReady when all lobby connections are ready
  useEffect(() => {
    console.log("🔍 Checking all lobby connections...");

    if (lobbiesLoggedIn) {
      console.warn("⚠️ Lobbies already Initialized. Skipping login...");
      return;
    }
    if (connectionsRef.current.size === 0) {
      console.warn(
        "⚠️ No connections available. Skipping lobby connections..."
      );
      return;
    }
    // Check if any lobby connection is not open
    const anyNotReady = Array.from(connectionsRef.current.values()).some(
      (connection) => {
        return connection.type === "lobby" && connection.readyState !== 1;
      }
    );

    if (anyNotReady) {
      console.warn(
        "⚠️ One or more lobby connections are not ready. Skipping login..."
      );
      return;
    }

    console.log("🚀 All lobby connections are ready!");
    if (lobbyConnectionsReady) {
      console.warn("⚠️ Lobbies already Initialized. Skipping login...");
      return;
    }
    setLobbyConnectionsReady(true);
  }, [wsOpenSuccess, lobbiesLoggedIn]);

  //handleStartGameRelay
  const handleStartGameRelays = (gameUrls) => {
    console.log("🚀 Starting game relays...");
    //add gameUrls to the urls state don't erase the lobby urls
    //check if the gameId is already in the connectionsRef
    //if it is don't add it
    //if it is add it
    let newGameUrls = gameUrls.filter(({ gameId }) => {
      return !connectionsRef.current.has(gameId);
    });
    console.log("newGameUrls", newGameUrls);
    const newConnections = newGameUrls.map(({ gameId, wsAddress }) => ({
      id: gameId,
      url: wsAddress,
      type: "game",
    }));

    console.log("newConnections", newConnections);
    setAddRelayConnections((prev) => [...newConnections]);
    //setStartGameConsole(true);
  };

  const handleSendMessage = (id, message) => {
    if (sendMessageToUrl) {
      console.log(`🚀 Sending message to ${id}:`, message);
      let connection = connectionsRef.current.get(id);
      console.log("connection", connection);
      connection.sendJsonMessage(message);
      //sendMessageToUrl(url, message);
    } else {
      console.warn(`⚠️ No sendMessage function available for ${id}`);
    }
  };

  //startGameWebSocket
  // useEffect(() => {
  //   if (!startGameWebSocket) return;

  //   console.log("🚀 Starting game WebSocket connections...");

  //   const gameUrls = initialGameState.gameUrls || [];
  //   const connections = gameUrls
  //     .map((url) => {
  //       if (readyState === 1) {
  //         console.log(`✅ WebSocket connected at ${url}`);
  //         return {
  //           url,
  //           sendJsonMessage,
  //           readyState,
  //         };
  //       } else {
  //         console.warn(
  //           `🔴 WebSocket not open at ${url}, readyState: ${readyState}`
  //         );
  //         return null;
  //       }
  //     })
  //     .filter(Boolean); // Filter out failed connections

  //   //setPlayerGames(connections);

  //   console.log("🌐 All game connections established:", connections);
  // }, [startGameWebSocket, initialGameState, readyState, sendJsonMessage]);

  const handleMessage = (id, message) => {
    console.log(`📩 Received from ${id}:`, message);
    if (message.type === "lobby") {
      setMessages((prev) => ({
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

  //console.log("messages", messages); evertime a message is received it is added to the messages object
  useEffect(() => {
    console.log("messages", messages);
  }, [messages]);

  // Handle WebSocket connection event
  const handleConnect = (id) => {
    console.log(`🌐 Successfully connected to ${id}`);
  };

  // Handle WebSocket error event
  const handleError = (id, event) => {
    console.error(`🚨 WebSocket error on ${id}:`, event);
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log("🔌 Cleaning up WebSocket connections on refresh...");
      connectionsRef.current.forEach((connection, id) => {
        try {
          console.log(`🔌 Closing connection for ${id}`);
          connection.sendJsonMessage({ action: "disconnect" });
          connection.close(); // Properly close the WebSocket connection
          connectionsRef.current.delete(id); // Remove from the map
        } catch (error) {
          console.error(`❌ Error closing connection for ${id}:`, error);
        }
      });
    };

    // Attach the handler to the window beforeunload event
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup on unmount
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

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
                onConnect={handleConnect}
                onError={handleError}
                setSendMessage={setSendMessageToUrl}
                setConnections={setConnections}
                connectionsRef={connectionsRef}
                setWsOpenSuccess={setWsOpenSuccess}
                initConnections={initConnections}
                setInitConnections={setInitConnections}
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
        {lobbiesLoggedIn ? (
          Array.from(connectionsRef.current.entries())
            .filter(([id, connection]) => connection.type === "lobby")
            .map(([id, connection], index) => (
              <Lobby
                key={index}
                playerId={playerId}
                startGameRelays={handleStartGameRelays}
                setStartGameConsole={setStartGameConsole}
                sendMessage={(msg) => handleSendMessage(id, msg)}
                message={messages[id]?.slice(-1)[0] || {}}
                connectionUrl={connection.url}
                setInitialGameState={setInitialGameState}
                setPlayerGames={setPlayerGames}
              />
            ))
        ) : (
          <p>Lobby not started...</p>
        )}

        {!startGameConsole ? (
          <p>Game Console Not Started...</p>
        ) : (
          <GameConsole
            playerId={playerId}
            message={Object.values(gameMessages).flat().slice(-1)[0] || {}}
            //message={gameMessage}
            // sendMessage={sendMessage}
            sendGameMessage={(id, msg) => handleSendMessage(id, msg)}
            initialGameState={initialGameState}
            setStartGameConsole={setStartGameConsole}
            sendLobbyMessage={(id, msg) => handleSendMessage(id, msg)}
            setStartGameWebSocket={setStartGameWebSocket}
            playerGames={playerGames}
            lobbyUrl={"ws://localhost:8080"}
          />
        )}
        {/* <Chat messages={messages} sendMessage={sendMessage} playerId={playerId} /> */}
      </div>
    </ErrorBoundary>
  );
};

export default App;
