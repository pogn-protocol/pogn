class Player {
  constructor({
    playerId = null,
    playerName = "Player",
    inLobby = false,
    inGame = false,
  }) {
    this.playerId = playerId;
    this.playerName = playerName;
    this.inLobby = inLobby;
    this.inGame = inGame;
  }
}

module.exports = Player;
