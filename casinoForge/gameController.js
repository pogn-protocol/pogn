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
      //gameEnded: this.handleGameEnded.bind(this),
      endGame: this.endGame.bind(this),
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

        console.log(
          "gameController Broadcasting gameAction response",
          response
        );
        this.relayManager.relays.get(game.relayId).broadcastResponse(response);
        return response;
      } catch (error) {
        console.error(`❌ Error processing game action:`, error);
      }
    } else {
      console.warn(`Game ${payload.gameId} does not support game actions.`);
      return { type: "error", payload: { message: "Action not supported." } };
    }
  }

  endGame(we, payload) {
    console.log("Ending game", payload);
    const { gameId } = payload;
    console.log(this.activeGames);
    const game = this.activeGames.get(gameId);
    if (!game) {
      console.warn(`⚠️ Cannot end game ${gameId}: Not found.`);
      return;
    }

    console.log("Ending game:", game);
    game.status = "ended";
    game.gameLog.push("Game ended.");
    console.log("gameRelay", this.relayManager.relays.get(game.relayId));
    this.relayManager.relays.get(game.relayId).sendToLobbyRelay(game.lobbyId, {
      type: "lobby",
      action: "gameEnded",
      lobbyId: game.lobbyId,
      payload: {
        playerId: gameId,
        gameId: gameId,
        status: "ended",
        gameLog: game.gameLog, // Include game history
      },
    });
    setTimeout(() => {
      console.log("Shutting down game relay...");
      this.relayManager.relays.get(game.relayId).shutdown();
    }, 3000);

    this.activeGames.get(gameId).status = "ended";
    this.activeGames.get(gameId).gameLog.push("Game ended.");
    console.log("active games", this.activeGames);
    return {
      type: "game",
      action: "gameEnded",
      payload: { gameId },
      broadcast: true,
    };
  }

  broadcastToGamePlayers(relayId, message) {
    const gameRelay = this.relayManager.relays.get(relayId);
    if (!gameRelay) {
      console.warn(`Game relay for game ${relayId} not found.`);
      return;
    }
    gameRelay.broadcastResponse(message);
  }

  // handleGameEnded(payload) {
  //   console.log(`Game ${payload.gameId} ended.`);
  //   this.activeGames.delete(payload.gameId);

  //   this.broadcastToGamePlayers(payload.gameId, {
  //     type: "game",
  //     action: "gameEnded",
  //     payload: {},
  //     broadcast: true,
  //   });
  // }

  createGame(gameType, createRelay, lobbyId) {
    console.log(
      "Creating game ",
      gameType,
      " with relay: ",
      createRelay,
      " in lobby ",
      lobbyId
    );
    if (!createRelay) {
      console.log("createRelay is false");
      return;
    }
    const game = new Game(gameType);
    game.lobbyId = lobbyId;
    const gameInstance = new this.gameClasses[gameType]();
    game.setGameInstance(gameInstance);

    const relay = this.relayManager.createRelay("game", game.gameId, {
      ports: this.gamePorts,
      controller: this,
      lobbyId: lobbyId,
    });

    game.relayId = relay.id;
    game.wsAddress = relay.wsAddress;

    console.log("relay", relay);
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
    console.log(`activeGames`, this.activeGames);
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
}
module.exports = gameController;
