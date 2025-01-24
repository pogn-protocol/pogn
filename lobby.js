const Player = require("./player");

class Lobby {
  constructor() {
    this.players = [];
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
}

module.exports = Lobby;
