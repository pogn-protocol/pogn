const RockPaperScissors = require("./rps");
const OddsAndEvens = require("./oddsAndEvens");
const Game = require("./game");

class gameController {
  constructor(gamePorts = [], lobbyWsUrl, relayManager) {
    if (gameController.instance) return gameController.instance;
    gameController.instance = this;
    this.gameClasses = {
      "rock-paper-scissors": RockPaperScissors,
      "odds-and-evens": OddsAndEvens,
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

        game.logAction(gameResponse.logEntry);
        console.log("gameResponse", gameResponse);
        console.log("logEntry", gameResponse.logEntry);

        const response = {
          payload: {
            type: "game",
            action: "gameAction",
            ...gameResponse,
            gameId: game.gameId,
          },
          broadcast: true,
        };

        console.log(
          "gameController Broadcasting gameAction response",
          response
        );
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
    game.lobbyStatus = "ended";
    game.gameLog.push("Game ended.");
    console.log("gameRelay", this.relayManager.relays.get(game.relayId));
    this.relayManager.relays.get(game.relayId).sendToLobbyRelay(game.lobbyId, {
      payload: {
        type: "lobby",
        action: "gameEnded",
        lobbyId: game.lobbyId,
        playerId: gameId,
        gameId: gameId,
        lobbyStatus: "ended",
        gameLog: game.gameLog,
      },
    });
    this.activeGames.get(gameId).lobbyStatus = "ended";
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
    game.setGameInstance(gameInstance);
    return game;
  }

  async createGameRelay(gameId, lobbyId, ports) {
    console.log("Creating game relay", gameId, ports);
    try {
      const gameRelay = await this.relayManager.createRelays([
        {
          type: "game",
          id: gameId,
          options: {
            ports: this.gamePorts,
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
    if (game.players.size < game.instance?.minPlayers) {
      return {
        type: "error",
        payload: { message: "Not enough players to start the game." },
      };
    }

    if (
      game.lobbyStatus !== "canStart" &&
      game.lobbyStatus !== "readyToStart"
    ) {
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
    game.lobbyStatus = "started";
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
      game.lobbyStatus = "readyToStart";
      console.log("The game is ready to start.");
    } else if (game.players.size >= game.instance.minPlayers) {
      game.lobbyStatus = "canStart";
      console.log("The game can start.");
    }
    return game;
  }
}
module.exports = gameController;
