import { useState, useEffect, useMemo, useCallback } from "react";
import useWebSocket from "react-use-websocket";
import { v4 as uuidv4 } from "uuid";

const useWebSockets = (playerId, startGameWebSocket) => {
  const [lobbyMessage, setLobbyMessage] = useState(null);
  const [lobbyMessageHistory, setLobbyMessageHistory] = useState([]);
  const [gameMessage, setGameMessage] = useState(null);
  const [gameMessageHistory, setGameMessageHistory] = useState([]);

  // WebSocket connections for lobby and game
  const lobbyUrl = useMemo(
    () => (playerId ? "ws://localhost:8080" : null),
    [playerId]
  );
  const gameUrl = useMemo(
    () => (startGameWebSocket ? "ws://localhost:9000" : null),
    [startGameWebSocket]
  );

  // WebSocket connection for Lobby
  const {
    sendJsonMessage: sendLobbyMessage,
    lastJsonMessage: lastLobbyMessage,
  } = useWebSocket(lobbyUrl, {
    onOpen: () => console.log("🔵 Lobby WebSocket opened"),
    onClose: () => console.log("🔴 Lobby WebSocket closed"),
  });

  // WebSocket connection for Game
  const { sendJsonMessage: sendGameMessage, lastJsonMessage: lastGameMessage } =
    useWebSocket(gameUrl, {
      onOpen: () => console.log("🔵 Game WebSocket opened"),
      onClose: () => console.log("🔴 Game WebSocket closed"),
    });

  // Handle lobby message updates
  useEffect(() => {
    if (lastLobbyMessage !== null) {
      setLobbyMessageHistory((prev) => prev.concat(lastLobbyMessage));
      console.log("📥 Received lobby message:", lastLobbyMessage);

      if (
        typeof lastLobbyMessage !== "object" ||
        !lastLobbyMessage.type ||
        lastLobbyMessage.type !== "lobby" ||
        !lastLobbyMessage.action ||
        !lastLobbyMessage.payload
      ) {
        console.warn("⚠️ Skipping invalid lobby message:", lastLobbyMessage);
        return;
      }
      setLobbyMessage(lastLobbyMessage);
    }
  }, [lastLobbyMessage]);

  // Handle game message updates
  useEffect(() => {
    if (lastGameMessage !== null) {
      setGameMessageHistory((prev) => prev.concat(lastGameMessage));
      console.log("📥 Received game message:", lastGameMessage);

      if (
        typeof lastGameMessage !== "object" ||
        !lastGameMessage.type ||
        lastGameMessage.type !== "game" ||
        !lastGameMessage.action ||
        !lastGameMessage.payload
      ) {
        console.warn("⚠️ Skipping invalid game message:", lastGameMessage);
        return;
      }
      setGameMessage(lastGameMessage);
    }
  }, [lastGameMessage]);

  // Send message helper
  const sendMessage = useCallback(
    (message, type) => {
      if (!message) return;

      const isValidMessage = message.type && message.action && message.payload;

      if (!isValidMessage) {
        console.error("⚠️ Invalid message:", message);
        return;
      }

      const messageWithUUID = {
        ...message,
        uuid: uuidv4(),
      };

      if (type === "lobby") {
        console.log("📤 Sending lobby message:", messageWithUUID);
        sendLobbyMessage(messageWithUUID);
      } else if (type === "game") {
        console.log("📤 Sending game message:", messageWithUUID);
        sendGameMessage(messageWithUUID);
      }
    },
    [sendLobbyMessage, sendGameMessage]
  );

  return {
    lobbyMessage,
    lobbyMessageHistory,
    gameMessage,
    gameMessageHistory,
    sendLobbyMessage: (msg) => sendMessage(msg, "lobby"),
    sendGameMessage: (msg) => sendMessage(msg, "game"),
  };
};

export default useWebSockets;
