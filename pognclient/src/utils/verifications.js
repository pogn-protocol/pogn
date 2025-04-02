export function verifyLobbyMessage(message, truePlayerId, trueLobbyId) {
  console.log("Verifying lobby message:", message);
  if (!message || Object.keys(message).length === 0) {
    console.warn("Invalid message object:", message);
    return false;
  }
  if (!message.payload) {
    console.warn("No payload in message:", message);
    return false;
  }
  const { payload } = message;
  console.log(payload);
  const { action, gameId, playerId, lobbyId } = payload;

  if (!action) {
    console.warn("No action in payload:", payload);
    return false;
  }

  if (playerId !== truePlayerId) {
    console.warn("PlayerId mismatch:", playerId, truePlayerId);
  }

  if (lobbyId !== trueLobbyId) {
    console.warn("LobbyId mismatch:", lobbyId, trueLobbyId);
  }

  if (!gameId || !playerId || !lobbyId) {
    console.warn("Missing gameId, playerId, or lobbyId in payload:", payload);
    // return false;
  }

  return true;
}

export function verifyGameMessage(message) {
  console.log("Verifying game message:", message);

  if (!message || Object.keys(message).length === 0) {
    console.warn("❌ Invalid game message object:", message);
    return false;
  }

  const { payload } = message;
  if (!payload) {
    console.warn("❌ No payload in game message:", message);
    return false;
  }

  const { type, action, gameId } = payload;

  if (type !== "game") {
    console.warn("❌ Game message has wrong type:", type);
    return false;
  }

  if (!action) {
    console.warn("❌ No action in game payload:", payload);
    return false;
  }

  if (!gameId) {
    console.warn("❌ No gameId in game payload:", payload);
    return false;
  }

  return true;
}
