import React, { useState, useEffect, useRef, useCallback } from "react";
import Player from "./components/Player";
import Dashboard from "./components/Dashboard";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import ErrorBoundary from "./ErrorBoundary";
import Lobby from "./components/Lobby";
import GameConsole from "./components/GameConsole";
import useWebSockets from "./components/hooks/webSockets";
//import ConnectionInterface from "./components/connectionInterface";
import WebSocketManager from "./components/hooks/webSocketManager";

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
  //const [lobbyMessage, setLobbyMessage] = useState(null);
  const [gameMessage, setGameMessage] = useState(null);
  const [playerId, setPlayerId] = useState(null); // Only open WebSocket after this is set
  const [startGameConsole, setStartGameConsole] = useState(false);
  // const [startGameWebSocket, setStartaGameWebSocket] = useState(false);
  const [initialGameState, setInitialGameState] = useState({});
  const [playerGames, setPlayerGames] = useState([]);
  const [lobbyWebSocketOpen, setLobbyWebSocketOpen] = useState(false);
  const [lobbyUrls, setLobbyUrls] = useState([]);
  const [lobbyConnections, setLobbyConnections] = useState([]);
  const connectionsRef = useRef(new Map()); // 🔥 Store connections here
  const [messages, setMessages] = useState({});
  const [sendMessageToUrl, setSendMessageToUrl] = useState(() => () => {}); // ✅ State to hold the sendMessageToUrl funct
  const [addConnection, setAddConnection] = useState(() => () => {}); // ✅ State to hold the addConnection funct
  const [initialConnections, setInitialConnections] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // //set lobbyconnections when connection is made
  // useEffect(() => {
  //   console.log("initialConnections", initialConnections);
  //   if (initialConnections?.length > 0) {
  //     //   setLobbyConnections(
  //     //     initialConnections.filter((conn) => conn.type === "lobby")
  //     //   );
  //   }
  // }, [initialConnections]);

  useEffect(() => {
    console.log("setting lobby and game urls...");
    const initialLobbyUrls = ["ws://localhost:8080"];
    setLobbyUrls(initialLobbyUrls);
  }, [playerId]);

  const updateConnections = useCallback((updatedConnections) => {
    console.log("🌀 Updating connections in App:", updatedConnections);

    if (updatedConnections.length === 0) {
      console.log("🚫 No connections to update.");
      return;
    }
    setLobbyConnections((prevConnections) => {
      const prevConnectionUrls = prevConnections.map((conn) => conn.url);
      const newConnectionUrls = updatedConnections.map((conn) => conn.url);

      // Avoid unnecessary updates if connections haven't changed
      if (
        JSON.stringify(prevConnectionUrls) !== JSON.stringify(newConnectionUrls)
      ) {
        console.log("🔁 Connections have changed, updating state.");
        return updatedConnections.filter((conn) => conn.type === "lobby");
      }

      console.log("🔁 No changes in connections, skipping update.");
      return prevConnections;
    });
  }, []);

  useEffect(() => {
    console.log("🔧 Setting initial connections in App.js...", lobbyUrls);

    if (!addConnection || !sendMessageToUrl) {
      console.warn(
        "⏳ Waiting for addConnection and sendMessageToUrl to be set..."
      );
      return;
    }
    const existingConnections = Array.from(connectionsRef.current.values());

    if (existingConnections.length === 0) {
      lobbyUrls.forEach((url) => {
        if (!connectionsRef.current.has(url)) {
          console.log(`✅ Storing initial connection for URL: ${url}`);

          // Store a placeholder connection first
          connectionsRef.current.set(url, {
            url,
            type: "lobby",
            sendMessage: (message) => {
              console.log(`📤 Sending message to ${url}:`, message);
              sendMessageToUrl(url, message);
            },
          });

          // Open WebSocket and bind the sendMessage function
          addConnection(url, (message) => sendMessageToUrl(url, message));
        } else {
          console.log(`⚠️ Skipping existing connection for URL: ${url}`);
        }
      });

      // Update connections after all are set
      updateConnections(Array.from(connectionsRef.current.values()));
      console.log(
        "✅ Initial connections set:",
        Array.from(connectionsRef.current.values())
      );
    } else {
      console.log("🔁 Initial connections already exist, skipping...");
    }
  }, [
    lobbyUrls,
    connectionsRef,
    updateConnections,
    addConnection,
    sendMessageToUrl,
  ]);

  // const updateConnections = (updatedConnections) => {
  //   console.log("🌀 Updating connections in App:", updatedConnections);
  // };

  const updateMessages = ({ url, message }) => {
    setMessages((prev) => ({
      ...prev,
      [url]: [...(prev[url] || []), message],
    }));
  };

  const handleStartGameRelay = (relayUrl) => {
    console.log("🚀 Starting game relay with URL:", relayUrl);
    //addConnection("game", relayUrl);
  };

  // useEffect(() => {
  //   if (!isInitialized) {
  //     console.log("🔁 Waiting for WebSocketManager initialization...");
  //     return;
  //   }

  //   console.log("logging in...");
  //   console.log("Lobby connections:", lobbyConnections);
  //   lobbyConnections.forEach((connection) => {
  //     console.log("Connection:", connection);

  //     if (playerId && lobbyConnections.length > 0) {
  //       const loginMessage = {
  //         type: "lobby",
  //         action: "login",
  //         payload: { playerId },
  //       };
  //       console.log("📤 Sending login message:", loginMessage);
  //       //sendMessageToUrl(connection.url, loginMessage);
  //     } else {
  //       console.warn(
  //         "⚠️ playerId is not set, lobby websocket not open, or connection not ready. Unable to send login message."
  //       );
  //     }
  //   });
  // }, [playerId, lobbyConnections, sendMessageToUrl, isInitialized]);

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
        {/* <ConnectionInterface
          lobbyUrl={lobbyUrl}
          gameUrl={gameUrl}
          setLobbyUrl={setLobbyUrl}
          setGameUrl={setGameUrl}
          onConnect={connect}
          onDisconnect={disconnect}
          onUrlChange={updateUrl}
          lobbyStatus={lobbyStatus}
          gameStatus={gameStatus}
        /> */}
        {lobbyUrls.length > 0 ? (
          <div>
            <h1>WebSocket Manager</h1>
            <WebSocketManager
              initialUrls={lobbyUrls}
              type={"lobby"}
              connectionsRef={connectionsRef} // 🔥 Pass the connections ref
              updateConnections={updateConnections}
              setSendMessageToUrl={setSendMessageToUrl} // ✅ Pass setter
              updateMessages={updateMessages}
              setAddConnection={setAddConnection} // ✅ Pass the addConnection function
              //setInitialConnections={setInitialConnections} // ✅ Pass the initial
              setIsInitialized={setIsInitialized}
            />
          </div>
        ) : (
          <p>No initial URLs provided.</p>
        )}

        {/* <ConnectionInterface
          connections={connections}
          // addConnection={addConnection}
          //removeConnection={removeConnection}
          //sendMessage={sendMessage}
          messages={messages}
        /> */}
        {lobbyConnections.map((lobbyConnection, index) => {
          console.log("lobbyConnection", lobbyConnection);
          return (
            <Lobby
              key={index}
              playerId={playerId}
              startGameRelay={handleStartGameRelay}
              setStartGameConsole={setStartGameConsole}
              setInitialGameState={setInitialGameState}
              setPlayerGames={setPlayerGames}
              sendMessage={(message) =>
                sendMessageToUrl(lobbyConnection.url, message)
              } // ✅ Corrected
              message={messages[lobbyConnection.url]?.slice(-1)[0] || {}}
              connectionUrl={lobbyConnection.url}
              // addConnection={(url, type) => {
              //   console.log(`✅ Adding connection for ${type} at ${url}`);
              //   //  addConnection(url, (msg) => sendMessageToUrl(url, msg)); // ✅ Use addConnection from WebSocketManager
              // }}
              addConnection={(url, type) => {
                console.log(`✅ Adding connection for ${type} at ${url}`);
                addConnection(url, (msg) => sendMessageToUrl(url, msg));
              }}
              // ✅ Pass the addConnection function to the Lobby component
            />
          );
        })}

        {/* {lobbyMessage && (
          <Lobby
            sendMessage={sendLobbyMessage}
            message={lobbyMessage}
            playerId={playerId}
            startGameRelay={startGameRelay}
            setInitialGameState={setInitialGameState}
            setPlayerGames={setPlayerGames}
            setStartGameConsole={setStartGameConsole}
          />
        )} */}

        {!startGameConsole ? (
          <p>Waiting for game to start...</p>
        ) : (
          <GameConsole
            playerId={playerId}
            message={messages}
            //message={gameMessage}
            //sendGameMessage={sendGameMessage}
            // sendMessage={sendMessage}
            sendMessage={(gameUrl, message) =>
              sendMessageToUrl(gameUrl, message)
            } // ✅ Corrected
            initialGameState={initialGameState}
            setStartGameConsole={setStartGameConsole}
            //sendLobbyMessage={sendLobbyMessage}
            //setStartGameWebSocket={setStartGameWebSocket}
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
