import { use } from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import useWebSocket from "react-use-websocket";
import { v4 as uuidv4 } from "uuid";

const useWebSockets = (
  setLobbyWebSocketOpen,
  setStartGameConsole,
  setLobbyMessage,
  setGameMessage
) => {
  const [lobbyStatus, setLobbyStatus] = useState("disconnected");
  const [gameStatus, setGameStatus] = useState("disconnected");
  const [lobbyMessageHistory, setLobbyMessageHistory] = useState([]);
  const [gameMessageHistory, setGameMessageHistory] = useState([]);
  const [lobbyUrl, setLobbyUrl] = useState(null);
  const [gameUrl, setGameUrl] = useState(null);

  const sendLobbyMessage = (message) => {
    if (!message) return;

    //make sure they have type as lobby and action and payload
    if (
      !message.type ||
      message.type !== "lobby" ||
      !message.action ||
      !message.payload
    ) {
      console.error("⚠️ Invalid lobby message:", message);
      return;
    }

    const messageWithUUID = {
      ...message,
      uuid: uuidv4(), // 🔥 Generate a new UUID for each message
    };

    console.log("📤 Sending lobby message with UUID:", messageWithUUID);
    originalSendLobbyMessage(messageWithUUID);
  };

  const sendGameMessage = (message) => {
    if (!message) return;

    //make sure they have type as game and action and payload
    if (
      !message.type ||
      message.type !== "game" ||
      !message.action ||
      !message.payload
    ) {
      console.error("⚠️ Invalid game message:", message);
      return;
    }

    const messageWithUUID = {
      ...message,
      uuid: uuidv4(), // 🔥 Generate a new UUID for each message
    };

    console.log("📤 Sending game message with UUID:", messageWithUUID);
    originalSendGameMessage(messageWithUUID);
  };

  const updateUrl = (type, url) => {
    if (type === "lobby") {
      if (lobbyUrl === url) {
        console.log("Lobby URL is the same as the current URL");
        return;
      }
      setLobbyUrl(url);
    } else if (type === "game") {
      if (gameUrl === url) {
        console.log("Game URL is the same as the current URL");
        return;
      }
      setGameUrl(url);
    }
  };

  const {
    sendJsonMessage: originalSendLobbyMessage,
    lastJsonMessage: lastLobbyMessage,
  } = useWebSocket(lobbyUrl, {
    onOpen: () => {
      setLobbyStatus("connected");
      console.log("🔵 Lobby WebSocket opened");
      setLobbyWebSocketOpen(true);
    },
    onClose: () => {
      setLobbyStatus("disconnected");
      console.log("🔴 Lobby WebSocket closed");
    },
  });

  const {
    sendJsonMessage: originalSendGameMessage,
    lastJsonMessage: lastGameMessage,
  } = useWebSocket(gameUrl, {
    onOpen: () => {
      setGameStatus("connected");
      console.log("🔵 Game WebSocket opened");
      setStartGameConsole(true);
    },
    onClose: () => {
      setGameStatus("disconnected");
      console.log("🔴 Game WebSocket closed");
    },
  });

  const connect = (lobbyUrl, gameUrl) => {
    setLobbyUrl(lobbyUrl);
    setGameUrl(gameUrl);
  };

  const disconnect = () => {
    setLobbyUrl(null);
    setGameUrl(null);
  };

  useEffect(() => {
    if (lastLobbyMessage !== null) {
      //check if type not lobby or has no action or no payload
      setLobbyMessageHistory((prev) => prev.concat(lastLobbyMessage));
      console.log("Added message to lobbyMessageHistory", lobbyMessageHistory);
      if (
        typeof lastLobbyMessage !== "object" ||
        !lastLobbyMessage.type ||
        lastLobbyMessage.type !== "lobby" ||
        !lastLobbyMessage.action ||
        !lastLobbyMessage.payload
      ) {
        console.warn("⚠️ Skipping empty or invalid message:", lastLobbyMessage);
        return;
      }
      console.log("Sending Lobby message to Lobby:", lastLobbyMessage);
      setLobbyMessage(lastLobbyMessage);
    }
  }, [lastLobbyMessage]);

  useEffect(() => {
    if (lastGameMessage !== null) {
      setGameMessageHistory((prev) => prev.concat(lastGameMessage));
      console.log("Added message to gameMessageHistory", gameMessageHistory);
      if (
        typeof lastGameMessage !== "object" ||
        !lastGameMessage.type ||
        lastGameMessage.type !== "game" ||
        !lastGameMessage.action ||
        !lastGameMessage.payload
      ) {
        console.warn("⚠️ Skipping empty or invalid message:", lastGameMessage);
        return;
      }
      console.log("Sending Game message to Game Console:", lastGameMessage);
      setGameMessage(lastGameMessage);
    }
  }, [lastGameMessage]);

  return {
    sendLobbyMessage,
    sendGameMessage,
    connect,
    disconnect,
    updateUrl,
    lobbyStatus,
    gameStatus,
  };
};

export default useWebSockets;
