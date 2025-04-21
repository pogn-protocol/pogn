const RockPaperScissors = require("./rps");
const OddsAndEvens = require("./oddsAndEvens");
const TicTacToe = require("./ticTacToe");
const Game = require("./game");
const { checkGameControllerPermissions } = require("./permissions");

class gameController {
  constructor({ gamePorts = [], lobbyWsUrl, relayManager } = {}) {
    if (gameController.instance) return gameController.instance;
    gameController.instance = this;
    this.gameClasses = {
      "rock-paper-scissors": RockPaperScissors,
      "odds-and-evens": OddsAndEvens,
      "tic-tac-toe": TicTacToe,
    };
    this.activeGames = new Map();
    this.gamePorts = gamePorts;

    this.messageHandlers = {
      gameAction: this.handleGameAction.bind(this),
      endGame: this.endGame.bind(this),
    };

    this.lobbyWsUrl = lobbyWsUrl;
    this.relayManager = relayManager;
    this.messages = [];
  }

  processMessage(ws, message) {
    console.log("Processing game message:", message);
    const { payload } = message;
    const { type, action, playerId } = payload;

    const permission = checkGameControllerPermissions(message);
    if (!permission.allowed) {
      console.warn("⛔ GameController permission denied:", permission.reason);
      return {
        type: "error",
        payload: {
          message: permission.reason,
          action: "permissionDenied",
        },
      };
    }

    if (type !== "game" || !this.messageHandlers[action]) {
      console.warn(`Unhandled message type or action: ${type}/${action}`);
      return {
        type: "error",
        payload: { message: `Unknown action: ${action}` },
      };
    }
    let response = this.messageHandlers[action](ws, payload);
    console.log("gameController response", response);
    if (!response.payload?.playerId) {
      response.payload.playerId = playerId;
    }
    return response;
  }

  handleGameAction(ws, payload) {
    console.log("Processing game action:", payload);

    const { gameId, playerId } = payload || {};
    if (!gameId || !playerId) {
      return {
        type: "error",
        payload: { message: "Invalid payload structure." },
      };
    }

    const game = this.activeGames.get(gameId);
    if (!game) {
      return {
        type: "error",
        payload: { message: `Game ${gameId} not found.` },
      };
    }

    if (payload.gameAction === "playerReady") {
      console.log("[processGameMessage] Player ready:", playerId);
      const player = game.players.get(playerId);
      if (!player) {
        console.log("[processGameMessage] Player not found:", playerId);
        return {
          [playerId]: {
            payload: {
              type: "error",
              message: "Player not found in game.",
              gameId: gameId,
              playerId: playerId,
            },
          },
        };
      }

      if (game.getGameDetails()?.gameStatus === "in-progress") {
        console.warn(
          "[processGameMessage] Game already in progress, ignoring player ready."
        );
        return {}; // do nothing
      }

      player.ready = true;

      const allReady = Array.from(game.players.values()).every(
        (p) => p.ready === true
      );
      console.log("[processGameMessage] All players ready?", allReady);

      if (allReady && typeof game.instance.init === "function") {
        console.log(
          "[processGameMessage] All players are ready, initializing game."
        );
        const initResult = game.instance.init();
        console.log(
          "[processGameMessage] Game initialized initResult:",
          initResult
        );
        return {
          payload: {
            type: "game",
            action: "gameAction",
            gameAction: "gameStarted",
            // playerId: id,
            gameId: gameId,
            // youAre: id,
            ...(initResult || {}),
          },
          broadcast: true,
        };
      }

      return {
        payload: {
          type: "game",
          action: "gameAction",
          gameAction: "playerReady",
          message: "You are now ready. Waiting for other players.",
          readyStates: Object.fromEntries(
            Array.from(game.players.entries()).map(([id, val]) => [
              id,
              val.ready,
            ])
          ),
          gameId: gameId,
        },
      };
    }

    if (!game) {
      return {
        payload: {
          type: "error",
          action: "gameError",
          message: "Game not initialized.",
          gameId: gameId,
          playerId,
        },
      };
    }
    if (typeof game.instance.processAction !== "function") {
      return {
        type: "error",
        payload: { message: "Game instance does not have processAction." },
      };
    }

    let result;
    try {
      result = game.instance.processAction(playerId, payload);
      console.log("gameController processAction result", result);
      game.logAction(result?.logEntry || ""); // Log if available
      //game.gameStatus = result?.gameStatus;
    } catch (error) {
      console.error("Error processing game action:", error);
    }
    return {
      payload: {
        type: "game",
        action: "gameAction",
        ...result,
        gameId: game.gameId,
      },
      broadcast: true,
    };
  }

