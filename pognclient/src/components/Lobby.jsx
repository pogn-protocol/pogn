import React, { useState, useEffect, useMemo } from "react";
import "./css/lobby.css";

const Lobby = ({ message, sendMessage, publicKey, onPlayerEnteredLobby }) => {
  const [players, setPlayers] = useState([]);
  const [processedMessages, setProcessedMessages] = useState(new Set()); // Use a Set for efficient tracking

  // Memoize the message to prevent unnecessary reprocessing
  const memoizedMessage = useMemo(() => {
    if (message?.unique && !processedMessages.has(message.unique)) {
      console.log("Memoizing new message:", message.unique);
      return message;
    }
    return null; // Skip already processed messages
  }, [message, processedMessages]);

  useEffect(() => {
    if (!memoizedMessage) return; // Skip null or already processed messages

    const { action, payload } = memoizedMessage;

    console.log("Processing Lobby message:", memoizedMessage);

    // Mark the message as processed immutably
    setProcessedMessages((prev) => new Set(prev).add(memoizedMessage.unique));

    switch (action) {
      case "updatePlayers":
        console.log("Updating player list:", payload.players);
        setPlayers(payload.players.map((player) => ({ publicKey: player })));
        //if our publicKey is in the list of players, we are in the lobby
        onPlayerEnteredLobby(payload.players);
        break;

      case "verifyPlayer":
        console.log("Verification request received.");
        const verifyMessage = {
          type: "lobby",
          action: "verifyResponse",
          payload: { publicKey },
        };
        console.log("Sending verifyResponse:", verifyMessage);
        sendMessage(verifyMessage);
        break;

      case "playerVerified":
        console.log(`${payload.publicKey} has verified.`);
        break;

      case "playerJoined":
        console.log(`Player joined: ${payload.publicKey}`);
        setPlayers((prevPlayers) => {
          const playerExists = prevPlayers.some(
            (player) => player.publicKey === payload.publicKey
          );
          if (!playerExists) {
            console.log(`Adding new player: ${payload.publicKey}`);
            return [...prevPlayers, { publicKey: payload.publicKey }];
          }
          console.log(`Player already exists: ${payload.publicKey}`);
          return prevPlayers;
        });
        break;

      case "playerLeft":
        console.log(`Player left: ${payload.publicKey}`);
        setPlayers((prevPlayers) =>
          prevPlayers.filter((player) => player.publicKey !== payload.publicKey)
        );
        break;

      default:
        console.warn(`Unhandled action: ${action}`);
    }
  }, [memoizedMessage, sendMessage, publicKey, onPlayerEnteredLobby]);

  return (
    <div className="lobby">
      <h2>Lobby</h2>
      <ul>
        {players.length > 0 ? (
          players.map((player, index) => (
            <li key={index}>
              <strong>Player {index + 1}:</strong> {player.publicKey}
            </li>
          ))
        ) : (
          <li>No players connected yet</li>
        )}
      </ul>
    </div>
  );
};

export default Lobby;
