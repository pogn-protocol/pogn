import React, { useState, useEffect, useRef } from "react";
import Player from "./components/Player";
import Dashboard from "./components/Dashboard";
import Chat from "./components/Chat";
import RockPaperScissors from "./components/RockPaperScissors";
import GameController from "./components/js/GameController.js";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import Lobby from "./components/Lobby";

const App = () => {
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]); // Chat messages
  const [gameState, setGameState] = useState({});
  const [ws, setWs] = useState(null);
  const [publicKey, setPublicKey] = useState(null); // Public key passed from Player.jsx

  const gameControllerRef = useRef(new GameController(ws));
  const gameController = gameControllerRef.current;

  useEffect(() => {
    if (!publicKey || ws) return;

    const socket = new WebSocket("ws://localhost:8080");

    socket.onopen = () => {
      console.log("WebSocket connected");
      setWs(socket);

      const loginMessage = {
        type: "login",
        payload: { publicKey },
      };

      socket.send(JSON.stringify(loginMessage));
      console.log("Sent login message:", loginMessage);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Message received:", data);

        switch (data.type) {
          case "verifyPlayers":
            console.log("Verification request received. Sending public key...");
            socket.send(
              JSON.stringify({
                type: "verifyResponse",
                payload: { publicKey },
              })
            );
            break;

      
            case "updatePlayers":
        setPlayers(data.payload.players);
        // Update gameController with the new players
        data.payload.players.forEach((player) => {
          gameController.processMessage({
            type: "login",
            payload: { publicKey: player },
          });
        });
        break;
          case "message":
            // Append new message to chat
            setMessages((prevMessages) => [...prevMessages, data.payload]);
            break;

          case "gameState":
            setGameState(data.payload.state);
            break;

          default:
            console.warn("Unhandled message type:", data.type);
        }
      } catch (err) {
        console.error("Message received but failed to parse:", err);
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
        console.log("Closing WebSocket...");
        socket.close();
      }
    };
  }, [publicKey]);

  const sendMessage = (message) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  };

  return (
    <div className="container mt-5">
      <h1>Game Lobby</h1>
      <Player sendPublicKey={setPublicKey} />
      {publicKey && <Dashboard playerName="Player" playerId={publicKey} />}
      <RockPaperScissors ws={ws} gameController={gameController} publicKey={publicKey} />

      <Chat  messages={messages} sendMessage={sendMessage} publicKey={publicKey} />
     <Lobby players={players} />
    </div>
  );
};

export default App;
