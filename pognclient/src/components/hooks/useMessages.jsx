import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

export default function useMessages(
  playerId,
  connections,
  sendMessageToUrl,
  setAddRelayConnections,
  setRemoveRelayConnections,
  setSignedInLobbies
) {
  const [messages, setMessages] = useState({});
  const [lobbyMessages, setLobbyMessages] = useState({});
  const [gameMessages, setGameMessages] = useState({});

  const handleSendMessage = useCallback(
    (id, message) => {
      const connection = connections.get(id);
      if (!connection) {
        console.warn(`⚠️ Connection ${id} not found`);
        return;
      }
      if (connection.readyState !== 1) {
        console.warn(`⚠️ Connection ${id} not ready`);
        return;
      }

      message.uuid = uuidv4();
      message.relayId = id;
      message.payload.player = playerId;

      console.log(`🚀 Sending message to ${id}`, message);
      sendMessageToUrl(id, message);
    },
    [connections, playerId, sendMessageToUrl]
  );

  const handleMessage = useCallback(
    (id, message) => {
      if (!message?.payload) return;

      setMessages((prev) => ({
        ...prev,
        [id]: [...(prev[id] || []), message],
      }));

      const { type, lobbyId, gameId, action, lobbyAddress } = message.payload;

      if (type === "lobby") {
        if (action === "newLobby" && lobbyId && lobbyAddress) {
          setRemoveRelayConnections((prev) =>
            prev.filter((conn) => conn.id !== lobbyId)
          );
          setAddRelayConnections((prev) => [
            ...prev,
            { id: lobbyId, url: lobbyAddress, type: "lobby" },
          ]);
          return;
        }

        setLobbyMessages((prev) => {
          const existing = prev[lobbyId] || [];
          if (existing[existing.length - 1]?.uuid === message.uuid) return prev;
          return {
            ...prev,
            [lobbyId]: [...existing, message],
          };
        });
        return;
      }

      if (type === "game") {
        setGameMessages((prev) => ({
          ...prev,
          [gameId]: [...(prev[gameId] || []), message],
        }));
        return;
      }

      console.warn(`⚠️ Unknown message type received from ${id}:`, message);
    },
    [setAddRelayConnections, setRemoveRelayConnections]
  );

  return {
    messages,
    lobbyMessages,
    gameMessages,
    handleMessage,
    handleSendMessage,
  };
}
