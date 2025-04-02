import { useEffect, useCallback, useRef, useState } from "react";
import useWebSocket from "react-use-websocket";

const useRelayConnection = ({
  id,
  url,
  type,
  onMessage,
  setConnections,
  closingConnections,
  manualCloseRef,
}) => {
  const [prevMessage, setPrevMessage] = useState(null);
  const reconnectTimeoutRef = useRef(null);

  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(url, {
    shouldReconnect: () => !manualCloseRef.current,
    reconnectAttempts: 5,
    reconnectInterval: 3000,
    share: true,
  });

  const updateConnection = useCallback(() => {
    setConnections((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(id) || {};
      newMap.set(id, {
        ...existing,
        sendJsonMessage,
        readyState,
        url,
        type,
        customReadyState:
          readyState === 3 && !closingConnections.has(id) ? 4 : readyState,
      });
      return newMap;
    });
  }, [
    id,
    url,
    type,
    sendJsonMessage,
    readyState,
    setConnections,
    closingConnections,
  ]);

  useEffect(() => {
    updateConnection();

    if (readyState === 1) {
      clearTimeout(reconnectTimeoutRef.current);
    } else if (readyState === 3 && !closingConnections.has(id)) {
      reconnectTimeoutRef.current = setTimeout(() => {
        setConnections((prev) => {
          const newMap = new Map(prev);
          newMap.delete(id);
          return newMap;
        });
      }, 10000);
    }
  }, [readyState, updateConnection]);

  useEffect(() => {
    if (lastJsonMessage && lastJsonMessage !== prevMessage) {
      onMessage(id, lastJsonMessage);
      setPrevMessage(lastJsonMessage);
    }
  }, [lastJsonMessage, id, onMessage, prevMessage]);

  return { sendJsonMessage, readyState };
};

export default useRelayConnection;
