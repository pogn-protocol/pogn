const { v4: uuidv4 } = require("uuid");

class Game {
  constructor(gameType) {
    this.gameType = gameType;
    this.gameId = uuidv4();
    this.players = new Map();
    this.gameLog = [];
    this.state = "created"; // Possible states: created, joining, started, ended
    this.instance = null; // Game-specific logic instance (e.g., RockPaperScissors)
  }

  // Add a player to the game
  addPlayer(playerId) {
    if (this.players.has(playerId)) {
      return `${playerId} is already in the game.`;
    }
    this.players.set(playerId, { joined: false });
    this.logAction(`Player ${playerId} joined the game.`);
    return null; // No errors
  }

  // Remove a player from the game
  removePlayer(playerId) {
    if (!this.players.has(playerId)) {
      return `${playerId} is not in the game.`;
    }
    this.players.delete(playerId);
    this.logAction(`Player ${playerId} was removed.`);
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
    return {
      gameId: this.gameId,
      gameType: this.gameType,
      state: this.state,
      players: Array.from(this.players.keys()), // Convert Map to an array of keys
      gameLog: this.gameLog,
    };
  }

  joinPlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) {
      return `${playerId} not found in the game.`;
    }

    player.verified = true;
    this.logAction(`Player ${playerId} was verified.`);
    return null; // No errors
  }
  deverifyJoinedPlayers() {
    this.players.forEach((player, playerId) => {
      player.joined = false;
    });
    this.logAction("All players were deverified.");
    return null; // No errors
  }
}

module.exports = Game;
