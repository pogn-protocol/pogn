function verifyGameRelayMessageRecieved(message, relayId, knownGameIds) {
  if (!message || typeof message !== "object") {
    return { isValid: false, error: "Invalid message object" };
  }

  const payload = message.payload;
  if (!payload) return { isValid: false, error: "No payload in message" };

  const { type, action, gameId, playerId } = payload;

  if (!type || type !== "game")
    return { isValid: false, error: "Type not set to 'game'" };
  if (!action) return { isValid: false, error: "No action in payload" };
  if (!gameId) return { isValid: false, error: "No gameId in payload" };
  if (!playerId) return { isValid: false, error: "No playerId in payload" };

  if (
    message.relayId &&
    message.relayId !== relayId &&
    !Array.isArray(knownGameIds)
  ) {
    return {
      isValid: false,
      error: `Game relay ${relayId} received message for different relay: ${message.relayId}`,
    };
  }

  return { isValid: true, error: null };
}

function verifyLobbyRelayMessageRecieved(message) {
  if (!message || typeof message !== "object" || !message.payload) {
    return {
      valid: false,
      error: "Invalid message structure or missing payload",
    };
  }

  const { type, action, lobbyId, playerId } = message.payload;
  if (type !== "lobby") return { valid: false, error: "Type is not 'lobby'" };
  if (!action) return { valid: false, error: "Missing action in payload" };
  if (!lobbyId) return { valid: false, error: "Missing lobbyId in payload" };
  if (!playerId) return { valid: false, error: "Missing playerId in payload" };

  return { valid: true, error: null };
}

module.exports = {
  verifyGameRelayMessageRecieved,
  verifyLobbyRelayMessageRecieved,
};
