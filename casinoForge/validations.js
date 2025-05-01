function validateGameRelayMessageRecieved(message, relayId, knownGameIds) {
  console.log("Validating game relay message recieved", message);
  if (!message || typeof message !== "object")
    return { error: "Invalid message object" };
  const { type, action, gameId, playerId } = message;
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

function validateGameControllerResponse(payload) {
  console.log("Validating game controller response", payload);
  if (!payload || typeof payload !== "object")
    return { error: "Missing response object" };
  if (!payload?.action)
    return { error: "gameController Error: Missing action in response" };
  if (!payload?.gameId)
    return { error: "gameController Error: Missing gameId in response" };
  return {};
}

function validateGameAction(payload) {
  console.log("Validating game action", payload);
  const { gameId, playerId, gameAction, game } = payload;

  if (!gameId || !playerId) {
    return { error: { message: "Missing gameId or playerId" } };
  }

  if (!game) {
    return { error: { message: `Game ${gameId} not found` } };
  }

  if (gameAction === "playerReady") {
    const player = game.players.get(playerId);
    if (!player) {
      return { error: { message: `Player ${playerId} not in game` } };
    }

    if (player.ready) {
      return { skip: true }; // already ready, skip processing
    }

    return { readyCheck: true }; // continue to ready logic
  }

  return {}; // valid for all other actions
}

function validateLobbyRelayMessageRecieved(message) {
  console.log("Validating lobby relay message recieved", message);
  if (!message?.payload) return { error: "Missing payload in message" };
  const { type, action, lobbyId, playerId } = message.payload;

  if (type !== "lobby") return { error: "Payload type must be 'lobby'" };
  if (!action) return { error: "Missing action" };
  if (!lobbyId) return { error: "Missing lobbyId" };
  if (!playerId) return { error: "Missing playerId" };

  return {};
}

function validateLobbyControllerResponse(response) {
  console.log("Validating lobby controller response", response);
  if (!response || typeof response !== "object")
    return { error: "Missing response object" };
  if (!response?.action)
    return {
      error: "The lobbyController had a problem. Missing action in response",
    };
  if (!response?.lobbyId)
    return {
      error: "The lobbyController had a problem. Missing lobbyId in response",
    };
  return {};
}

function validateLobbyControllerAction(payload) {
  console.log("Validating lobby controller action", payload);
  const { action, playerId, gameId, gameType, lobbyId, lobby, gameTypes } =
    payload;
  switch (action) {
    case "gameConfigs":
      console.log("Validating lobby game configs", payload);
      if (!gameTypes) return { error: "Missing gameTypes" };
      if (!Array.isArray(gameTypes))
        return { error: "gameTypes must be an array" };

    case "login":
      console.log("Validating lobby login", payload);
      if (!lobbyId || !playerId)
        return { error: "Missing lobbyId or playerId" };
      if (!lobby) return { error: `Lobby ${lobbyId} not found` };
      // if (lobby.players.has(playerId))
      //return { error: "Player already in lobby" };
      return { lobby };

    case "joinGame": {
      console.log("Validating lobby join game", payload);
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
      console.log("Validating lobby refresh", payload);
      if (!lobbyId) return { error: "Missing lobbyId" };
      if (!lobby) return { error: `Lobby ${lobbyId} not found` };
      return { lobby, playerId };

    case "createLobby":
      console.log("Validating lobby creation", payload);
      if (!lobbyId) return { error: "Missing lobbyId" };
      if (lobbies.has(lobbyId))
        return { error: `Lobby ${lobbyId} already exists` };
      return {};

    case "createNewGame":
      console.log("Validating lobby create game", payload);
      if (!lobby) return { error: `Lobby ${lobbyId} not found` };
      if (!gameType) return { error: "Missing gameType" };
      if (!playerId) return { error: "Missing playerId" };
      console.log("lobby.games", lobby.games);
      console.log("is Map?", lobby.games instanceof Map);
      console.log("gameId", gameId);
      console.log("has game", lobby.games.has(gameId));
      if (lobby.games.has(gameId))
        return { error: `Game ${gameId} already exists` };
      return { lobby };

    case "gameEnded": {
      console.log("Validating lobby game ended", payload);
      if (!lobby || !gameId) return { error: "Missing lobby or gameId" };
      const game = lobby.getGame(gameId);
      if (!game) return { error: "Game not found" };
      return { lobby, gameId, game };
    }

    case "startGame": {
      console.log("Validating lobby start game", payload);
      if (!lobby || !gameId) return { error: "Missing lobby or gameId" };
      const game = lobby.getGame(gameId);
      if (!game) return { error: "Game not found" };
      return { lobby, game };
    }

    case "postGameResult":
      console.log("Validating lobby post game result", payload);
      if (!lobby) return { error: "Lobby not found" };
      if (!playerId) return { error: "Missing playerId" };
      return { lobby };

    case "gameInvite": {
      console.log("Validating lobby game invite", payload);
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
