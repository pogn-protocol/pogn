const RockPaperScissors = require("./rps");
const OddsAndEvens = require("./oddsAndEvens");
const Game = require("./game");

class gameController {
  constructor(gamePorts = [], lobbyWsUrl, relayManager) {
    if (gameController.instance) return gameController.instance;
    gameController.instance = this; // Singleton instance// Store active games
    this.gameClasses = {
      "rock-paper-scissors": RockPaperScissors, // Register supported games here
      "odds-and-evens": OddsAndEvens,
    };
    this.activeGames = new Map(); // Store active game instances
    this.gamePorts = gamePorts; // Store available game ports

    this.messageHandlers = {
      gameAction: this.handleGameAction.bind(this),
      gameEnded: this.handleGameEnd.bind(this),
    };

    this.lobbyWsUrl = lobbyWsUrl;
    this.relayManager = relayManager;
    this.messages = [];
  }

  processMessage(ws, message) {
    console.log("Preserved messages", this.messages);
    console.log("Processing game message:", message);
    const { type, action, payload } = message;

    if (type !== "game" || !this.messageHandlers[action]) {
      console.warn(`Unhandled message type or action: ${type}/${action}`);
      return {
        type: "error",
        payload: { message: `Unknown action: ${action}` },
      };
    }

    return this.messageHandlers[action](ws, payload);
  }

  handleGameAction(ws, payload) {
    console.log("Processing game action:", payload);

    if (!payload?.gameId || !payload?.playerId) {
      return {
        type: "error",
        payload: { message: "Invalid payload structure." },
      };
    }

    const game = this.activeGames.get(payload.gameId);
    if (!game) {
      return {
        type: "error",
        payload: { message: `Game ${payload.gameId} not found.` },
      };
    }

    if (typeof game.instance.processAction === "function") {
      try {
        const gameResponse = game.instance.processAction(
          payload.playerId,
          payload
        );
        if (gameResponse.logEntry) {
          game.logAction(gameResponse.logEntry);
        }

        const response = {
          type: "game",
          action: "gameAction",
          payload: { ...gameResponse.payload, game },
          broadcast: true,
        };

        //game.relay.broadcastResponse(response);
        this.relayManager.relays.get(game.gameId).broadcastResponse(response);
        return response;
      } catch (error) {
        console.error(`❌ Error processing game action:`, error);
      }
    } else {
      console.warn(`Game ${payload.gameId} does not support game actions.`);
      return { type: "error", payload: { message: "Action not supported." } };
    }
  }

  broadcastToGamePlayers(gameId, message) {
    const gameRelay = this.relayManager.relays.get(gameId);
    if (!gameRelay) {
      console.warn(`Game relay for game ${gameId} not found.`);
      return;
    }
    gameRelay.broadcastResponse(message);
  }

  handleGameEnd(payload) {
    console.log(`Game ${payload.gameId} ended.`);
    this.activeGames.delete(payload.gameId);

    this.broadcastToGamePlayers(payload.gameId, {
      type: "game",
      action: "gameEnded",
      payload: {},
      broadcast: true,
    });
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
    //  constructor(gameId, ports, gameController, targetUrl = null) {

    //type id and options
    this.relayManager.createRelay("game", game.gameId, {
      players: [playerId],
      ports: this.gamePorts,
      controller: this,
    });
    // const gameRelay = new GameRelay(
    //   game.gameId,
    //   [9000, 9001],
    //   this,
    //   this.lobbyWsUrl
    // );
    //game.relay = gameRelay;
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

  endGame(gameId) {
    const game = this.gameController.activeGames.get(gameId);
    if (!game) {
      console.warn(`⚠️ Cannot end game ${gameId}: Not found.`);
      return;
    }

    console.log("Ending game:", game);
    game.status = "ended";
    game.gameLog.push("Game ended.");
    console.log("gameRelay", this.relayManager.relays.get(gameId));
    this.relayManager.relays.get(gameId).broadcastResponse({
      type: "game",
      action: "gameEnded",
      payload: {
        playerId: "lobbyController",
        gameId: gameId,
        status: "ended",
        gameLog: game.gameLog, // Include game history
      },
    });
    setTimeout(() => {
      console.log("Shutting down game relay...");
      this.relayManager.relays.get(gameId).shutdown();
    }, 3000);

    this.activeGames.get(gameId).status = "ended";
    this.activeGames.get(gameId).gameLog.push("Game ended.");
    console.log("active games", this.activeGames);
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
}
module.exports = gameController;
