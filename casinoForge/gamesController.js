const RockPaperScissors = require("./rps");
const OddsAndEvens = require("./oddsAndEvens");
const Game = require("./game");

class GamesController {
  constructor() {
    if (GamesController.instance) return GamesController.instance;
    GamesController.instance = this; // Singleton instance// Store active games
    this.gameClasses = {
      "rock-paper-scissors": RockPaperScissors, // Register supported games here
      "odds-and-evens": OddsAndEvens,
    };
    this.activeGames = new Map(); // Store active game instances
  }

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

    console.log("game", game);
    if (typeof game.instance.processAction === "function") {
      console.log("Processing game action:", payload.gameAction);
      return game.instance.processAction(payload.gameAction, playerId, payload);
    }

    return {
      error: true,
      message: `Action ${payload.gameAction} not supported by the game.`,
    };
  }

  createGame(gameType, playerId) {
    console.log("Creating game", gameType, "by player", playerId);
    const game = new Game(gameType);
    const gameInstance = new this.gameClasses[gameType]();
    game.setGameInstance(gameInstance);
    return game;
  }

  startGame(game) {
    console.log("gameController starting game", game);

    if (!game) {
      return { type: "error", payload: { message: "Game not found." } };
    }

    const players = game.players;
    console.log("players", players, "size", players.size);
    if (game.players.size < game.instance?.minPlayers) {
      return {
        type: "error",
        payload: { message: "Not enough players to start the game." },
      };
    }

    if (game.status !== "canStart" && game.status !== "readyToStart") {
      return {
        type: "error",
        payload: { message: "Game is not ready to start." },
      };
    }

    if (this.activeGames.has(game.gameId)) {
      console.warn(`Game ${game.gameId} is already active.`);
      return;
    }
    this.activeGames.set(game.gameId, game);
    console.log(`Game ${game.gameId} added to active games.`);
    game.status = "started";
    game.instance.players = Array.from(game.players.keys());

    game.gameLog.push("Game started.");
    console.log("Game started.", game);
    return;
  }

  gameAction(game, gameAction, playerId) {
    console.log(
      "Processing game action:",
      gameAction,
      "from player:",
      playerId
    );
    const gameActionResult = game.instance.processAction(
      gameAction,
      playerId,
      payload
    );

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

  addPlayerToGame(gameId, playerId) {
    console.log("activeGames", this.activeGames);
    const game = this.activeGames.get(gameId);
    if (!game) {
      return { error: true, message: `Game with ID ${gameId} not found.` };
    }
    if (game.players.has(playerId)) {
      return { error: true, message: `${playerId} is already in the game.` };
    }
    if (game.players.size >= game.instance.maxPlayers) {
      return {
        error: true,
        message: "Game is full. Cannot add more players.",
      };
    }
    game.players.set(playerId, { joined: false });
    console.log(
      `${playerId} was added to the game. Current players:`,
      Array.from(game.players.keys())
    );
    if (game.players.size >= game.instance.maxPlayers) {
      game.status = "readyToStart";
      console.log("The game is ready to start.");
    } else if (game.players.size >= game.instance.minPlayers) {
      game.status = "canStart";
      console.log("The game can start.");
    }
    return game;
  }
}
module.exports = GamesController;
