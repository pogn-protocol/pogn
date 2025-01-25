const Game = require("./game"); // Import the Game class
const RockPaperScissors = require("./rps");

class GameController {
  constructor() {
    this.games = {}; // Store active games

    this.gameClasses = {
      "rock-paper-scissors": RockPaperScissors, // Register supported games here
    };
  }
  // Process a received message
  processMessage(message) {
    console.log("Processing game message:", message);

    const { action, payload } = message;
    const playerId = payload?.playerId;

    if (!payload || !playerId || !payload.gameId) {
      return {
        type: "error",
        payload: { message: "Invalid payload structure." },
      };
    }

    const game = this.games[payload.gameId];
    if (!game && action !== "createNewGame") {
      return {
        type: "error",
        payload: { message: "Game not found." },
      };
    }

    switch (action) {
      case "createNewGame":
        return this.createGame(payload.gameType, playerId);

      case "joinGame":
        return this.joinGame(payload.gameId, playerId);

      case "startGame":
        return this.startGame(game, playerId);

      case "gameAction":
        return this.gameAction(game, payload.gameAction, playerId);

      case "getGames":
        return this.getGames();

      default:
        console.warn(`Unhandled game action: ${action}`);
        return {
          type: "error",
          payload: { message: `Unknown action: ${action}` },
        };
    }
  }

  createGame(gameType, playerId) {
    if (!this.gameClasses[gameType]) {
      console.error(`Unsupported game type: ${gameType}`);
      return {
        type: "error",
        payload: { message: `Unsupported game type: ${gameType}` },
      };
    }

    // Create and initialize the game
    const game = new Game(gameType);
    const gameInstance = new this.gameClasses[gameType](); // Initialize game-specific logic
    game.setGameInstance(gameInstance);
    this.games = {};
    this.games[game.gameId] = game;

    game.logAction(`${playerId} created game.`);
    const games = Object.keys(this.games).map((gameId) => {
      return this.games[gameId].getGameDetails();
    });

    return {
      type: "game",
      action: "gameList",
      payload: { games },
      broadcast: true,
    };
  }

  // Start the game
  startGame(game) {
    game.startGame();

    return {
      type: "game",
      action: "startGame",
      payload: game.getGameDetails(),
      broadcast: true,
    };
  }

  // Get a list of active games
  getGames() {
    //get game ids
    const games = Object.keys(this.games).map((gameId) => {
      return this.games[gameId].getGameDetails();
    });

    return {
      type: "game",
      action: "gamesList",
      payload: { games },
    };
  }

  // Handle game-specific actions
  gameAction(game, gameAction, playerId) {
    console.log(
      "Processing game action:",
      gameAction,
      "from player:",
      playerId
    );
    const gameActionResult = game.instance.processAction(gameAction, playerId);

    console.log("gameAction result:", gameActionResult);
    game.logAction(gameActionResult.logEntry);
    return {
      type: "game",
      action: "gameAction",
      payload: {
        ...gameActionResult,
        game: game.getGameDetails(),
      },
      broadcast: true,
    };
  }

  // Add a player to the game
  joinGame(gameId, playerId) {
    //get all game ids
    console.log(this.games);
    const game = this.games[gameId];
    console.log(playerId, " is joining game:", gameId);
    let joinResult = game.joinPlayer(playerId);
    console.log("Join result:", joinResult);

    return {
      type: "game",
      action: "updateGamePlayers", // This matches your existing actions
      payload: game.getGameDetails(),
      broadcast: true,
    };
  }
}
module.exports = GameController;
