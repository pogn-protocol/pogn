import React, { useState, useCallback, useEffect } from "react";
import WebSocketConnection from "./webSocketConnection";
import {
  JsonView,
  allExpanded,
  darkStyles,
  defaultStyles,
} from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";

const WebSocketManager = ({
  initialUrls,
  type,
  connectionsRef,
  updateConnections,
  updateMessages,
  setSendMessageToUrl,
  setAddConnection,
  // setInitialConnections,
  setIsInitialized,
}) => {
  console.log("🔗 WebSocketManager:", initialUrls, type);
  const [urls, setUrls] = useState(initialUrls);
  const [messages, setMessages] = useState({});

  // ✅ Memoize this function to prevent infinite loop
  const handleIncomingMessage = useCallback(
    (url, message) => {
      setMessages((prev) => ({
        ...prev,
        [url]: [...(prev[url] || []), message],
      }));
      if (updateMessages) {
        updateMessages({ url, message });
      }
    },
    [updateMessages]
  );

  const handleNewConnection = useCallback(
    (url, sendMessage) => {
      console.log(`✅ Storing new connection for URL: ${url}`);

      const existingConnection = connectionsRef.current.get(url);
      if (existingConnection) {
        console.warn(`⚠️ Connection for ${url} already exists.`);
        return;
      }

      const connection = {
        url,
        sendMessage: (message) => {
          console.log(`📝 Sending message via connection: ${url}`, message);
          if (typeof sendMessage === "function") {
            sendMessage(message);
          } else {
            console.warn(`⚠️ sendMessage is not a function for URL: ${url}`);
          }
        },
        type,
      };

      connectionsRef.current.set(url, connection);
      const updatedConnections = Array.from(connectionsRef.current.values());

      // Compare new and previous connections to prevent looping
      const prevConnectionUrls = updatedConnections.map((conn) => conn.url);
      if (!prevConnectionUrls.includes(url)) {
        console.log(
          "🔁 Updating connections from WebSocketManager:",
          updatedConnections
        );
        updateConnections(updatedConnections);
        console.log(`✅ New connection stored for ${type} at ${url}`);
      } else {
        console.log(`⚠️ No change in connections for URL: ${url}`);
      }
    },
    [connectionsRef, updateConnections, type]
  );

  // ✅ Memoize to avoid infinite loop
  const sendMessageToUrl = useCallback(
    (url, message) => {
      console.log(`📤 Sending message to ${url}:`, message);
      const connection = connectionsRef.current.get(url);
      console.log("Retrieved connection from map:", connection);

      if (connection && typeof connection.sendMessage === "function") {
        console.log(`📝 Sending message via connection: ${url}`, message);
        connection.sendMessage(message); // Properly call the function
      } else {
        console.warn(`⚠️ No valid sendMessage function for URL: ${url}`);
      }
    },
    [connectionsRef]
  );

  useEffect(() => {
    setSendMessageToUrl(() => sendMessageToUrl);
    setAddConnection(() => handleNewConnection);
    console.log("✅ Initialized functions in WebSocketManager");

    setIsInitialized(true);
  }, [
    sendMessageToUrl,
    handleNewConnection,
    setSendMessageToUrl,
    setAddConnection,
  ]);

  return (
    <div>
      <h2>Active WebSocket Connections</h2>
      <ul>
        {urls.map((url, index) => (
          <li key={index}>
            Connection {index + 1}: {url}
            <button onClick={() => sendMessageToUrl(url, { message: "test" })}>
              Send Test Message
            </button>
            <WebSocketConnection
              key={url}
              url={url}
              type={type}
              onMessage={handleIncomingMessage}
              onOpen={(url, sendMessage) => {
                console.log(`🟢 WebSocket opened for URL: ${url}`);
                handleNewConnection(url, sendMessage); // Pass the correct function
              }}
            />
          </li>
        ))}
      </ul>
      <h3>Messages</h3>
      <JsonView
        data={messages}
        shouldExpandNode={(level) => level === 0}
        style={{ fontSize: "14px", lineHeight: "1.2" }}
      />
    </div>
  );
};

export default WebSocketManager;
