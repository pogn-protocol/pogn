class Player {
  constructor({ playerId, playerName, inLobby = false, inGame = false }) {
    this.playerId = playerId;
    this.playerName = playerName;
    this.inLobby = inLobby;
    this.inGame = inGame;
  }
}

module.exports = Player;