  endGame(we, payload) {
    const { gameId, playerId } = payload;
    console.log(
      "Player",
      playerId,
      "is ending game",
      gameId,
      "Payload",
      payload
    );

    console.log(this.activeGames);
    const game = this.activeGames.get(gameId);
    if (!game) {
      console.warn(`⚠️ Cannot end game ${gameId}: Not found.`);
      return;
    }

    console.log("Ending game:", game);
    game.gameStatus = "ended";
    game.gameLog.push("Game ended.");
    console.log("gameRelay", this.relayManager.relays.get(game.relayId));
    this.relayManager.relays.get(game.relayId).sendToLobbyRelay(game.lobbyId, {
      payload: {
        type: "lobby",
        action: "gameEnded",
        lobbyId: game.lobbyId,
        playerId: gameId,
        gameId: gameId,
        gameLog: game.gameLog,
      },
    });
    //this.activeGames.get(gameId).lobbyStatus = "ended";
    this.activeGames.get(gameId).gameLog.push("Game ended.");
    console.log("active games", this.activeGames);
    return {
      payload: { type: "game", action: "gameEnded", gameId },
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

  createGame(gameType, createRelay, lobbyId, gameId) {
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
    }
    const game = new Game(gameType, gameId);
    console.log("game", game);
    game.lobbyId = lobbyId;
    const gameInstance = new this.gameClasses[gameType]();
    console.log("gameInstance", gameInstance);
    game.setGameInstance(gameInstance);
    console.log("game created", game);
    return game;
  }

  async createGameRelay(gameId, lobbyId, ports) {
    console.log("Creating game relay", gameId, lobbyId, ports);
    try {
      const gameRelay = await this.relayManager.createRelays([
        {
          type: "game",
          id: gameId,
          options: {
            ports: ports || this.gamePorts,
            controller: this,
            lobbyId: lobbyId,
          },
        },
      ]);

      console.log("gameRelay", gameRelay);
      return gameRelay[0];
    } catch (error) {
      console.error(`❌ Error creating game relay ${gameId}:`, error.message);
    }
  }

  startGame(game) {
    console.log("gameController starting game", game);

    if (!game) {
      return { type: "error", payload: { message: "Game not found." } };
    }

    const players = game.players;
    console.log("players", players, "size", players.size);
    console.log("instance", game.instance);
    if (game.players.size < game.instance?.minPlayers) {
      return {
        type: "error",
        payload: { message: "Not enough players to start the game." },
      };
    }
    console.log("game.lobbyStatus", game.lobbyStatus);
    if (
      game.lobbyStatus !== "canStart" &&
      game.lobbyStatus !== "readyToStart"
    ) {
      return {
        type: "error",
        payload: { message: "Game is not ready to start." },
      };
    }
    console.log("active games", this.activeGames);
    if (this.activeGames.has(game.gameId)) {
      console.warn(`Game ${game.gameId} is already active.`);
      return;
    }
    this.activeGames.set(game.gameId, game);
    console.log(`activeGames`, this.activeGames);
    //game.lobbyStatus = "started";
    game.gameStatus = "started";
    game.instance.players = new Map(game.players); // ✅ fix 1
    game.gameLog.push("Game started.");
    console.log("Game started.", game);
    let result;
    // if (typeof game.instance.init === "function") {
    //   result = game.instance.init();
    //   console.log("Initial game state after init():", initial);
    //   //game.initialState = initial;
    // }
    return {
      payload: {
        type: "game",
        action: "gameAction",
        ...result,
        gameId: game.gameId,
        game,
      },
      broadcast: true,
    };
  }
}
module.exports = gameController;
