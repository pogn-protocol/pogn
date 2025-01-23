import React, { useState, useEffect, useMemo } from "react";
import Player from "./components/Player";
import Dashboard from "./components/Dashboard";
import Chat from "./components/Chat";
import GameConsole from "./components/GameConsole";
import Lobby from "./components/Lobby";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";

const App = () => {
  const [messages, setMessages] = useState([]);
  const [lobbyMessage, setLobbyMessage] = useState(null);
  const [gameMessage, setGameMessage] = useState(null);
  const [ws, setWs] = useState(null);
  const [publicKey, setPublicKey] = useState(null);
  const [verifiedPlayers, setVerifiedPlayers] = useState([]); // Track verified players

  useEffect(() => {
    if (!publicKey || ws) return;

    const socket = new WebSocket("ws://localhost:8080");

    socket.onopen = () => {
      console.log("WebSocket connected");
      setWs(socket);

      const loginMessage = {
        type: "lobby",
        action: "login",
        payload: {
          publicKey,
        },
      };

      socket.send(JSON.stringify(loginMessage));
      console.log("Sent login message:", loginMessage);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (!data.unique) {
        data.unique = `${data.type}-${Date.now()}-${Math.random()}`;
      }

      console.log(`Received message type: ${data.type}`, data);

      switch (data.type) {
        case "lobby":
          setLobbyMessage(data);
          break;

        case "game":
          setGameMessage(data);
          break;

        case "chat":
          setMessages((prevMessages) => [...prevMessages, data.payload]);
          break;

        default:
          console.warn(`Unhandled message type: ${data.type}`);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
      setWs(null);
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [publicKey]);

  const memoizedLobbyMessage = useMemo(() => lobbyMessage, [lobbyMessage]);
  const memoizedGameMessage = useMemo(() => gameMessage, [gameMessage]);

  return (
    <div className="container mt-5">
      <h1>Game App</h1>
      <Player sendPublicKey={setPublicKey} />
      {publicKey && <Dashboard playerName="Player" playerId={publicKey} />}
      {/* Render Lobby */}
      {memoizedLobbyMessage && (
        <Lobby
          message={memoizedLobbyMessage}
          sendMessage={(message) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(message));
            }
          }}
          publicKey={publicKey}
          onPlayerEnteredLobby={(verifiedPlayers) => {
            console.log("App received verified players:", verifiedPlayers);
            setVerifiedPlayers(verifiedPlayers);
          }}
        />
      )}
      {/* Render Game Console Always */}
      <GameConsole
        message={memoizedGameMessage || { payload: {} }} // Provide a default empty message
        sendMessage={(message) => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
          }
        }}
        publicKey={publicKey}
        verifiedPlayers={verifiedPlayers}
      />
      {/* Render Chat */}
      <Chat
        messages={messages}
        sendMessage={(message) => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
          }
        }}
        publicKey={publicKey}
      />
    </div>
  );
};

export default App;
