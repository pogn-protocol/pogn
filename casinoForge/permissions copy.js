const { PERMISSIONS } = require("../pognConfigs");

function checkLobbyRelayPermissions(message) {
  console.log("Checking lobby relay permissions:", message);
  const { playerId, action, lobbyId } = message.payload || {};
  const rules =
    PERMISSIONS.lobby.lobbies[lobbyId] || PERMISSIONS.lobby.general || {};
  console.log("Lobby relay rules:", rules);

  if (
    rules.allowedActions &&
    !rules.allowedActions.includes("*") &&
    !rules.allowedActions.includes(action)
  ) {
    console.log("Lobby relay permissions check failed:", message);
    return { allowed: false, reason: `Action '${action}' not permitted.` };
  }

  if (
    rules.allowedPlayers &&
    !rules.allowedPlayers.includes("*") &&
    !rules.allowedPlayers.includes(playerId)
  ) {
    console.log("Lobby relay permissions check failed:", message);
    return { allowed: false, reason: `Player '${playerId}' not permitted.` };
  }

  console.log("Lobby relay permissions check passed:", message);
  return { allowed: true };
}

function checkLobbyControllerPermissions(message, lobbiesMap = new Map()) {
  console.log("Checking lobby controller permissions:", message);
  const { playerId, action, lobbyId } = message.payload || {};
  const rules =
    PERMISSIONS.lobby.lobbies[lobbyId] || PERMISSIONS.lobby.general || {};

  // ❌ Deny if action not allowed
  if (
    rules.allowedActions &&
    !rules.allowedActions.includes("*") &&
    !rules.allowedActions.includes(action)
  ) {
    return {
      allowed: false,
      reason: `Action '${action}' not allowed in controller.`,
    };
  }

  // ❌ Deny if player not allowed
  if (
    rules.allowedPlayers &&
    !rules.allowedPlayers.includes("*") &&
    !rules.allowedPlayers.includes(playerId)
  ) {
    return {
      allowed: false,
      reason: `Player '${playerId}' not allowed in controller.`,
    };
  }

  // ❌ Enforce max lobby limit on "createLobby"
  if (
    action === "createLobby" &&
    lobbiesMap.size >= (PERMISSIONS.lobby.general.maxLobbies || Infinity)
  ) {
    return {
      allowed: false,
      reason: `Lobby creation limit reached: max ${PERMISSIONS.lobby.general.maxLobbies}`,
    };
  }

  if (action === "createNewGame" && lobbiesMap.has(lobbyId)) {
    const currentLobby = lobbiesMap.get(lobbyId);
    const currentGameCount = currentLobby.getLobbyGames()?.length || 0;
    const maxGamesAllowed = rules.maxGames ?? Infinity;

    if (currentGameCount >= maxGamesAllowed) {
      return {
        allowed: false,
        reason: `Game creation limit reached in lobby '${lobbyId}': max ${maxGamesAllowed}`,
      };
    }
  }

  // ❌ Enforce max players in lobby on "login"
  if (action === "login" && lobbiesMap.has(lobbyId)) {
    const lobby = lobbiesMap.get(lobbyId);
    console.log("Lobby found:", lobby);
    const currentPlayerCount = lobby.getLobbyPlayers()?.length || 0;
    console.log("Current player count:", currentPlayerCount);
    const rules =
      PERMISSIONS.lobby.lobbies[lobbyId] || PERMISSIONS.lobby.general || {};
    const maxPlayers =
      rules.maxPlayers ?? PERMISSIONS.lobby.general.maxPlayers ?? Infinity;

    if (currentPlayerCount >= maxPlayers) {
      return {
        allowed: false,
        reason: `Lobby '${lobbyId}' is full. Max ${maxPlayers} players allowed.`,
      };
    }
  }

  return { allowed: true };
}

function checkGameRelayPermissions(message) {
  console.log("Checking game relay permissions:", message);
  const { playerId, action, gameId } = message.payload || {};
  const rules =
    PERMISSIONS.game.games[gameId] || PERMISSIONS.game.general || {};
  console.log("Game relay rules:", rules);

  if (
    rules.allowedActions &&
    !rules.allowedActions.includes("*") &&
    !rules.allowedActions.includes(action)
  ) {
    console.log("Game relay permissions check failed:", message);
    return { allowed: false, reason: `Action '${action}' not permitted.` };
  }

  if (
    rules.allowedPlayers &&
    !rules.allowedPlayers.includes("*") &&
    !rules.allowedPlayers.includes(playerId)
  ) {
    console.log("Game relay permissions check failed:", message);
    return { allowed: false, reason: `Player '${playerId}' not permitted.` };
  }

  console.log("Game relay permissions check passed:", message);
  return { allowed: true };
}

function checkGameControllerPermissions(message) {
  console.log("Checking game controller permissions:", message);
  const { playerId, action, gameId } = message.payload || {};
  const rules =
    PERMISSIONS.game.games[gameId] || PERMISSIONS.game.general || {};
  console.log("Game controller rules:", rules);

  if (
    rules.allowedActions &&
    !rules.allowedActions.includes("*") &&
    !rules.allowedActions.includes(action)
  ) {
    console.log("Game controller permissions check failed:", message);
    return {
      allowed: false,
      reason: `Action '${action}' not allowed in controller.`,
    };
  }

  if (
    rules.allowedPlayers &&
    !rules.allowedPlayers.includes("*") &&
    !rules.allowedPlayers.includes(playerId)
  ) {
    console.log("Game controller permissions check failed:", message);
    return {
      allowed: false,
      reason: `Player '${playerId}' not allowed in controller.`,
    };
  }

  console.log("Game controller permissions check passed:", message);
  return { allowed: true };
}

module.exports = {
  checkLobbyRelayPermissions,
  checkLobbyControllerPermissions,
  checkGameRelayPermissions,
  checkGameControllerPermissions,
};
