import React, { useState, useEffect, useCallback } from "react";
import useGameWebSocket from "./useGameWebSocket"; // Import the custom hook

const WebSocketManager = ({
  addRelayConnections,
  onMessage,
  setSendMessage,
  setWsOpenSuccess,
  setRelayReady,
}) => {
  const [connections, setConnections] = useState(new Map());

  // Function to send a message to a specific WebSocket connection by ID
  const sendMessageToConnection = useCallback(
    (id, message) => {
      const connection = connections.get(id);
      if (connection) {
        console.log(`📤 Sending message to ${id}:`, message);
        connection.sendJsonMessage(message);
      } else {
        console.warn(`⚠️ No connection found for ID: ${id}`);
      }
    },
    [connections]
  );

  // Expose the send function once
  useEffect(() => {
    setSendMessage(() => sendMessageToConnection);
  }, [setSendMessage, sendMessageToConnection]);

  // Create connections when addRelayConnections updates
  useEffect(() => {
    if (!addRelayConnections || addRelayConnections.length === 0) {
      console.warn("⚠️ No WebSocket connections to create.");
      return;
    }

    console.log(
      "🔧 Creating WebSocket connections for URLs:",
      addRelayConnections
    );

    const newConnections = new Map();

    addRelayConnections.forEach(({ id, url, type }) => {
      if (connections.has(id)) {
        console.log(`🔍 Connection for ${id} already exists.`);
        return;
      }

      console.log(`🔌 Creating WebSocket connection: ${url} [${type}]`);

      // Use the custom hook to create the WebSocket connection
      const { sendJsonMessage, readyState, lastJsonMessage } = useGameWebSocket(
        id,
        url,
        type,
        onMessage,
        setWsOpenSuccess,
        (successTimestamp) => {
          setWsOpenSuccess(successTimestamp);
          setRelayReadyStates((prev) => ({
            ...prev,
            [id]: { readyState: 1, url, type }, // ✅ Update ready state
          }));
        }
      );

      newConnections.set(id, { sendJsonMessage, readyState, lastJsonMessage });
    });

    setConnections((prev) => new Map([...prev, ...newConnections]));
  }, [addRelayConnections]);

  return (
    <div>
      <h2>WebSocket Manager</h2>
      {Array.from(connections.entries()).map(([id, { readyState }]) => (
        <div key={id}>
          <h3>Connection ID: {id}</h3>
          <p>Ready State: {readyState}</p>
          <button
            onClick={() => sendMessageToConnection(id, { action: "ping" })}
          >
            Send Ping
          </button>
        </div>
      ))}
    </div>
  );
};

export default WebSocketManager;
