import React, { useState, useEffect, useMemo } from "react";
import "./css/lobby.css";

const Lobby = ({
  message,
  sendMessage,
  playerId,
  onPlayerEnteredLobby,
  onUpdatePlayers,
  players,
}) => {
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

        // Map the payload to the required player format
        const updatedPlayers = payload.players.map((player) => ({
          playerId: player.playerId,
          playerName: player.playerName || "Unknown", // Default to "Unknown" if playerName is missing
        }));

        // Notify the parent to update the global state
        if (onUpdatePlayers) {
          onUpdatePlayers(updatedPlayers);
        }
        break;

      case "joinLobbyStandby":
        console.log("Standby for verification:", payload.playerId);
        break;
      case "verifyPlayer":
        console.log("Verification request received.");
        const verifyMessage = {
          type: "lobby",
          action: "verifyResponse",
          payload: { playerId: playerId },
        };
        console.log("Sending verifyResponse:", verifyMessage);
        sendMessage(verifyMessage);
        break;

      case "playerVerified":
        console.log(`${payload.playerId} has verified.`);
        break;
      default:
        console.warn(`Unhandled action: ${action}`);
    }
  }, [memoizedMessage, sendMessage, playerId, onPlayerEnteredLobby]);

  return (
    <div className="lobby">
      <h2>Lobby</h2>
      <p>Players in Lobby: {players.length}</p>
      <ul>
        {players.length > 0 ? (
          players.map((player, index) => (
            <li key={index}>
              <strong>Player {index + 1}:</strong> {player.playerId}
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
