const cusGames = require("../games/gamesIndex");
const BaseController = require("./baseController");
const Game = require("../gameHubClasses/game");
const {
  checkGameControllerPermissions,
} = require("../gamehubUtils/permissions");
const {
  validateGameControllerResponse,
  validateGameAction,
} = require("../gamehubUtils/validations");

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
    console.log("GameController processMessage", payload);
    const game = this.activeGames.get(payload.gameId);

    return await super.processMessage({ ...payload, game }, [
      validateGameAction,
      checkGameControllerPermissions,
      (p) => ({ game: this.activeGames.get(p.gameId) }),
      (p) =>
        this.actionHandlers[p.action]?.(p) ??
        this.errorPayload("Unknown action", p),
    ]);
  }

  handleGameAction(payload) {
    console.log("GameController handleGameAction", payload);
    const { game, gameId, playerId, gameAction, gameActionParams } = payload;

    let validation;
    try {
      validation = validateGameAction({ gameId, playerId, gameAction, game });
    } catch (error) {
      console.error("Error validating game action:", error);
      return this.errorPayload(error.message, { gameId });
    }

    console.log("GameController handleGameAction validation", validation);

    if (validation.error) {
      console.warn(
        `Game action validation failed: ${validation.error.message}`,
        validation.error
      );
      return this.errorPayload(validation.error.message, {
        gameId,
        playerId,
        gameAction,
      });
    }

    if (validation.skip) return;
    this.errorPayload("Player already ready.", {
      gameId,
      playerId,
      gameAction,
    });

    if (validation.readyCheck) {
      console.log(".readyCheck");
      const player = game.players.get(playerId);
      if (!player) {
        return this.errorPayload(`Player ${playerId} not found in game.`, {
          gameId,
        });
      }
      player.ready = true;
      console.log("game players", game.players);
      const allReady = Array.from(game.players.values()).every((p) => p.ready);

      if (
        allReady &&
        typeof game.instance.init === "function" &&
        game.gameStatus !== "in-progress"
      ) {
        game.instance.players = new Map(game.players);
        const initResult = game.instance.init();
        game.gameStatus = "in-progress";
        console.log("Game started.", game);
        return this.steralizePayload("game", "gameAction", {
          gameAction: "gameStarted",
          gameId,
          playerId,
          ...initResult,
        });
      }
      console.log("Player ready", playerId, game.players);
      return this.steralizePayload("game", "gameAction", {
        gameAction: "playerReady",
        message: "You are now ready. Waiting for other players.",
        readyStates: Object.fromEntries(
          Array.from(game.players.entries()).map(([id, val]) => [id, val.ready])
        ),
        playerId,
        gameId,
      });
    }

    let result;
    try {
      console.log("Processing game action", gameAction);
      result = game.instance.processAction(playerId, {
        gameAction,
        ...gameActionParams,
      });
      console.log("Game action result", result);
      game.logAction(result?.logEntry || "");
      if (!result?.action) {
        result.action = "gameAction";
      }
      result.gameId = gameId;
      result.playerId = playerId;
      let validResult = validateGameControllerResponse(result);
      if (validResult.error) {
        console.warn(
          `Game action processing validation failed: ${validResult.error}`,
          validResult.error
        );
        return this.errorPayload(validResult.error, {
          gameId,
          playerId,
          gameAction,
        });
      }
    } catch (error) {
      console.error("Error processing game action:", error);
      return this.errorPayload(
        "Something went wrong during action execution.",
        { gameId, playerId }
      );
    }
    console.log("Game action result after validation", result);
    return this.steralizePayload("game", "gameAction", result);
  }

  getGameConfigs(gameTypes = []) {
    console.log("Fetching game configs for types:", gameTypes);
    const result = {};
    for (const type of gameTypes) {
      try {
        const instance = new this.customGames[type]();
        console.log("Game instance", instance);
        result[type] = {
          maxPlayers: instance.maxPlayers,
          minPlayers: instance.minPlayers,
        };
        console.log("Game config", result[type]);
      } catch (e) {
        console.warn(`⚠️ Could not instantiate game type "${type}"`);
        result[type] = null;
      }
    }
    console.log("gameController Game configs response:", result);
    return result;
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

    return {
      action: "gameAction",
      gameAction: "gameEnded",
      gameId: gameId,
      playerId: playerId,
      gameLog: game.gameLog,
      game,
    };
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

    return {
      action: "gameAction",
      gameId: game.gameId,
      playerId: game.playerId,
      gameAction: "gameStarted",
      ...result,
    };
  }
}
module.exports = GameController;
