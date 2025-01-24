import React, { useState, useEffect, useMemo } from "react";
import Player from "./components/Player";
import Dashboard from "./components/Dashboard";
import Chat from "./components/Chat";
import GameConsole from "./components/GameConsole";
import Lobby from "./components/Lobby";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import ErrorBoundary from "./ErrorBoundary";

const App = () => {
  const [messages, setMessages] = useState([]);
  const [lobbyMessage, setLobbyMessage] = useState(null);
  const [gameMessage, setGameMessage] = useState(null);
  const [ws, setWs] = useState(null);
  const [playerId, setplayerId] = useState(null);
  const [players, setPlayers] = useState([]); // Add this in App

  useEffect(() => {
    if (!playerId || ws) return;

    const socket = new WebSocket("ws://localhost:8080");

    socket.onopen = () => {
      console.log("WebSocket connected");
      setWs(socket);

      const loginMessage = {
        type: "lobby",
        action: "login",
        payload: {
          playerId: playerId,
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
  }, [playerId]);

  const memoizedLobbyMessage = useMemo(() => lobbyMessage, [lobbyMessage]);
  const memoizedGameMessage = useMemo(() => gameMessage, [gameMessage]);

  return (
    <ErrorBoundary>
      <div className="container mt-5">
        <h1>Game App</h1>
        <Player sendplayerId={setplayerId} />
        {playerId && <Dashboard playerName="Player" playerId={playerId} />}
        {/* Render Lobby */}
        {memoizedLobbyMessage && (
          <Lobby
            players={players}
            message={memoizedLobbyMessage}
            sendMessage={(message) => {
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(message));
              }
            }}
            playerId={playerId}
            onPlayerEnteredLobby={(players) => {
              console.log("App received verified players:", players);
              setPlayers(players); // Update players in the App state
            }}
            onUpdatePlayers={(updatedPlayers) => {
              setPlayers(updatedPlayers); // Update players in the App state
            }}
          />
        )}
        {/* Render Game Console Always */}
        <GameConsole
          players={players || []} // Provide a default empty array
          message={memoizedGameMessage || { payload: {} }} // Provide a default empty message
          sendMessage={(message) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(message));
            }
          }}
          playerId={playerId || ""}
        />
        {console.log("GameConsole props:", {
          players,
          memoizedGameMessage,
          playerId,
        })}

        {/* Render Chat */}
        <Chat
          messages={messages}
          sendMessage={(message) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(message));
            }
          }}
          playerId={playerId}
        />
      </div>
    </ErrorBoundary>
  );
};

export default App;
