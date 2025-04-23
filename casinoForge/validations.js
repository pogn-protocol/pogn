function validateGameRelayMessageRecieved(message, relayId, knownGameIds) {
  console.log("validating game relay message recieved:", message);
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

function validateGameControllerResponse(response) {
  console.log("validating game controller response:", response);
  if (!response || typeof response !== "object") {
    throw new Error("Invalid game payload: missing or incorrect structure.");
  }
  const payload = response?.payload;

  if (!payload.action) {
    throw new Error("Invalid game payload: missing action.");
  }

  if (!payload.gameId) {
    throw new Error("Invalid game payload: missing gameId.");
  }
  return true;
}

function validateGameAction(payload, game) {
  const { gameId, playerId, gameAction } = payload;

  if (!gameId || !playerId) {
    return {
      valid: false,
      error: {
        type: "invalidPayload",
        message: "Missing gameId or playerId",
        payload,
      },
    };
  }

  if (!game) {
    return {
      valid: false,
      error: {
        type: "gameNotFound",
        message: `Game ${gameId} not found.`,
        payload,
      },
    };
  }

  if (gameAction === "playerReady") {
    const player = game.players.get(playerId);
    if (!player) {
      return {
        valid: false,
        error: {
          type: "playerNotFound",
          message: `Player ${playerId} not in game.`,
          payload,
        },
      };
    }

    if (game.getGameDetails()?.gameStatus === "in-progress") {
      return { valid: true, skip: true };
    }

    return { valid: true, readyCheck: true };
  }

  if (typeof game.instance.processAction !== "function") {
    return {
      valid: false,
      error: {
        type: "invalidGame",
        message: "Game instance does not have processAction.",
        payload,
      },
    };
  }

  return { valid: true };
}

function validateLobbyRelayMessageRecieved(message) {
  console.log("validating lobby relay message Recieved:", message);
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

function validateLobbyControllerResponse(response) {
  console.log("validating lobby controller response:", response);
  if (!response || typeof response !== "object") {
    throw new Error("Invalid lobby payload: missing or incorrect structure.");
  }

  if (!response.payload) {
    throw new Error("Invalid lobby payload: missing payload.");
  }
  const payload = response?.payload;

  if (!payload.action) {
    throw new Error("Invalid lobby payload: missing action.");
  }

  if (!payload.lobbyId) {
    throw new Error("Invalid lobby payload: missing lobbyId.");
  }

  return true;
}

function validateLobbyControllerAction(action, payload = {}, context = {}) {
  const { lobbies } = context;

  switch (action) {
    case "startGame": {
      const { lobbyId, gameId } = payload;
      const lobby = lobbies.get(lobbyId);
      if (!lobby)
        return { valid: false, reason: `Lobby ${lobbyId} not found.`, payload };

      const game = lobby.getGame(gameId);
      if (!game)
        return {
          valid: false,
          reason: `Game with ID ${gameId} not found in lobby.`,
          payload,
        };

      return { valid: true, enrichedPayload: { lobby, game } };
    }

    case "joinGame": {
      const { lobbyId, gameId, playerId } = payload;
      const lobby = lobbies.get(lobbyId);
      if (!lobby)
        return { valid: false, reason: `Lobby ${lobbyId} not found.`, payload };

      const game = lobby.getGame(gameId);
      if (!game)
        return { valid: false, reason: `Game ${gameId} not found.`, payload };

      if (game.players.has(playerId)) {
        return {
          valid: false,
          reason: `Player ${playerId} already in the game.`,
          payload,
        };
      }

      if (game.players.size >= game.instance.maxPlayers) {
        return {
          valid: false,
          reason: `Game is full (max ${game.instance.maxPlayers}).`,
          payload,
        };
      }

      if (game.isPrivate && !game.allowedPlayers.includes(playerId)) {
        return {
          valid: false,
          reason: `PRIVATE GAME: Player ${playerId} is not invited.`,
          payload,
        };
      }

      let newStatus = null;
      if (game.players.size + 1 >= game.instance.maxPlayers) {
        newStatus = "readyToStart";
      } else if (game.players.size + 1 >= game.instance.minPlayers) {
        newStatus = "canStart";
      }

      return {
        valid: true,
        enrichedPayload: { lobby, game, newLobbyStatus: newStatus },
      };
    }

    case "gameInvite": {
      const { lobbyId, gameId } = payload;
      const lobby = lobbies.get(lobbyId);
      if (!lobby)
        return { valid: false, reason: `Lobby ${lobbyId} not found.`, payload };

      const game = lobby.getGame(gameId);
      if (!game)
        return { valid: false, reason: `Game ${gameId} not found.`, payload };

      return { valid: true, enrichedPayload: { lobby, game } };
    }

    case "createGame": {
      const { lobbyId, gameType, playerId } = payload;
      const lobby = lobbies.get(lobbyId);
      if (!lobby)
        return { valid: false, reason: `Lobby ${lobbyId} not found.`, payload };
      if (!gameType)
        return { valid: false, reason: `Missing gameType.`, payload };
      if (!playerId)
        return { valid: false, reason: `Missing playerId.`, payload };

      return { valid: true, enrichedPayload: { lobby } };
    }

    case "postGameResult": {
      const { lobbyId, playerId } = payload;
      const lobby = lobbies.get(lobbyId);
      if (!lobby)
        return { valid: false, reason: `Lobby ${lobbyId} not found.`, payload };
      if (!playerId)
        return { valid: false, reason: `Missing playerId.`, payload };

      return { valid: true, enrichedPayload: { lobby } };
    }

    default:
      return {
        valid: true,
        enrichedPayload: { lobby: lobbies.get(payload.lobbyId) || null },
      };
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
