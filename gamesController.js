const RockPaperScissors = require("./rps");

class GamesController {
  constructor() {
    if (GamesController.instance) return GamesController.instance;
    GamesController.instance = this; // Singleton instance// Store active games
    this.gameClasses = {
      "rock-paper-scissors": RockPaperScissors, // Register supported games here
    };
  }
  // Process a received message
  processMessage(message) {
    console.log("Processing game message:", message);

    const { action, payload, game } = message;
    const playerId = payload?.playerId;

    if (!payload || !playerId || !payload.gameId) {
      return {
        type: "error",
        payload: { message: "Invalid payload structure." },
      };
    }

    if (!game) {
      console.log("Game: ", game);
      return {
        type: "error",
        payload: { message: `Game not found: ${payload.gameId}` },
      };
    }

    switch (action) {
      case "startGame":
        return this.startGame(game, playerId);

      case "gameAction":
        return this.gameAction(game, payload.gameAction, playerId);

      default:
        console.warn(`Unhandled game action: ${action}`);
        return {
          type: "error",
          payload: { message: `Unknown action: ${action}` },
        };
    }
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

    throw new Error("Rebuild getGameDetails");

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
}
module.exports = new GamesController();
