import { useState, useEffect, useCallback, useRef } from "react";

const RECONNECT_DELAY = 10000; // 🔥 2-second debounce for reconnections

const useWebSocket = (url, { onOpen, onMessage }) => {
  const [ws, setWs] = useState(null);
  const [attemptReconnect, setAttemptReconnect] = useState(false);
  const reconnectTimer = useRef(null); // ✅ Prevent multiple timers

  useEffect(() => {
    if (ws) {
      console.log("WebSocket already exists", ws);
    }
    if (url) {
      console.log("WebSocket URL", url);
    }

    if (!url || ws) return; // ✅ Avoid creating multiple connections
    console.log("🌐 Attempting WebSocket connection to:", url);
    const socket = new WebSocket(url);

    socket.onopen = () => {
      console.log(`✅ WebSocket connected to ${url}`);
      setWs(socket);
      setAttemptReconnect(false); // ✅ Reset reconnection flag
      if (onOpen) onOpen(socket);
    };

    socket.onmessage = (event) => {
      if (onMessage) {
        try {
          const data = JSON.parse(event.data);
          console.log(`📨 Message received from ${url}:`, data);
          onMessage(data);
        } catch (err) {
          console.error("❌ Failed to parse WebSocket message:", err);
        }
      }
    };

    socket.onclose = () => {
      console.warn(`⚠️ WebSocket disconnected from ${url}`);
      setWs(null);

      // if (!attemptReconnect) {
      //   setAttemptReconnect(true);

      //   // ✅ Prevent multiple reconnection timers from stacking
      //   if (reconnectTimer.current) {
      //     clearTimeout(reconnectTimer.current);
      //   }

      //   reconnectTimer.current = setTimeout(() => {
      //     console.log(
      //       `🤖 Reconnecting WebSocket to ${url} after ${
      //         RECONNECT_DELAY / 1000
      //       }s...`
      //     );
      //     setWs(null); // ✅ Reset before retrying
      //   }, RECONNECT_DELAY);
      // }
    };

    socket.onerror = (err) => {
      console.error(`🚨 WebSocket error at ${url}:`, err);
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
        // console.log(`🔴 WebSocket manually closed at ${url}`);
      }
    };
  }, [url, onOpen, onMessage, attemptReconnect]);

  const sendMessage = useCallback(
    (message) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        console.log("📤 Message sent:", message);
      } else {
        console.warn(
          `❌ Cannot send message, WebSocket not connected to ${url}`
        );
      }
    },
    [ws, url]
  );

  return { ws, sendMessage };
};

export default useWebSocket;
