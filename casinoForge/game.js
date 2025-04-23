const { v4: uuidv4 } = require("uuid");

class Game {
  constructor(gameType, gameId) {
    this.gameType = gameType;
    this.gameId = gameId || uuidv4(); // Unique game ID
    this.players = new Map();
    this.gameLog = [];
    this.lobbyStatus = "joining"; // Possible lobbyStatus: created, joining, started, ended
    this.gameStatus = "joining"; // Possible gameStatus: waiting, in-progress, complete
    this.instance = null; // Game-specific logic instance (e.g., RockPaperScissors)
    this.gamePorts = [];
    this.lobbyId = null; // Reference to the lobby ID
    this.wsAddress;
    this.isPrivate = false; // Indicates if the game is private
    this.allowedPlayers = []; // List of allowed players
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

  getJoinedPlayerIds() {
    return Array.from(this.players.keys());
  }

  getGameDetails() {
    const instanceDetails = this.instance.getGameDetails(); // Dynamically get details
    return {
      gameId: this.gameId,
      lobbyStatus: this.lobbyStatus,
      gameType: this.gameType,
      players: Array.from(this.players.values()).map(
        (player) => player.playerId
      ),
      gameLog: this.gameLog,
      ...instanceDetails, // Merge game-specific details
      wsAddress: this.wsAddress,
    };
  }
}

module.exports = Game;
