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
      return `${playerId} is already in the game.`;
    }
    this.players.set(playerId, { joined: false });
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
    return {
      gameId: this.gameId,
      gameType: this.gameType,
      state: this.state,
      players: Array.from(this.players.keys()), // Convert Map to an array of keys
      gameLog: this.gameLog,
    };
  }

  joinPlayer(playerId) {
    console.log("Joining player:", playerId);
    console.log("Joinstate:", this.state);
    console.log("Maxplayers:", this.instance.maxPlayers);
    console.log("Number of players before join: ", this.players.size);
    if (this.players.has(playerId)) {
      return `${playerId} is already joined.`;
    }
    if (this.players.size >= this.instance.maxPlayers) {
      return "Game is full.";
    }
    this.players.set(playerId, { joined: true });
    if (this.state !== "joining") {
      return "Game is not in joining state.";
    }
    if (this.players.size == this.instance.minPlayers) {
      console.log("Game can start.");
      this.state = "canStart";
    }
    if (this.players.size == this.instance.maxPlayers) {
      console.log("Game is ready to start.");
      this.state = "readyToStart";
    }

    //
    console.log("Number of players after join: ", this.players);
    return "Player joined.";
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
    if (this.state !== "canStart" || this.state !== "readyToStart") {
      return {
        type: "error",
        payload: {
          message: "Game is not in a valid state to start.",
          state: this.state,
        },
      };
    }
    this.state = "started";

    this.logAction(`${senderplayerId} started the game.`);
  }
}

module.exports = Game;
