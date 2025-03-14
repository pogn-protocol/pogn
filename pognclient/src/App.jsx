import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import useWebSocket from "react-use-websocket";
import Player from "./components/Player";
import Dashboard from "./components/Dashboard";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import ErrorBoundary from "./ErrorBoundary";
//import useWebSocket from "./components/hooks/webSocket";
import Lobby from "./components/Lobby";
import GameConsole from "./components/GameConsole";
import { use } from "react";

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
  const [messages, setMessages] = useState([]);
  const [lobbyMessage, setLobbyMessage] = useState(null);
  const [gameMessage, setGameMessage] = useState(null);
  const [playerId, setPlayerId] = useState(null); // Only open WebSocket after this is set
  const [startGameConsole, setStartGameConsole] = useState(false);
  const [startWebSocket, setStartWebSocket] = useState(false);
  const [initialGameState, setInitialGameState] = useState({});
  const processedMessagesRef = useRef(new Set());

  // Memoized WebSocket handlers
  const handleWebSocketMessage = useCallback((event) => {
    console.log("Received WebSocket message....");
    console.log("data", event); // This is actually a `MessageEvent`

    let data;
    try {
      data = JSON.parse(event.data); // ✅ Extract `data` from `MessageEvent`
    } catch (error) {
      console.error("❌ Failed to parse WebSocket message:", error);
      return;
    }
    console.log(`Main switch: ${data.type}`, data);

    switch (data.type) {
      case "lobby":
        console.log("Switched to lobby");
        setLobbyMessage((prevMessage) => {
          // Avoid redundant updates
          if (JSON.stringify(prevMessage) === JSON.stringify(data)) {
            return prevMessage;
          }
          return data;
        });
        break;

      case "game":
        setGameMessage((prevMessage) => {
          // Avoid redundant updates
          if (JSON.stringify(prevMessage) === JSON.stringify(data)) {
            return prevMessage;
          }
          return data;
        });
        break;

      case "chat":
        setMessages((prevMessages) => [...prevMessages, data.payload]);
        break;

      default:
        console.warn(`Unhandled message type: ${data.type}`);
    }
  }, []);

  // const handleWebSocketOpen = useCallback(
  //   (socket) => {
  //     console.log("logging in...");
  //     if (playerId) {
  //       const loginMessage = {
  //         type: "lobby",
  //         action: "login",
  //         payload: { playerId },
  //       };
  //       console.log("Sending login message:", loginMessage);
  //       socket.send(JSON.stringify(loginMessage));
  //     } else {
  //       console.warn("playerId is not set. Unable to send login message.");
  //     }
  //   },
  //   [playerId]
  // );

  // Only open the WebSocket after playerId is set
  // const { ws, sendMessage } = useWebSocket(
  //   playerId ? "ws://localhost:8080" : null, // Open WebSocket only when playerId is set
  //   {
  //     onOpen: handleWebSocketOpen,
  //     onMessage: handleWebSocketMessage,
  //   }
  // );

  useEffect(() => {
    if (startWebSocket) {
      console.log("🕐 Waiting before connecting to game WebSocket...");
      setTimeout(() => {
        console.log("✅ Now connecting to Game WebSocket...");
        setStartGameConsole(true);
      }, 3000); // 🔥 Give the server 3 seconds before attempting connection
    }
  }, [startWebSocket]);

  // const { ws: lobbyWs, sendMessage: sendLobbyMessage } = useWebSocket(
  //   playerId ? "ws://localhost:8080" : null, // ✅ Open WebSocket only when playerId is set
  //   {
  //     onOpen: handleWebSocketOpen,
  //     onMessage: handleWebSocketMessage, // ✅ Handles lobby messages
  //   }
  // );

  // useEffect(() => {
  //   console.log("🔥 App.jsx Re-Rendered!");
  // });

  // const { ws: gameWs, sendMessage: sendGameMessage } = useWebSocket(
  //   startWebSocket ? "ws://localhost:9000" : null,
  //   {
  //     onOpen: () => {
  //       console.log("🔵 Game WebSocket opened.");
  //     },
  //     onMessage: handleWebSocketMessage,
  //     onClose: () => {
  //       console.log("🔴 Game WebSocket closed.");
  //       setStartGameConsole(false);
  //       setStartWebSocket(false);
  //     },
  //   }
  // );

  const { sendJsonMessage: sendLobbyMessage } = useWebSocket(
    useMemo(() => (playerId ? "ws://localhost:8080" : null), [playerId]),
    {
      onOpen: () => {
        console.log("🔵 Lobby WebSocket opened for playerId;", playerId);
        handleWebSocketOpen();
      },
      onMessage: (event) => handleWebSocketMessage(event),
      onClose: () => {
        console.log("🔴 Lobby WebSocket closed.");
      },
    }
  );

  // ✅ Memoized game WebSocket (Only re-runs when `startWebSocket` changes)
  const { sendJsonMessage: sendGameMessage } = useWebSocket(
    useMemo(
      () => (startWebSocket ? "ws://localhost:9000" : null),
      [startWebSocket]
    ),
    {
      onOpen: () => {
        console.log("🔵 Game WebSocket opened.");
      },
      onMessage: (event) => handleWebSocketMessage(event),
      onClose: (event) => {
        console.log("🔴 Game WebSocket closed.", event);
        if (event.wasClean) {
          console.log("💡 WebSocket closed cleanly, resetting game state.");
          setStartGameConsole(false);
          setStartWebSocket(false);
        } else {
          console.warn(
            "⚠️ Unexpected WebSocket closure, preventing unnecessary resets."
          );
        }
      },
    }
  );

  //if startGame false set startWebSocket to false
  useEffect(() => {
    if (!startGameConsole && startWebSocket) {
      console.log("⚠️ Waiting before shutting down WebSocket...");
      setTimeout(() => {
        setStartWebSocket(false);
      }, 200); // 🔥 Prevent instant loop
    }
  }, [startGameConsole]);

  const sendLobbyMessageRef = useRef(sendLobbyMessage);
  useEffect(() => {
    sendLobbyMessageRef.current = sendLobbyMessage;
  }, [sendLobbyMessage]);

  const handleWebSocketOpen = useCallback(() => {
    console.log("logging in...");
    if (playerId) {
      const loginMessage = {
        type: "lobby",
        action: "login",
        payload: { playerId },
      };
      console.log("📤 Sending login message:", loginMessage);
      sendLobbyMessageRef.current(loginMessage); // ✅ Use react-use-websocket's `sendMessage`
    } else {
      console.warn("⚠️ playerId is not set. Unable to send login message.");
    }
  }, [playerId, sendLobbyMessageRef]);

  useEffect(() => {
    console.log("🔥 App.jsx Re-Rendered!");
  });

  // ✅ Ensure game starts only when WebSocket is fully open
  // useEffect(() => {
  //   if (gameWs && gameWs.readyState === WebSocket.OPEN) {
  //     console.log("✅ Game WebSocket is now fully open. Starting game...");
  //     setStartGameConsole(true);
  //   }
  // }, [gameWs]); // ✅ Runs when gameWs changes

  const memoizedMessages = useMemo(() => {
    return {
      lobbyMessage,
      gameMessage,
      messages,
    };
  }, [lobbyMessage, gameMessage, messages]);

  return (
    <ErrorBoundary>
      <div className="container mt-5">
        <h1>Game App</h1>
        {/* Generate playerId in Player component */}
        <Player setPlayerId={setPlayerId} />
        {playerId && <Dashboard playerName="Player" playerId={playerId} />}
        {memoizedMessages.lobbyMessage && (
          <Lobby
            message={memoizedMessages.lobbyMessage}
            sendMessage={sendLobbyMessage}
            playerId={playerId}
            setStartWebSocket={setStartWebSocket}
            // setStartGameConsole={setStartGameConsole}
            setInitialGameState={setInitialGameState}
          />
        )}

        {!startGameConsole ? (
          <p>Waiting for game to start...</p>
        ) : (
          <GameConsole
            playerId={playerId}
            message={memoizedMessages.gameMessage || {}}
            initialGameState={initialGameState}
            sendMessage={sendGameMessage}
            setStartGameConsole={setStartGameConsole}
            processedMessagesRef={processedMessagesRef}
          />
        )}
        {/* <Chat messages={messages} sendMessage={sendMessage} playerId={playerId} /> */}
      </div>
    </ErrorBoundary>
  );
};

export default App;
