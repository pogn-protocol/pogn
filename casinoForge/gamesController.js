const RockPaperScissors = require("./rps");
const OddsAndEvens = require("./oddsAndEvens");
const Game = require("./game");
const eventBus = require("./eventBus"); // Import the shared EventBus
const GameRelay = require("./gameRelay");

class GamesController {
  constructor(gamePorts = [], lobbyWsUrl) {
    if (GamesController.instance) return GamesController.instance;
    GamesController.instance = this; // Singleton instance// Store active games
    this.gameClasses = {
      "rock-paper-scissors": RockPaperScissors, // Register supported games here
      "odds-and-evens": OddsAndEvens,
    };
    this.activeGames = new Map(); // Store active game instances
    this.gamePorts = gamePorts; // Store available game ports
    this.gameRelay = new Map(); // Store game relays
    this.initializeListeners();
    this.lobbyWsUrl = lobbyWsUrl;
  }

  addGameRelay(gameId, gameRelay) {
    this.gameRelay.set(gameId, gameRelay);
  }

  addRelayToGame(gameId, relay) {
    const game = this.activeGames.get(gameId);
    if (!game) {
      console.warn(`Game ${gameId} not found.`);
      return;
    }
    game.relay = relay;
  }

  processMessage(ws, message) {
    console.log("Processing game message:", message);
    const { type, payload } = message;
    console.log("payload", payload);

    if (type !== "game") {
      console.warn("Message sent to game not of type game:", type);
      return;
    }
    console.log("Active games", this.activeGames);
    const game = this.activeGames.get(payload.gameId);
    if (!game) {
      console.warn(`⚠️ Game ${payload.gameId} not found.`);
      return;
    }

    if (!payload || !payload.gameId) {
      return {
        type: "error",
        payload: { message: "Invalid payload structure." },
      };
    }

    const playerId = payload?.playerId;
    console.log("Player ID:", playerId);
    console.log(this.activeGames);

    if (payload.action === "gameEnded") {
      console.log("Game ended.");
      this.activeGames.delete(payload.gameId);
      this.broadcastToGamePlayers(payload.gameId, {
        type: "game",
        action: "gameEnded",
        payload: {},
        broadcast: true,
      });
      return;
    }

    console.log("game", game);
    if (typeof game.instance.processAction === "function") {
      try {
        console.log("Processing game action:", payload.gameAction);
        const gameRelay = game.relay;
        console.log("gameRelay", gameRelay);
        console.log("payload", payload);
        const gameResponse = game.instance.processAction(playerId, payload);
        console.log("gameResponse", gameResponse);
        if (gameResponse.logEntry) {
          game.logAction(gameResponse.logEntry);
        }
        console.log("game", game);
        console.log("gameResponse", gameResponse);
        const response = {
          type: "game",
          action: "gameAction",
          payload: {
            ...gameResponse.payload,
            game: game,
          },
          broadcast: true,
        };

        console.log("response", response);
        gameRelay.broadcastResponse(response);
        return;
      } catch (error) {
        console.error(`❌ Error processing game action:`, error);
      }
    } else {
      console.warn(`Game ${payload.gameId} does not support game actions.`);
      return;
    }
    console.warn(`shouldn't be here`);
    // this.broadcastToGamePlayers(payload.gameId, {
    //   type: "error",
    //   payload: {
    //     message: `Action ${payload.gameAction} not supported by the game.`,
    //   },
    // });
  }

  broadcastToGamePlayers(gameId, message) {
    const gameRelay = this.gameRelay.get(gameId);
    if (!gameRelay) {
      console.warn(`Game relay for game ${gameId} not found.`);
      return;
    }
    gameRelay.broadcastResponse(message);
  }

  createGame(gameType, createRelay, playerId) {
    console.log(
      "Creating game ",
      gameType,
      " by player ",
      playerId,
      " relay ",
      createRelay
    );
    if (!createRelay) {
      console.log("createRelay is false");
    }
    const game = new Game(gameType);
    game.gamePorts = this.gamePorts;
    const gameInstance = new this.gameClasses[gameType]();
    game.setGameInstance(gameInstance);
    //  constructor(gameId, ports, gamesController, targetUrl = null) {

    // const gameRelay = new GameRelay(game.gameId, [9000, 9001], this.lobbyWsUrl);
    const gameRelay = new GameRelay(
      game.gameId,
      [9000, 9001],
      this,
      this.lobbyWsUrl
    );
    game.relay = gameRelay;
    console.log("game", game);
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

  initializeListeners() {
    eventBus.on("gameEnded", ({ gameId }) => {
      console.log(`🔄 Game ${gameId} ended, refreshing lobby.`);
    });

    eventBus.on("lobbyMessage", (message) => {
      console.log("gameController received lobby message", message);
      eventBus.emit("gameMessage", {
        message: "Hello from the game relay.",
      });
    });
  }
}
module.exports = GamesController;
