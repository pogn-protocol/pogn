const RockPaperScissors = require("./rps");
const OddsAndEvens = require("./oddsAndEvens");
const Game = require("./game");
const eventBus = require("./eventBus"); // Import the shared EventBus
const GameRelay = require("./gameRelay");

class GamesController {
  constructor(gamePorts = []) {
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

    console.log("game", game);
    if (typeof game.instance.processAction === "function") {
      try {
        console.log("Processing game action:", payload.gameAction);
        //const gameRelay = this.gameRelay.get(payload.gameId);
        const gameRelay = game.relay;
        console.log("gameRelay", gameRelay);
        console.log("payload", payload);
        const gameResponse = game.instance.processAction(playerId, payload);
        console.log("gameResponse", gameResponse);
        //log if log entry is not null
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
        // return response;

        return;
      } catch (error) {
        console.error(`❌ Error processing game action:`, error);
        // return {
        //   type: "error",
        //   payload: { message: "Error processing game action." },
        // };
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
    //create game relay
    //constructor(gameId, players = [], ports, gamesController) {
    const gameRelay = new GameRelay(game.gameId, [], this.gamePorts, this);
    // this.addGameRelay(game.gameId, gameRelay);
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

  // gameAction(gameAction, playerId, payload) {
  //   console.log(
  //     "Processing game action:",
  //     gameAction,
  //     "from player:",
  //     playerId
  //   );
  //   const gameActionResult = game.instance.processAction(
  //     gameAction,
  //     playerId,
  //     payload
  //   );

  //   console.log("gameAction result:", gameActionResult);
  //   //throw error if log entry is null
  //   if (gameActionResult.logEntry) {
  //     game.logAction(gameActionResult.logEntry);
  //   }
  //   console.log("game", game);
  //   return gameActionResult;
  //   // return {
  //   //   type: "game",
  //   //   action: "gameAction",
  //   //   payload: {
  //   //     ...gameActionResult,
  //   //     game: game,
  //   //   },
  //   //   broadcast: true,
  //   // };

  //   //throw andconsole and error that reminds us to rebuilt getgameDetails
  // }

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
    // ✅ Listen for the "gameEnded" event from GameController
    eventBus.on("gameEnded", ({ gameId }) => {
      console.log(`🔄 Game ${gameId} ended, refreshing lobby.`);
      // this.refreshLobby();
    });

    eventBus.on("lobbyMessage", (message) => {
      console.log("gameController received lobby message", message);
      //send hello reply back
      eventBus.emit("gameMessage", {
        message: "Hello from the game relay.",
      });
    });
  }

  // endGame(gameId) {
  //   const game = this.activeGames.get(gameId);
  //   if (!game) {
  //     console.warn(`⚠️ Cannot end game ${gameId}: Not found.`);
  //     return;
  //   }

  //   console.log(`🛑 Ending game ${gameId}`);
  //   //delete game
  //   game.status = "ended";
  //   game.gameLog.push("Game ended.");

  //   // ✅ Remove from active games
  //   this.activeGames.delete(gameId);
  // }
}
module.exports = GamesController;
