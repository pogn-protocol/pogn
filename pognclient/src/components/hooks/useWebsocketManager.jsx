import { useState, useCallback } from "react";
import useWebSocket from "react-use-websocket";

const useWebSocketManager = () => {
  const [connections, setConnections] = useState(new Map());

  const getConnection = useCallback(
    (url) => {
      if (!connections.has(url)) {
        const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(
          url,
          { share: true }
        );

        const newConnection = { sendJsonMessage, lastJsonMessage, readyState };
        setConnections((prev) => new Map(prev).set(url, newConnection));

        return newConnection;
      }

      return connections.get(url);
    },
    [connections]
  );

  return { getConnection };
};

export default useWebSocketManager;
