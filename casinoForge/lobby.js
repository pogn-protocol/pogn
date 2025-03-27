class Lobby {
  constructor(lobbyId) {
    this.players = [];
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
    //this.games = this.games.filter((game) => game.gameId !== gameId);
    this.games.delete(gameId);
    console.log(`Game ${gameId} removed from the lobby.`);
  }

  getLobbyGames() {
    console.log("Getting lobby games...", this.games);
    const gamesArray = Array.from(this.games.values()).map((game) => ({
      ...game, // Spread the entire game object
      players: Array.from(game.players.values()).map(
        (player) => player.playerId
      ), // Transform players map to an array of player IDs
    }));
    console.log("Returning lobby games array...", gamesArray);
    return gamesArray;
  }

  // getLobbyGames() {
  //   console.log("Getting lobby games...", this.games);
  //   const gamesArray = Array.from(this.games.values()).map((game) => ({
  //     gameId: game.gameId,
  //     gameType: game.gameType,
  //     status: game.status,
  //     players: Array.from(game.players.values()).map(
  //       (player) => player.playerId
  //     ),
  //     gameLog: game.gameLog,
  //     instance: game.instance,
  //   }));
  //   console.log("Returning lobby games array...", gamesArray);
  //   return gamesArray;
  // }

  getLobbyPlayers() {
    console.log("Lobby players...", this.players);
    const playersArray = this.players
      .filter((p) => p.inLobby)
      .map((p) => p.playerId); // Extract only the player IDs
    console.log("Returning lobby players array...", playersArray);
    return playersArray;
  }

  // getLobbyPlayers() {
  //   console.log("Lobby players...", this.players);
  //   const playersArray = this.players.filter((p) => p.inLobby);
  //   console.log("Returning lobby players array...", playersArray);
  //   return playersArray;
  // }

  // getLobbyPlayers() {
  //   console.log("Lobby players...", this.players);
  //   console.log(
  //     "Returning lobby players...",
  //     this.players.filter((p) => p.inLobby)
  //   );
  //   return this.players.filter((p) => p.inLobby);
  // }

  // getLobbyGames() {
  //   console.log("Getting lobby games...", this.games);
  //   return Array.from(this.games.values());
  // }

  addGame(game) {
    // this.games.push(game);
    this.games.set(game.gameId, game);
    console.log("Game added to lobby...", game);
  }
  getGame(gameId) {
    //  return this.games.find((game) => game.gameId === gameId);
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
      // gameId: game.gameId,
      // gameType: game.gameType,
      // status: game.status,
      // players: players, // Use the processed players array
      // gameLog: game.gameLog,
      // instance: game.instance,
      ...game,
      players: Array.from(game.players.values()).map(
        (player) => player.playerId
      ),
    };
  }
}

module.exports = Lobby;
