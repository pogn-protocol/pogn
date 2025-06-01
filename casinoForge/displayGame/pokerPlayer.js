const Player = require("../gameHubClasses/player");

class PokerPlayer extends Player {
  constructor({ seatIndex, playerId = null, playerName = "Player" }) {
    super({
      playerId,
      playerName,
      inLobby: false,
      inGame: true,
    });
    this.seatIndex = seatIndex;
    this.stack = 1000;
    this.bet = 0;
    this.hasFolded = false;
    this.isAllIn = false;
    this.isDealer = false;
    this.isSB = false;
    this.isBB = false;
  }

  resetForNewHand() {
    this.bet = 0;
    this.hasFolded = false;
    this.isAllIn = false;
    this.isDealer = false;
    this.isSB = false;
    this.isBB = false;
    this.hasActedThisRound = false; // 👈 add this
  }
}

module.exports = PokerPlayer;
