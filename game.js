const { v4: uuidv4 } = require("uuid");

class Game {
  constructor(gameType) {
    this.gameType = gameType;
    this.gameId = uuidv4();
    this.players = new Map();
    this.gameLog = [];
    this.status = "waiting"; // Possible status: created, joining, started, ended
    this.instance = null; // Game-specific logic instance (e.g., RockPaperScissors)
  }

  // Add a player to the game
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

    // Update the game status based on the number of players
    if (this.players.size >= this.instance.maxPlayers) {
      this.status = "readyToStart";
      console.log("The game is ready to start.");
    } else if (this.players.size >= this.instance.minPlayers) {
      this.status = "canStart";
      console.log("The game can start.");
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
      status: this.status,
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
    console.log("Starting game.", this.status);
    if (this.status === "started") {
      return {
        type: "error",
        payload: { message: "Game is already started." },
      };
    }
    if (this.status == "canStart" || this.status == "readyToStart") {
      this.status = "started";
      console.log(this.players, typeof this.players);
      let players = Array.from(this.players.keys());
      console.log(players);
      this.instance.players = Array.from(this.players.keys());

      this.logAction(`Game started.`);
    } else
      return {
        type: "error",
        payload: {
          message: "Game is not in a valid status to start.",
          status: this.status,
        },
      };
  }
}

module.exports = Game;
