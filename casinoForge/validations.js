function validateGameRelayMessageRecieved(message, relayId, knownGameIds) {
  if (!message || typeof message !== "object")
    return { error: "Invalid message object" };
  const { payload } = message;
  if (!payload) return { error: "No payload in message" };

  const { type, action, gameId, playerId } = payload;
  if (type !== "game") return { error: "Type must be 'game'" };
  if (!action) return { error: "Missing action" };
  if (!gameId) return { error: "Missing gameId" };
  if (!playerId) return { error: "Missing playerId" };

  if (
    message.relayId &&
    message.relayId !== relayId &&
    !Array.isArray(knownGameIds)
  ) {
    return { error: `Message sent to wrong relay: ${message.relayId}` };
  }

  return {};
}

function validateGameControllerResponse(response) {
  if (!response || typeof response !== "object")
    return { error: "Missing response object" };
  const payload = response.payload;
  if (!payload?.action) return { error: "Missing action in response" };
  if (!payload?.gameId) return { error: "Missing gameId in response" };
  return {};
}

function validateGameAction(payload) {
  const { gameId, playerId, gameAction, game } = payload;
  if (!gameId || !playerId) return { error: "Missing gameId or playerId" };
  if (!game) return { error: `Game ${gameId} not found` };

  if (gameAction === "playerReady") {
    const player = game.players.get(playerId);
    if (!player) return { error: `Player ${playerId} not in game` };
    if (game.getGameDetails()?.gameStatus === "in-progress")
      return { exit: true };
  }

  if (typeof game.instance.processAction !== "function") {
    return { error: "Game missing processAction method" };
  }

  return {};
}

function validateLobbyRelayMessageRecieved(message) {
  if (!message?.payload) return { error: "Missing payload in message" };
  const { type, action, lobbyId, playerId } = message.payload;

  if (type !== "lobby") return { error: "Payload type must be 'lobby'" };
  if (!action) return { error: "Missing action" };
  if (!lobbyId) return { error: "Missing lobbyId" };
  if (!playerId) return { error: "Missing playerId" };

  return {};
}

function validateLobbyControllerResponse(response) {
  if (!response || typeof response !== "object")
    return { error: "Missing response object" };
  const payload = response.payload;
  if (!payload?.action) return { error: "Missing action in response" };
  if (!payload?.lobbyId) return { error: "Missing lobbyId in response" };
  return {};
}

function validateLobbyControllerAction(payload, context = {}) {
  const { action, lobbyId, playerId, gameId, gameType } = payload;
  const { lobbies } = context;
  const lobby = lobbies?.get(lobbyId);

  switch (action) {
    case "login":
      if (!lobbyId || !playerId)
        return { error: "Missing lobbyId or playerId" };
      if (!lobby) return { error: `Lobby ${lobbyId} not found` };
      if (lobby.players.has(playerId))
        return { error: "Player already in lobby" };
      return { lobby };

    case "joinGame": {
      if (!lobby) return { error: `Lobby ${lobbyId} not found` };
      const game = lobby.getGame(gameId);
      if (!game) return { error: "Game not found" };
      if (game.players.has(playerId))
        return { error: "Player already in game" };
      if (game.players.size >= game.instance.maxPlayers)
        return { error: "Game is full" };
      if (game.isPrivate && !game.allowedPlayers.includes(playerId))
        return { error: "Not invited to private game" };

      let newLobbyStatus = null;
      const size = game.players.size + 1;
      if (size >= game.instance.maxPlayers) newLobbyStatus = "readyToStart";
      else if (size >= game.instance.minPlayers) newLobbyStatus = "canStart";

      return { lobby, game, newLobbyStatus };
    }

    case "refreshLobby":
      if (!lobbyId) return { error: "Missing lobbyId" };
      if (!lobby) return { error: `Lobby ${lobbyId} not found` };
      return { lobby, playerId };

    case "createLobby":
      if (!lobbyId) return { error: "Missing lobbyId" };
      if (lobbies.has(lobbyId))
        return { error: `Lobby ${lobbyId} already exists` };
      return {};

    case "createGame":
      if (!lobby) return { error: `Lobby ${lobbyId} not found` };
      if (!gameType) return { error: "Missing gameType" };
      if (!playerId) return { error: "Missing playerId" };
      return { lobby };

    case "gameEnded": {
      if (!lobby || !gameId) return { error: "Missing lobby or gameId" };
      const game = lobby.getGame(gameId);
      if (!game) return { error: "Game not found" };
      return { lobby, gameId, game };
    }

    case "startGame": {
      if (!lobby || !gameId) return { error: "Missing lobby or gameId" };
      const game = lobby.getGame(gameId);
      if (!game) return { error: "Game not found" };
      return { lobby, game };
    }

    case "postGameResult":
      if (!lobby) return { error: "Lobby not found" };
      if (!playerId) return { error: "Missing playerId" };
      return { lobby };

    case "gameInvite": {
      if (!lobby) return { error: "Lobby not found" };
      const game = lobby.getGame(gameId);
      if (!game) return { error: "Game not found" };
      return { lobby, game };
    }

    default:
      return { lobby: lobby || null };
  }
}

module.exports = {
  validateGameRelayMessageRecieved,
  validateGameControllerResponse,
  validateGameAction,
  validateLobbyRelayMessageRecieved,
  validateLobbyControllerResponse,
  validateLobbyControllerAction,
};
