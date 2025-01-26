const Player = require("./player");

class Lobby {
  constructor() {
    this.players = [];
    this.games = [];
  }
  joinLobby(playerId, playerName = "") {
    //check if in lobby
    if (this.players.some((p) => p.playerId === playerId)) {
      return;
    }
    console.log("Adding player", playerId, playerName);
    const player = new Player({
      playerId,
      playerName,
      inLobby: true, // Default to true when adding a player to the lobby
    });
    this.players.push(player);
  }
  verifyPlayer(playerId) {
    const player = this.players.find((p) => p.playerId === playerId);
    if (!player) {
      console.log("Player not found in lobby", playerId);
      return;
    }
    player.inLobby = true;
    return player;
  }

  existsInLobby(playerId) {
    return this.players.some((p) => p.playerId === playerId);
  }

  removePlayer(player) {
    this.players = this.players.filter((p) => p !== player);
  }

  deverifyLobbyPlayers() {
    this.players.forEach((p) => (p.inLobby = false));
  }

  removeUnverifiedPlayers() {
    console.log("Removing unverified players...");
    this.games.forEach((game) => {
      const verifiedPlayers = this.players
        .filter((p) => p.inLobby)
        .map((p) => p.playerId);

      // Remove unverified players from the game
      const playersToRemove = Array.from(game.players.keys()).filter(
        (playerId) => !verifiedPlayers.includes(playerId)
      );

      playersToRemove.forEach((playerId) => {
        game.removePlayer(playerId);
        console.log(
          `Removed unverified player ${playerId} from game ${game.gameId}`
        );
      });
    });
  }

  getLobbyPlayers() {
    // console.log("Getting lobby players...");
    // this.removeUnverifiedPlayers();
    console.log("Returning lobby players...");
    return this.players.filter((p) => p.inLobby);
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

  joinLobbyPlayerToGame(gameId, playerId) {
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
