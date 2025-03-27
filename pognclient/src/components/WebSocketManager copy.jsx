import React, { useEffect, useCallback } from "react";
import useWebSocket from "react-use-websocket";

const RelayManager = ({
  addRelayConnections,
  onMessage,
  setSendMessage,
  connections,
  setConnections,
}) => {
  // 🔥 Create a single connection
  const createConnection = useCallback(
    ({ id, url, type }) => {
      console.log(`🔌 Creating WebSocket for ${id} at ${url} [${type}]`);

      const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(
        url,
        {
          onOpen: () => {
            console.log(`✅ Connected to ${id}`);
            setConnections((prev) => {
              const newMap = new Map(prev);
              newMap.set(id, { sendJsonMessage, readyState: 1 });
              return newMap;
            });
          },
          onClose: () => {
            console.log(`🛑 Connection closed for ${id}`);
            setConnections((prev) => {
              const newMap = new Map(prev);
              const conn = newMap.get(id);
              if (conn) {
                newMap.set(id, { ...conn, readyState: 3 });
              }
              return newMap;
            });
          },
          onError: (event) => {
            console.error(`❌ WebSocket error at ${id}:`, event);
            setConnections((prev) => {
              const newMap = new Map(prev);
              const conn = newMap.get(id);
              if (conn) {
                newMap.set(id, { ...conn, readyState: -1 });
              }
              return newMap;
            });
          },
          onMessage: (event) => {
            const message = lastJsonMessage;
            console.log(`📥 Message from ${id}:`, message);
            onMessage(id, message);
          },
          share: true,
        }
      );

      setConnections((prev) => {
        const newMap = new Map(prev);
        newMap.set(id, { sendJsonMessage, readyState });
        return newMap;
      });
    },
    [onMessage]
  );

  // 📤 Send a message to a specific relay
  const sendMessageToRelay = useCallback(
    (id, message) => {
      const relay = connections.get(id);
      if (relay && relay.sendJsonMessage) {
        console.log(`📤 Sending message to ${id}:`, message);
        relay.sendJsonMessage(message);
      } else {
        console.warn(`⚠️ Relay ${id} not found or not ready`);
      }
    },
    [connections]
  );

  // Expose the send function once
  useEffect(() => {
    setSendMessage(() => sendMessageToRelay);
  }, [setSendMessage, sendMessageToRelay]);

  // 🔥 Dynamically add connections without looping in hooks
  useEffect(() => {
    if (!addRelayConnections || addRelayConnections.length === 0) {
      console.warn("⚠️ No relays to add");
      return;
    }

    addRelayConnections.forEach((relay) => {
      if (!connections.has(relay.id)) {
        createConnection(relay);
      } else {
        console.log(`✅ Relay ${relay.id} already exists`);
      }
    });
  }, [addRelayConnections, createConnection, connections]);

  return (
    <div>
      <h2>Relay Manager</h2>
      {Array.from(connections.entries()).map(([id, { readyState }]) => (
        <div key={id}>
          <h3>Relay ID: {id}</h3>
          <p>
            Ready State:{" "}
            {readyState === 1
              ? "Connected"
              : readyState === 0
              ? "Connecting"
              : readyState === 3
              ? "Closed"
              : "Unknown"}
          </p>
          <button onClick={() => sendMessageToRelay(id, { action: "ping" })}>
            Send Ping
          </button>
        </div>
      ))}
    </div>
  );
};

export default RelayManager;
