class Lobby {
  constructor({ lobbyId }) {
    this.players = new Map();
    this.games = new Map();
    this.lobbyId = lobbyId || "default";
  }

  existsInLobby(playerId) {
    return this.players.some((p) => p.playerId === playerId);
  }

  removePlayer(player) {
    this.players = this.players.filter((p) => p !== player);
  }

  removeGame(gameId) {
    this.games.delete(gameId);
    console.log(`Game ${gameId} removed from the lobby.`);
  }

  getLobbyGames() {
    console.log("Getting lobby games...", this.games);
    const gamesArray = Array.from(this.games.values()).map((game) => ({
      ...game,
      players: Array.from(game.players.values()).map(
        (player) => player.playerId
      ),
    }));
    console.log("Returning lobby games array...", gamesArray);
    return gamesArray;
  }

  getLobbyPlayers() {
    const playersArray = Array.from(this.players.values())
      .filter((p) => p.inLobby)
      .map((p) => p.playerId);
    return playersArray;
  }

  // getLobbyPlayers() {
  //   console.log("Lobby players...", this.players);
  //   const playersArray = this.players
  //     .filter((p) => p.inLobby)
  //     .map((p) => p.playerId);
  //   console.log("Returning lobby players array...", playersArray);
  //   return playersArray;
  // }

  addGame(game) {
    this.games.set(game.gameId, game);
    console.log("Game added to lobby...", game);
  }
  getGame(gameId) {
    return this.games.get(gameId);
  }

  getGameDetails(gameId) {
    if (!gameId) {
      console.warn("getGameDetails: gameId is required but not provided.");
      return null;
    }

    const game = this.games.get(gameId);
    console.log(game);
    if (!game) {
      console.warn(`getGameDetails: Game with ID ${gameId} not found.`);
      return null;
    }
    return {
      ...game,
      players: Array.from(game.players.values()).map(
        (player) => player.playerId
      ),
    };
  }
}

module.exports = Lobby;
