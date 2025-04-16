function validateGameRelayMessageRecieved(message, relayId, knownGameIds) {
  console.log("validateing game relay message:", message);
  if (!message || typeof message !== "object") {
    return { isValid: false, error: "Invalid message object" };
  }

  const payload = message.payload;
  if (!payload) return { isValid: false, error: "No payload in message" };

  const { type, action, gameId, playerId } = payload;

  if (!type || type !== "game")
    return { isValid: false, error: "Type not set to 'game'" };
  if (!action)
    return { isValid: false, error: "No action in payload", message };
  if (!gameId)
    return { isValid: false, error: "No gameId in payload", message };
  if (!playerId)
    return { isValid: false, error: "No playerId in payload", message };

  if (
    message.relayId &&
    message.relayId !== relayId &&
    !Array.isArray(knownGameIds)
  ) {
    return {
      isValid: false,
      error: `Game relay ${relayId} received message for different relay: ${message.relayId}`,
      message,
    };
  }

  return { isValid: true, error: null, message };
}

function validateLobbyRelayMessageRecieved(message) {
  if (!message || typeof message !== "object" || !message.payload) {
    return {
      valid: false,
      error: "Invalid message structure or missing payload",
      message,
    };
  }

  const { type, action, lobbyId, playerId } = message.payload;
  if (type !== "lobby")
    return { valid: false, error: "Type is not 'lobby'", message };
  if (!action)
    return { valid: false, error: "Missing action in payload", message };
  if (!lobbyId)
    return { valid: false, error: "Missing lobbyId in payload", message };
  if (!playerId)
    return { valid: false, error: "Missing playerId in payload", message };

  return { valid: true, error: null };
}

module.exports = {
  validateGameRelayMessageRecieved,
  validateLobbyRelayMessageRecieved,
};
