import React, { useState, useEffect, useRef, useCallback } from "react";
import { use } from "react";
import useWebSocket from "react-use-websocket";

const WebSocketConnection = ({
  url,
  type,
  onMessage,
  onConnect,
  onError,
  registerSendMessage,
  setConnectionsUpdated,
}) => {
  const { sendJsonMessage, readyState } = useWebSocket(url, {
    share: true,
    onOpen: () => {
      console.log(`✅ Connected to ${url} [${type}]`);
      if (onConnect) onConnect(url);
      if (registerSendMessage) registerSendMessage(url, sendJsonMessage);
      if (setConnectionsUpdated) setConnectionsUpdated(Date.now());
    },
    onMessage: (event) => {
      const message = JSON.parse(event.data);
      console.log(`📥 Message from ${url} [${type}]:`, message);
      if (onMessage) onMessage(url, message, type);
    },
    onError: (event) => {
      console.error(`❌ WebSocket error at ${url} [${type}]:`, event);
      if (onError) onError(url, event, type);
    },
  });

  //clean up
  useEffect(() => {
    return () => {
      console.log(`🔌 Closing WebSocket connection to ${url} [${type}]`);
      sendJsonMessage({ type, action: "disconnect" });
    };
  }, [url, type, sendJsonMessage]);

  return (
    <div>
      <h3>
        WebSocket: {url} [{type}]
      </h3>
      <p>Ready State: {readyState}</p>
      <button onClick={() => sendJsonMessage({ action: "ping" })}>
        Send Ping
      </button>
    </div>
  );
};

const WebSocketManager = ({
  urls,
  onMessage,
  onConnect,
  onError,
  setSendMessage,
  connectionsRef,
  setConnectionsUpdated,
}) => {
  const sendMessage = useCallback(
    (url, message) => {
      console.log(`📤 Sending message to ${url}:`, message);
      const sendFunction = connectionsRef.current.get(url);
      if (sendFunction) {
        try {
          sendFunction(message);
          console.log(`✅ Message sent to ${url}`);
        } catch (error) {
          console.error(`❌ Failed to send message to ${url}:`, error);
        }
      } else {
        console.warn(`⚠️ No active WebSocket connection for ${url}`);
      }
    },
    [connectionsRef]
  );

  // Register send functions in the connection map
  const registerSendMessage = useCallback(
    (url, sendJsonMessage) => {
      const existingConnection = connectionsRef.current.get(url) || {};
      connectionsRef.current.set(url, {
        ...existingConnection, // Preserve existing properties
        sendJsonMessage, // Update or add the sendJsonMessage function
        //readyState: 1, // Make sure to update the ready state
      });
      console.log(`💾 Registered send function for ${url}`);
    },
    [connectionsRef]
  );

  const handleOnOpen = useCallback(
    (url) => {
      console.log(`
        ✅ Connected to ${url}
        `);
      const existingConnection = connectionsRef.current.get(url) || {};
      connectionsRef.current.set(url, {
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

  const updateConnections = (url, type, sendJsonMessage, readyState) => {
    const existingConnection = connectionsRef.current.get(url) || {};
    connectionsRef.current.set(url, {
      ...existingConnection,
      type,
      sendJsonMessage,
      readyState,
    });
    // setConnectionsUpdated(Date.now()); // Update the timestamp to trigger a re-render
    console.log(
      "✅ Updated connections:",
      Array.from(connectionsRef.current.entries())
    );
  };

  useEffect(() => {
    if (!urls || urls.length === 0) {
      console.warn("No WebSocket connections to create.");
      return;
    }

    urls.forEach((connection) => {
      const { url, type } = connection;
      if (!connectionsRef.current.has(url)) {
        console.log(`🔌 Creating WebSocket connection for: ${url} [${type}]`);
        updateConnections(url, type, () => {}, 0);
      } else {
        console.log(`⚠️ Connection for ${url} already exists. Skipping...`);
      }
    });
  }, [urls]);

  return (
    <div>
      <h2>Dynamic WebSocket Component</h2>
      {urls.map(({ url, type }, index) => (
        <WebSocketConnection
          key={`${url}-${index}`} // Combine URL with index
          url={url}
          type={type}
          onMessage={onMessage}
          onConnect={handleOnOpen}
          onError={(err) => console.error(`Error on ${url}`, err)}
          registerSendMessage={registerSendMessage}
          setConnectionsUpdated={setConnectionsUpdated}
        />
      ))}
    </div>
  );
};

export default WebSocketManager;
