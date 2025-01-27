const RockPaperScissors = require("./rps");
const Game = require("./game");

class GamesController {
  constructor() {
    if (GamesController.instance) return GamesController.instance;
    GamesController.instance = this; // Singleton instance// Store active games
    this.gameClasses = {
      "rock-paper-scissors": RockPaperScissors, // Register supported games here
    };
    this.activeGames = new Map(); // Store active game instances
  }
  // Process a received message
  processMessage(message) {
    console.log("Processing game message:", message);
    const { action, payload } = message;

    if (!payload || !payload.gameId) {
      return {
        type: "error",
        payload: { message: "Invalid payload structure." },
      };
    }

    const playerId = payload?.playerId;
    console.log("Player ID:", playerId);
    console.log(this.activeGames);
    let game = this.activeGames.get(payload.gameId);

    if (!game) {
      console.log("Game not found. Creating new game instance.");

      // Retrieve the game type from the payload or default to a type
      const gameType = payload.game || "rock-paper-scissors";

      // Initialize a new game instance
      game = new Game(this.gameClasses[gameType]);
      const gameInstance = new this.gameClasses[gameType]();
      game.setGameInstance(gameInstance);

      // Add the game to active games
      this.addActiveGame(payload.gameId, game);
    }
    console.log("game", game);
    // Forward the action to the game instance
    if (typeof game.instance.processAction === "function") {
      console.log("Processing game action:", payload.gameAction);
      return game.instance.processAction(payload.gameAction, playerId);
    }

    return {
      error: true,
      message: `Action ${payload.gameAction} not supported by the game.`,
    };
  }

  addActiveGame(gameId, gameInstance) {
    if (this.activeGames.has(gameId)) {
      console.warn(`Game ${gameId} is already active.`);
      return;
    }

    this.activeGames.set(gameId, gameInstance);
    console.log(`Game ${gameId} added to active games.`);
  }

  // Start the game
  startGame(game) {
    game.startGame();

    return {
      type: "game",
      action: "startGame",
      payload: game.getLobbyDetails(),
      broadcast: true,
    };
  }

  // Get a list of active games

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
    //throw andconsole and error that reminds us to rebuilt getgameDetails
    console.log("game", game);
    return {
      type: "game",
      action: "gameAction",
      payload: {
        ...gameActionResult,
        game: game,
      },
      broadcast: true,
    };
  }

  // Add a player to the game
}
module.exports = new GamesController();
