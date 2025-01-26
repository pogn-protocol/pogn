const { v4: uuidv4 } = require("uuid");

class Game {
  constructor(gameType) {
    this.gameType = gameType;
    this.gameId = uuidv4();
    this.players = new Map();
    this.gameLog = [];
    this.state = "joining"; // Possible states: created, joining, started, ended
    this.instance = null; // Game-specific logic instance (e.g., RockPaperScissors)
  }

  // Add a player to the game
  addPlayer(playerId) {
    if (this.players.has(playerId)) {
      console.log(`${playerId} is already in the game.`);
      return `${playerId} is already in the game.`;
    }

    // Check if the game has reached the maximum number of players
    if (this.players.size >= this.instance?.maxPlayers) {
      console.log(`Game is full. Max players: ${this.instance.maxPlayers}`);
      return "Game is full.";
    }

    // Add the player to the game
    this.players.set(playerId, { joined: false });
    console.log(
      `${playerId} was added to the game. Current players:`,
      Array.from(this.players.keys())
    );

    // Optionally, check if the game is ready to start
    if (this.players.size >= this.instance.minPlayers) {
      console.log("The game is ready to start.");
    }

    return null; // No errors
  }

  // Remove a player from the game
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
      state: this.state,
      gameType: this.gameType,
      players: Array.from(this.players.keys()),
      gameLog: this.gameLog,
      ...instanceDetails, // Merge game-specific details
    };
  }

  deverifyJoinedPlayers() {
    this.players.forEach((player, playerId) => {
      player.joined = false;
    });
    this.logAction("All players were deverified.");
    return null; // No errors
  }
  startGame() {
    console.log("Starting game.", this.state);
    if (this.state === "started") {
      return {
        type: "error",
        payload: { message: "Game is already started." },
      };
    }
    if (this.state == "canStart" || this.state == "readyToStart") {
      this.state = "started";

      this.logAction(`${senderplayerId} started the game.`);
    } else
      return {
        type: "error",
        payload: {
          message: "Game is not in a valid state to start.",
          state: this.state,
        },
      };
  }
}

module.exports = Game;
