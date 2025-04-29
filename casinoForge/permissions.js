const { PERMISSIONS } = require("../pognConfigs");

function checkLobbyRelayPermissions(payload) {
  console.log("Checking lobby relay permissions", payload);
  const { playerId, action, lobbyId } = payload;
  const rules =
    PERMISSIONS.lobby.lobbies[lobbyId] || PERMISSIONS.lobby.general || {};

  if (
    rules.allowedActions &&
    !rules.allowedActions.includes("*") &&
    !rules.allowedActions.includes(action)
  ) {
    return { error: `Action '${action}' not permitted in lobby relay.` };
  }

  if (
    rules.allowedPlayers &&
    !rules.allowedPlayers.includes("*") &&
    !rules.allowedPlayers.includes(playerId)
  ) {
    return { error: `Player '${playerId}' not permitted in lobby relay.` };
  }

  return {};
}

function checkLobbyControllerPermissions(payload, lobbiesMap = new Map()) {
  const { playerId, action, lobbyId } = payload;
  const rules =
    PERMISSIONS.lobby.lobbies[lobbyId] || PERMISSIONS.lobby.general || {};

  if (
    rules.allowedActions &&
    !rules.allowedActions.includes("*") &&
    !rules.allowedActions.includes(action)
  ) {
    return { error: `Action '${action}' not allowed in controller.` };
  }

  if (
    rules.allowedPlayers &&
    !rules.allowedPlayers.includes("*") &&
    !rules.allowedPlayers.includes(playerId)
  ) {
    return { error: `Player '${playerId}' not allowed in controller.` };
  }

  if (
    action === "createLobby" &&
    lobbiesMap.size >= (PERMISSIONS.lobby.general.maxLobbies || Infinity)
  ) {
    return {
      error: `Lobby limit reached (max ${PERMISSIONS.lobby.general.maxLobbies}).`,
    };
  }

  if (action === "createNewGame" && lobbiesMap.has(lobbyId)) {
    const currentLobby = lobbiesMap.get(lobbyId);
    const currentGameCount = currentLobby.getLobbyGames()?.length || 0;
    const maxGames = rules.maxGames ?? Infinity;
    if (currentGameCount >= maxGames) {
      return { error: `Lobby '${lobbyId}' reached max games (${maxGames}).` };
    }
  }

  if (action === "login" && lobbiesMap.has(lobbyId)) {
    const lobby = lobbiesMap.get(lobbyId);
    const currentPlayers = lobby.getLobbyPlayers()?.length || 0;
    const maxPlayers =
      rules.maxPlayers ?? PERMISSIONS.lobby.general.maxPlayers ?? Infinity;
    if (currentPlayers >= maxPlayers) {
      return { error: `Lobby '${lobbyId}' is full (max ${maxPlayers}).` };
    }
  }

  return {};
}

function checkGameRelayPermissions(payload) {
  const { playerId, action, gameId } = payload;
  const rules =
    PERMISSIONS.game.games[gameId] || PERMISSIONS.game.general || {};

  if (
    rules.allowedActions &&
    !rules.allowedActions.includes("*") &&
    !rules.allowedActions.includes(action)
  ) {
    return { error: `Action '${action}' not permitted in game relay.` };
  }

  if (
    rules.allowedPlayers &&
    !rules.allowedPlayers.includes("*") &&
    !rules.allowedPlayers.includes(playerId)
  ) {
    return { error: `Player '${playerId}' not permitted in game relay.` };
  }

  return {};
}

function checkGameControllerPermissions(payload) {
  const { playerId, action, gameId } = payload;
  const rules =
    PERMISSIONS.game.games[gameId] || PERMISSIONS.game.general || {};

  if (
    rules.allowedActions &&
    !rules.allowedActions.includes("*") &&
    !rules.allowedActions.includes(action)
  ) {
    return { error: `Action '${action}' not allowed in game controller.` };
  }

  if (
    rules.allowedPlayers &&
    !rules.allowedPlayers.includes("*") &&
    !rules.allowedPlayers.includes(playerId)
  ) {
    return { error: `Player '${playerId}' not allowed in game controller.` };
  }

  return {};
}

module.exports = {
  checkLobbyRelayPermissions,
  checkLobbyControllerPermissions,
  checkGameRelayPermissions,
  checkGameControllerPermissions,
};
