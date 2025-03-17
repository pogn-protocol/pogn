const { v4: uuidv4 } = require("uuid");

class Game {
  constructor(gameType) {
    this.gameType = gameType;
    this.gameId = uuidv4();
    this.players = new Map();
    this.gameLog = [];
    this.status = "waiting"; // Possible status: created, joining, started, ended
    this.instance = null; // Game-specific logic instance (e.g., RockPaperScissors)
    this.gamePorts = [];
    this.relay = null; // Reference to the game relay
  }

  removePlayer(playerId) {
    if (!this.players.has(playerId)) {
      return `${playerId} is not in the game.`;
    }
    this.players.delete(playerId);
    return null; // No errors
  }

  // Set the game-specific instance
  setGameInstance(gameInstance) {
    this.instance = gameInstance;
  }

  // Add an action to the game log
  logAction(action) {
    this.gameLog.push(action);
  }

  // Return the game details in a serializable format

  getGameDetails() {
    const instanceDetails = this.instance.getGameDetails(); // Dynamically get details
    return {
      gameId: this.gameId,
      status: this.status,
      gameType: this.gameType,
      players: Array.from(this.players.keys()),
      gameLog: this.gameLog,
      ...instanceDetails, // Merge game-specific details
    };
  }
}

module.exports = Game;
