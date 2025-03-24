import { useEffect } from "react";
import useWebSocket from "react-use-websocket";

const WebSocketConnection = ({ url, type, onMessage, onOpen }) => {
  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(url, {
    onOpen: () => {
      console.log(`✅ Connected to ${type} WebSocket: ${url}`);
      // Pass the correct function to the onOpen callback
      if (onOpen) {
        onOpen(url, sendJsonMessage);
      }
    },
    onClose: () =>
      console.log(`🔴 Disconnected from ${type} WebSocket: ${url}`),
    onError: (e) => console.error(`❗ WebSocket error on ${type}:`, e),
    shouldReconnect: () => true,
  });

  useEffect(() => {
    if (lastJsonMessage) {
      console.log(`📥 Message from ${type} WebSocket:`, lastJsonMessage);
      onMessage(url, lastJsonMessage);
    }
  }, [lastJsonMessage, url, onMessage]);

  return null;
};

export default WebSocketConnection;
