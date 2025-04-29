const cusGames = require("./games/gamesIndex");
const BaseController = require("./baseController");
const Game = require("./game");
const { checkGameControllerPermissions } = require("./permissions");
const {
  validateGameControllerResponse,
  validateGameAction,
} = require("./validations");

class GameController extends BaseController {
  constructor({ gamePorts = [], lobbyWsUrl, relayManager, customGames }) {
    super({ type: "game", relayManager });
    this.customGames = cusGames;
    this.activeGames = new Map();
    this.gamePorts = gamePorts;
    this.lobbyWsUrl = lobbyWsUrl;

    this.actionHandlers = {
      gameAction: this.handleGameAction.bind(this),
      endGame: this.endGame.bind(this),
    };
  }

  async processMessage(payload) {
    return await super.processMessage(payload, [
      validateGameAction,
      checkGameControllerPermissions,
      (p) => ({ game: this.activeGames.get(p.gameId) }),
      (p) => this.actionHandlers[p.action]?.(p),
      validateGameControllerResponse,
    ]);
  }

  // async processMessage(ws, message) {
  //   return await super.processMessage(
  //     message,
  //     checkGameControllerPermissions,
  //     (payload) => ({ ws, game: this.activeGames.get(payload.gameId) }),
  //     validateGameControllerResponse
  //   );
  // }

  handleGameAction({ ws, game, gameId, playerId, gameAction, payload }) {
    console.log("GameController handleGameAction", {
      gameId,
      playerId,
      gameAction,
    });

    const validation = validateGameAction(
      { gameId, playerId, gameAction, ...payload },
      game
    );

    if (!validation.valid) {
      return this.errorPayload(
        validation.error.type,
        validation.error.message,
        validation.error.payload
      );
    }

    if (validation.skip) return {};

    if (validation.readyCheck) {
      const player = game.players.get(playerId);
      if (!player) {
        return this.errorPayload(
          "playerNotFound",
          `Player ${playerId} not found in game.`,
          payload
        );
      }

      // Ignore if already ready
      if (player.ready) {
        return {
          payload: {
            type: "game",
            action: "gameAction",
            gameAction: "playerReady",
            message: "Already marked as ready.",
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

      player.ready = true;

      const allReady = Array.from(game.players.values()).every((p) => p.ready);

      if (
        allReady &&
        typeof game.instance.init === "function" &&
        game.gameStatus !== "in-progress"
      ) {
        const initResult = game.instance.init();
        game.gameStatus = "in-progress";
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

  // handleGameAction({ ws, game, gameId, playerId, gameAction, ...payload }) {
  //   console.log("GameController handleGameAction", {
  //     gameId,
  //     playerId,
  //     gameAction,
  //   });

  //   const validation = validateGameAction(
  //     { gameId, playerId, gameAction, ...payload },
  //     game
  //   );
  //   if (!validation.valid)
  //     return this.errorPayload(
  //       validation.error.type,
  //       validation.error.message,
  //       validation.error.payload
  //     );
  //   if (validation.skip) return {};

  //   if (validation.readyCheck) {
  //     const player = game.players.get(playerId);
  //     player.ready = true;
  //     const allReady = Array.from(game.players.values()).every((p) => p.ready);

  //     if (allReady && typeof game.instance.init === "function") {
  //       const initResult = game.instance.init();
  //       return this.broadcastPayload("game", "gameAction", {
  //         gameId,
  //         playerId,
  //         gameAction: "gameStarted",
  //         ...initResult,
  //       });
  //     }

  //     return {
  //       payload: {
  //         type: "game",
  //         action: "gameAction",
  //         gameAction: "playerReady",
  //         message: "You are now ready. Waiting for other players.",
  //         readyStates: Object.fromEntries(
  //           Array.from(game.players.entries()).map(([id, val]) => [
  //             id,
  //             val.ready,
  //           ])
  //         ),
  //         playerId,
  //         gameId,
  //       },
  //     };
  //   }

  //   let result;
  //   try {
  //     result = game.instance.processAction(playerId, payload);
  //     game.logAction(result?.logEntry || "");
  //   } catch (error) {
  //     console.error("Error processing game action:", error);
  //     return this.errorPayload("actionError", error.message, payload);
  //   }

  //   return this.broadcastPayload("game", "gameAction", {
  //     gameId,
  //     playerId,
  //     gameAction,
  //     ...result,
  //   });
  // }

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
    game.gameStatus = "started";
    game.instance.players = new Map(game.players); // ✅ fix 1
    game.gameLog.push("Game started.");
    console.log("Game started.", game);
    let result;

    return this.broadcastPayload("game", "gameAction", {
      gameId: game.gameId,
      playerId: game.playerId,
      gameAction: "gameStarted",
      ...result,
    });
  }
}
module.exports = GameController;
