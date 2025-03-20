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
  const [messages, setMessages] = useState([]);
  const [lobbyMessage, setLobbyMessage] = useState(null);
  const [gameMessage, setGameMessage] = useState(null);
  const [playerId, setPlayerId] = useState(null); // Only open WebSocket after this is set
  const [startGameConsole, setStartGameConsole] = useState(false);
  const [startWebSocket, setStartWebSocket] = useState(false);
  const [initialGameState, setInitialGameState] = useState({});
  const processedMessagesRef = useRef(new Set());

  // Memoized WebSocket handlers
  // const handleWebSocketMessageRef = useRef((event) => {
  //   console.log("Received WebSocket message....");
  //   console.log("data", event); // This is actually a `MessageEvent`

  //   let data;
  //   try {
  //     data = JSON.parse(event.data); // ✅ Extract `data` from `MessageEvent`
  //   } catch (error) {
  //     console.error("❌ Failed to parse WebSocket message:", error);
  //     return;
  //   }
  //   console.log(`Main switch: ${data.type}`, data);

  //   switch (data.type) {
  //     case "lobby":
  //       console.log("Switched to lobby");
  //       setLobbyMessage((prevMessage) => {
  //         // Avoid redundant updates
  //         if (JSON.stringify(prevMessage) === JSON.stringify(data)) {
  //           return prevMessage;
  //         }
  //         return data;
  //       });
  //       break;

  //     case "game":
  //       setGameMessage((prevMessage) => {
  //         // Avoid redundant updates
  //         if (JSON.stringify(prevMessage) === JSON.stringify(data)) {
  //           return prevMessage;
  //         }
  //         return data;
  //       });
  //       break;

  //     case "chat":
  //       setMessages((prevMessages) => [...prevMessages, data.payload]);
  //       break;

  //     default:
  //       console.warn(`Unhandled message type: ${data.type}`);
  //   }
  // });

  // useEffect(() => {
  //   handleWebSocketMessageRef.current = handleWebSocketMessageRef.current;
  // }, []);

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
        handleWebSocketOpen();
      },
      //onMessage: (event) => handleWebSocketMessageRef.current(event);
      onClose: () => {
        console.log("🔴 Lobby WebSocket closed.");
      },
    }
  );

  // ✅ Memoized game WebSocket (Only re-runs when `startWebSocket` changes)
  const { sendJsonMessage: sendGameMessage, lastJsonMessage: lastGameMessage } =
    useWebSocket(
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

  // Wrap sendJsonMessage to add a UUID
  const sendLobbyMessage = (message) => {
    if (!message) return;

    const messageWithUUID = {
      ...message,
      uuid: uuidv4(), // 🔥 Generate a new UUID for each message
    };

    console.log("📤 Sending message with UUID:", messageWithUUID);
    originalSendLobbyMessage(messageWithUUID);
  };

  // useEffect(() => {
  //   if (lastLobbyMessage) {
  //     console.log("Processing lastLobbyMessage:", lastLobbyMessage);
  //     setLobbyMessage(lastLobbyMessage); // ✅ Set directly
  //   }
  // }, [lastLobbyMessage]); // ✅ Only runs when `lastLobbyMessage` changes

  // useEffect(() => {
  //   if (lastGameMessage) {
  //     console.log("Processing lastGameMessage:", lastGameMessage);
  //     setGameMessage(lastGameMessage); // ✅ Set directly
  //   }
  // }, [lastGameMessage]);

  // useEffect(() => {
  //   if (!startGameConsole && startWebSocket) {
  //     console.log("⚠️ Waiting before shutting down WebSocket...");
  //     setTimeout(() => {
  //       setStartWebSocket(false);
  //     }, 200); // 🔥 Prevent instant loop
  //   }
  // }, [startGameConsole]);

  const handleWebSocketOpen = useCallback(() => {
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

  // const memoizedMessages = useMemo(() => {
  //   return {
  //     lobbyMessage,
  //     gameMessage,
  //     messages,
  //   };
  // }, [lobbyMessage, gameMessage, messages]);

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
            message={lastLobbyMessage || {}}
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
            message={lastGameMessage || {}}
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
