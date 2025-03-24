import React, { useState, useEffect, useRef, useCallback } from "react";
import { use } from "react";
import useWebSocket from "react-use-websocket";

const WebSocketConnection = ({
  connectionId,
  url,
  type,
  onMessage,
  onConnect,
  onError,
  registerSendMessage,
  setWsOpenSuccess,
}) => {
  const { sendJsonMessage, readyState } = useWebSocket(url, {
    share: true,
    onOpen: () => {
      console.log(`✅ Connected to ${connectionId} ${url} [${type}]`);
      if (onConnect) onConnect(connectionId);
      if (registerSendMessage)
        registerSendMessage(connectionId, sendJsonMessage);
      if (setWsOpenSuccess) setWsOpenSuccess(Date.now());
    },
    onMessage: (event) => {
      const message = JSON.parse(event.data);
      console.log(`📥 Message from ${connectionId} [${type}]:`, message);
      if (onMessage) onMessage(connectionId, message, type);
    },
    onError: (event) => {
      console.error(`❌ WebSocket error at ${connectionId} [${type}]:`, event);
      if (onError) onError(connectionId, event, type);
    },
  });

  useEffect(() => {
    if (readyState === 1) {
      console.log(
        `✅ Connection already open: ${connectionId} ${url} [${type}]`
      );
      if (onConnect) onConnect(connectionId);
      if (setWsOpenSuccess) setWsOpenSuccess(Date.now());
    }
  }, [readyState, connectionId, url, type, onConnect, setWsOpenSuccess]);

  return (
    <div>
      <h3>
        WebSocket: {url} [{type}]
      </h3>
      <p>Connection ID: {connectionId}</p>
      <p>Ready State: {readyState}</p>
      <button onClick={() => sendJsonMessage({ action: "ping" })}>
        Send Ping
      </button>
    </div>
  );
};

const WebSocketManager = ({
  addRelayConnections,
  onMessage,
  onConnect,
  onError,
  setSendMessage,
  connectionsRef,
  setWsOpenSuccess,
  initConnections,
  setInitConnections,
}) => {
  const [refreshConnections, setRefreshConnections] = useState(Date.now());
  const sendMessage = useCallback(
    (id, message) => {
      console.log(`📤 Sending message to ${id}:`, message);
      const sendFunction = connectionsRef.current.get(id);
      if (sendFunction) {
        try {
          sendFunction(message);
          console.log(`✅ Message sent to ${id}`);
        } catch (error) {
          console.error(`❌ Failed to send message to ${id}:`, error);
        }
      } else {
        console.warn(`⚠️ No active WebSocket connection for ${id}`);
      }
    },
    [connectionsRef]
  );

  // Register send functions in the connection map
  const registerSendMessage = useCallback(
    (id, sendJsonMessage) => {
      const existingConnection = connectionsRef.current.get(id) || {};
      connectionsRef.current.set(id, {
        ...existingConnection, // Preserve existing properties
        sendJsonMessage, // Update or add the sendJsonMessage function
        //readyState: 1, // Make sure to update the ready state
      });
      console.log(`💾 Registered send function for ${id}`);
    },
    [connectionsRef]
  );

  const handleOnOpen = useCallback(
    (id) => {
      console.log(`
        ✅ Connected to ${id}
        `);
      const existingConnection = connectionsRef.current.get(id) || {};
      connectionsRef.current.set(id, {
        ...existingConnection, // Preserve existing properties
        readyState: 1, // Make sure to update the ready state
      });
    },
    [connectionsRef]
  );

  // Set the sendMessage function once on mount
  useEffect(() => {
    setSendMessage(() => sendMessage);
  }, [sendMessage, setSendMessage]);

  const addConnection = (id, url, type, sendJsonMessage, readyState) => {
    console.log("🔄 Adding new connection...");
    console.log("Params:", id, url, type, sendJsonMessage, readyState);

    // Update the connections map
    const newConnection = {
      id,
      url,
      type,
      sendJsonMessage,
      readyState,
    };
    connectionsRef.current.set(id, newConnection);

    console.log(
      "✅ Added new connection:",
      Array.from(connectionsRef.current.entries())
    );
    setRefreshConnections(Date.now());
  };

  useEffect(() => {
    if (!addRelayConnections || addRelayConnections.length === 0) {
      console.warn("No WebSocket connections to create.");
      return;
    }
    console.log(
      "Creating WebSocket connections for URLs:",
      addRelayConnections
    );
    addRelayConnections.forEach((connection, index) => {
      const { id, url, type } = connection;
      if (connectionsRef.current.has(id)) {
        console.log(`⚠️ Connection for ${id} already exists. Skipping...`);
        return;
      }

      console.log(`🔌 Creating WebSocket connection for: ${url} [${type}]`);

      // Update the connections map
      addConnection(id, url, type, () => {}, 0);

      if (!initConnections) {
        setInitConnections(true);
      }
    });
  }, [addRelayConnections, initConnections]);

  return (
    <div>
      <h2>Dynamic WebSocket Component</h2>
      {console.log(
        "initConnections:",
        initConnections,
        " Connections: ",
        Array.from(connectionsRef.current.entries())
      )}
      {initConnections && connectionsRef.current.size > 0 ? (
        <>
          {Array.from(connectionsRef.current.entries()).map(
            ([id, connection], index) => (
              <WebSocketConnection
                key={`${id}-${index}`}
                connectionId={connection.id}
                url={connection.url}
                type={connection.type}
                onMessage={onMessage}
                onConnect={handleOnOpen}
                onError={(err) =>
                  console.error(`Error on ${connection.url}`, err)
                }
                registerSendMessage={registerSendMessage}
                setWsOpenSuccess={setWsOpenSuccess}
              />
            )
          )}
        </>
      ) : (
        <p>No connections.</p>
      )}
    </div>
  );
};

export default WebSocketManager;
