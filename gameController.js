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
    if (!game && action !== "createGame") {
      return {
        type: "error",
        payload: { message: "Game not found." },
      };
    }

    switch (action) {
      case "createGame":
        return this.createGame(payload.gameType, playerId);

      case "joinGame":
        return this.joinGame(payload.gameId, playerId);

      case "verifyResponse":
        return this.verifyResponse(game, playerId);

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

  // Create a new game instance
  newGame(gameType) {
    // Check if the game type is supported
    if (!this.gameClasses[gameType]) {
      console.error(`Unsupported game type: ${gameType}`);
      return null;
    }

    // Create and initialize the game
    const game = new Game(gameType);
    const gameInstance = new this.gameClasses[gameType](); // Initialize game-specific logic
    game.setGameInstance(gameInstance);
    //overwrite thefirst game so there is only ever one
    //delete all games for testing
    this.games = {};
    this.games[game.gameId] = game;
    return game;
  }

  // Handle game creation
  createGame(gameType, playerId) {
    const game = this.newGame(gameType);
    if (!game) {
      return {
        type: "error",
        payload: { message: `Game type ${gameType} not supported.` },
      };
    }

    game.logAction(`${playerId} created the game.`);

    return {
      type: "game",
      action: "gameCreated",
      payload: game.getGameDetails(),
      broadcast: true,
    };
  }

  // Start the game
  startGame(game, senderplayerId) {
    if (game.state !== "created" && game.state !== "joining") {
      return {
        type: "error",
        payload: { message: "Game is not in a valid state to start." },
      };
    }

    game.state = "started";
    game.logAction(`${senderplayerId} started the game.`);

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
    const gameResult = game.instance.processAction(gameAction, playerId);

    console.log("gameAction result:", gameResult);
    game.logAction(gameResult.logEntry);
    return {
      type: "game",
      action: "gameAction",
      payload: {
        ...gameResult,
        game: game.getGameDetails(),
        gameId: game.gameId,
      },
      broadcast: true,
    };
  }

  // Add a player to the game
  joinGame(gameId, playerId) {
    const game = this.games[gameId];
    console.log(playerId, " is joining game:", gameId);
    if (!playerId) {
      return {
        type: "error",
        payload: { message: "Missing playerId in payload." },
      };
    }

    if (game.players.has(playerId)) {
      return {
        type: "error",
        payload: { message: `${playerId} is already in the game.` },
      };
    }

    game.players.set(playerId, { joined: true });
    // game.logAction(`Player ${playerId} joined the game.`);
    // game.deverifyJoinedPlayers();

    return {
      type: "game",
      action: "updateGamePlayers", // This matches your existing actions
      payload: game.getGameDetails(),
      broadcast: true,
    };
  }

  // Verify a player
  verifyResponse(game, playerId) {
    console.log("Verifying joined player: ", playerId);
    game.verifyPlayer(playerId);
    return {
      type: "game",
      action: "playerjoined",
      payload: game.getGameDetails(),
    };
  }
}
module.exports = GameController;
