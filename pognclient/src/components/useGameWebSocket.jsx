import { useState, useEffect } from "react";
import useWebSocket from "react-use-websocket";

const useGameWebSocket = (id, url, type, onMessage, setWsOpenSuccess) => {
  const [readyState, setReadyState] = useState(null);

  const {
    sendJsonMessage,
    lastJsonMessage,
    readyState: wsReadyState,
  } = useWebSocket(url, {
    share: true,
    onOpen: () => {
      console.log(`✅ Connected to ${id} at ${url} [${type}]`);
      setWsOpenSuccess(Date.now());
      setReadyState(1);
    },
    onMessage: (event) => {
      const message = JSON.parse(event.data);
      console.log(`📥 Message from ${id} [${type}]:`, message);
      if (onMessage) onMessage(id, message);
    },
    onError: (event) => {
      console.error(`❌ WebSocket error on ${id} [${type}]:`, event);
      setReadyState(3); // CLOSED
    },
  });

  useEffect(() => {
    setReadyState(wsReadyState);
  }, [wsReadyState]);

  return { sendJsonMessage, readyState, lastJsonMessage };
};

export default useGameWebSocket;
