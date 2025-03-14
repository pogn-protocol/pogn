import { useState, useEffect, useCallback } from "react";

const useWebSocket = (url, { onOpen, onMessage }) => {
  const [ws, setWs] = useState(null);

  useEffect(() => {
    if (!url) return; // Do not open WebSocket if URL is not set

    const socket = new WebSocket(url);
    console.log("WebSocket connecting...");

    socket.onopen = () => {
      console.log("WebSocket connected");
      setWs(socket);
      if (onOpen) onOpen(socket); // Call onOpen callback
    };

    socket.onmessage = (event) => {
      if (onMessage) {
        const data = JSON.parse(event.data);
        console.log("Message received:", data);
        onMessage(data);
      }
    };

    socket.onclose = () => {
      console.warn("WebSocket disconnected", url);
      setWs(null);
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
        console.log("WebSocket closed", url);
      }
    };
  }, [url, onOpen, onMessage]);

  const sendMessage = useCallback(
    (message) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        console.log("Message sent:", message);
      } else {
        console.warn("WebSocket is not connected.");
      }
    },
    [ws]
  );

  return { ws, sendMessage };
};

export default useWebSocket;
