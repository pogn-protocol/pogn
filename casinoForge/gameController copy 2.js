const cusGames = require("./games/gamesIndex");
const BaseController = require("./baseController");
const Game = require("./game");
const { checkGameControllerPermissions } = require("./permissions");
const { validateGameControllerResponse } = require("./validations");

class GameController extends BaseController {
  constructor({ gamePorts = [], lobbyWsUrl, relayManager, customGames }) {
    super({ relayManager });
    this.customGames = cusGames;
    this.activeGames = new Map();
    this.gamePorts = gamePorts;
    this.lobbyWsUrl = lobbyWsUrl;
    this.messages = [];

    this.messageHandlers = {
      gameAction: this.handleGameAction.bind(this),
      endGame: this.endGame.bind(this),
    };
  }

  async processMessage(ws, message) {
    return await super.processMessage(
      message,
      checkGameControllerPermissions,
      (payload) => ({ ws, game: this.activeGames.get(payload.gameId) }),
      validateGameControllerResponse // ✅ validate game structure here
    );
  }

  handleGameAction({ ws, game, gameId, playerId, gameAction }) {
    console.log("GameController handleGameAction", {
      gameId,
      playerId,
      gameAction,
    });
    if (!gameId || !playerId) {
      return this.errorPayload(
        "invalidPayload",
        "Missing gameId or playerId",
        payload
      );
    }

    // game = this.activeGames.get(gameId);
    if (!game) {
      return this.errorPayload(
        "gameNotFound",
        `Game ${gameId} not found.`,
        payload
      );
    }

    if (gameAction === "playerReady") {
      const player = game.players.get(playerId);
      if (!player) {
        return this.errorPayload(
          "playerNotFound",
          `Player ${playerId} not in game.`,
          payload
        );
      }

      if (game.getGameDetails()?.gameStatus === "in-progress") {
        return {};
      }

      player.ready = true;
      const allReady = Array.from(game.players.values()).every(
        (p) => p.ready === true
      );

      if (allReady && typeof game.instance.init === "function") {
        const initResult = game.instance.init();
        return this.broadcastPayload("game", "gameAction", {
          gameId,
          playerId,
          gameAction: "gameStarted",
          ...initResult,
        });
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
          playerId,
          gameId,
        },
      };
    }

    if (typeof game.instance.processAction !== "function") {
      return this.errorPayload(
        "invalidGame",
        "Game instance does not have processAction.",
        payload
      );
    }

    let result;
    try {
      result = game.instance.processAction(playerId, payload);
      game.logAction(result?.logEntry || "");
    } catch (error) {
      console.error("Error processing game action:", error);
      return this.errorPayload("actionError", error.message, payload);
    }

    return this.broadcastPayload("game", "gameAction", {
      gameId,
      playerId,
      gameAction,
      ...result,
    });
  }

  endGame(we, payload) {
    const { gameId, playerId } = payload;
    const game = this.activeGames.get(gameId);
    if (!game) return;

    game.gameStatus = "ended";
    game.gameLog.push("Game ended.");
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

    return this.broadcastPayload("game", "gameEnded", { gameId });
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
    const gameInstance = new this.customGames[gameType]();
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
    // return {
    //   payload: {
    //     type: "game",
    //     action: "gameAction",
    //     ...result,
    //     gameId: game.gameId,
    //     game,
    //   },
    //   broadcast: true,
    // };
    return this.broadcastPayload("game", "gameAction", {
      gameId: game.gameId,
      playerId: game.playerId,
      gameAction: "gameStarted",
      ...result,
    });
  }
}
module.exports = GameController;
