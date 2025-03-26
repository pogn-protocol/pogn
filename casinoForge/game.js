const { v4: uuidv4 } = require("uuid");

class Game {
  constructor(gameType, gameId) {
    this.gameType = gameType;
    this.gameId = gameId || uuidv4(); // Unique game ID
    this.players = new Map();
    this.gameLog = [];
    this.lobbyStatus = "waiting"; // Possible lobbyStatus: created, joining, started, ended
    this.instance = null; // Game-specific logic instance (e.g., RockPaperScissors)
    this.gamePorts = [];
    this.lobbyId = null; // Reference to the lobby ID
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
      lobbyStatus: this.lobbyStatus,
      gameType: this.gameType,
      players: Array.from(this.players.keys()),
      gameLog: this.gameLog,
      ...instanceDetails, // Merge game-specific details
    };
  }
}

module.exports = Game;
