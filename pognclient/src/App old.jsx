import React, { useState, useEffect, useRef } from "react";
import Lobby from "./components/Lobby";
import Messages from "./components/Messages";
import RockPaperScissors from "./components/RockPaperScissors";
import { generateSecretKey, getPublicKey, nip04 } from "nostr-tools";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import Dashboard from "./components/Dashboard";

const App = () => {
  const [privateKey] = useState(generateSecretKey());
  const [publicKey] = useState(getPublicKey(privateKey));
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [joining, setJoining] = useState(false);
  const [playerChoice, setPlayerChoice] = useState(null);
  const [opponentChoice, setOpponentChoice] = useState(null);
  const [committedChoice, setCommittedChoice] = useState(null); // Store encrypted choice
  const [revealed, setRevealed] = useState(false);

  const ws = useRef(null);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080");
    ws.current = socket;

    socket.onopen = () => {
      console.log("Connected to relay");
      socket.send(
        JSON.stringify({
          type: "join",
          payload: { publicKey },
        })
      );
    };

    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      console.log("Message from server:", data);

      switch (data.type) {
        case "updatePlayers":
          setPlayers(data.players);
          break;

        case "chat":
          console.log("Chat message received:", data.payload);
          setMessages((prev) => [...prev, data.payload]);
          break;

        case "gameStart":
          console.log("Game has started:", data);
          setGameStarted(true);
          setJoining(false);
          break;

        case "gameUpdate":
          console.log("Game update received:", data.payload);
          const { results, winner, message } = data.payload;
          if (results) {
            setPlayerChoice(results[publicKey]);
            setOpponentChoice(
              Object.entries(results)
                .filter(([key]) => key !== publicKey)
                .map(([_, choice]) => choice)[0]
            );

            const chatMessage = {
              senderPublicKey: "server",
              message,
            };
            setMessages((prev) => [...prev, chatMessage]);
          }
          break;

        case "gameRevealTime":
          console.log("Server requested reveal phase.");
          const revealMessage = {
            senderPublicKey: "server",
            message: "Please reveal your choice.",
          };
          setMessages((prev) => [...prev, revealMessage]);
          break;

        default:
          console.log("Unknown message type:", data);
      }
    };

    socket.onclose = () => {
      console.log("Disconnected from relay");
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [publicKey]);

  const sendMessage = (message) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not open");
      return;
    }

    const event = {
      type: "chat",
      payload: {
        senderPublicKey: publicKey,
        message,
      },
    };

    console.log("Sending message:", event);
    ws.current.send(JSON.stringify(event));
  };

  const onJoinGame = () => {
    setJoining(true);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const joinMessage = {
        type: "join",
        payload: {
          actionType: "joinGame",
          data: { player: publicKey, game: "rock-paper-scissors" },
        },
      };
      console.log("Sending join message:", joinMessage);
      ws.current.send(JSON.stringify(joinMessage));
    } else {
      console.error("WebSocket is not open");
    }
  };

  const commitChoice = async (choice) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not open");
      return;
    }

    const nonce = Math.random().toString(36).substring(2);
    const encryptedChoice = await nip04.encrypt(privateKey, publicKey, `${choice}:${nonce}`);
    setCommittedChoice({ encryptedChoice, nonce });

    const commitMessage = {
      type: "gameUpdate",
      payload: {
        actionType: "commitChoice",
        data: {
          player: publicKey,
          encryptedChoice,
          game: "rock-paper-scissors", // Pass game type here
        },
      },
    };

    console.log("Sending commit message:", commitMessage);
    ws.current.send(JSON.stringify(commitMessage));
  };

  const revealChoice = async () => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not open");
      return;
    }

    if (!committedChoice) {
      console.error("No committed choice to reveal.");
      return;
    }

    const revealMessage = {
      type: "gameUpdate",
      payload: {
        actionType: "revealChoice",
        data: {
          player: publicKey,
          choice: playerChoice,
          nonce: committedChoice.nonce,
          game: "rock-paper-scissors", // Pass game type here
        },
      },
    };

    console.log("Sending reveal message:", revealMessage);
    ws.current.send(JSON.stringify(revealMessage));
    setRevealed(true);
  };

  return (
    <div className="container">
      <h1 className="text-center mt-4">POGN</h1>
      <Dashboard />
      <RockPaperScissors
        onJoinGame={onJoinGame}
        sendMove={commitChoice}
        gameStarted={gameStarted}
        joining={joining}
        playerChoice={playerChoice}
        opponentChoice={opponentChoice}
        autoJoin={true}
        onReveal={revealChoice}
        revealed={revealed}
      />
      <Messages messages={messages} sendMessage={sendMessage} />
      <Lobby players={players} />
    </div>
  );
};

export default App;
