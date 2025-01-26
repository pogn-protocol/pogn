const Player = require("./player");

class Lobby {
  constructor() {
    this.players = [];
    this.games = [];
  }
  addPlayer(playerId, playerName = "") {
    //check if in lobby
    if (this.players.some((p) => p.playerId === playerId)) {
      return;
    }
    console.log("Adding player", playerId, playerName);
    const player = new Player({
      playerId,
      playerName,
      inLobby: true, // Default to true when adding a player to the lobby
      inGame: false, // Default to false initially
    });
    this.players.push(player);
  }
  verifyPlayer(playerId) {
    const player = this.players.find((p) => p.playerId === playerId);
    if (!player) {
      console.log("Player not found in lobby", playerId);
      return;
    }
    player.verified = true;
    return player;
  }
  removePlayer(player) {
    this.players = this.players.filter((p) => p !== player);
  }
  sterilizeLobby() {
    this.players.forEach((p) => (p.verified = false));
  }
  getLobbyPlayers() {
    return this.players.filter((p) => p.verified);
  }
  getVerifiedLobbyPlayers() {
    //return verified players with playerId and playerName
    return this.players
      .filter((p) => p.verified)
      .map((p) => ({ playerId: p.playerId, playerName: p.playerName }));
  }
  isInLobby(player) {
    return this.players.includes(player);
  }
  getLobbyGames() {
    return this.games.map((game) => ({
      gameId: game.gameId,
      gameType: game.gameType,
      state: game.state,
      players: Array.from(game.players.keys()), // Convert players map to array
      gameLog: game.gameLog,
      instance: game.instance,
    }));
  }
  addGame(game) {
    this.games.push(game);
  }
  getGame(gameId) {
    return this.games.find((game) => game.gameId === gameId) || null;
  }

  joinPlayer(gameId, playerId) {
    const game = this.getGame(gameId);
    console.log("Joining player", playerId, "to game", gameId);
    if (!game) {
      return { error: true, message: `Game with ID ${gameId} not found.` };
    }
    game.addPlayer(playerId);
    return game;
  }
}

module.exports = Lobby;
