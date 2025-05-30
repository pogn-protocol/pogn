const GameRelay = require("../relayServices/gameRelay");
const PokerBot = require("./pokerBot");
const { v4: uuidv4 } = require("uuid");
const GameController = require("../controllers/gameController");
const LobbyController = require("../controllers/lobbyController");

class DisplayGameRelay extends GameRelay {
  constructor({ id, ports, host, controller }) {
    const gameController = new GameController({
      gamePorts: ports,
      lobbyWsUrl: `ws://${host}:${ports[0]}`,
      customGames: {
        poker: require("./pokerGame"),
      },
    });
    const lobbyId = "displayLobby";

    super({ id, ports, gameController, lobbyId, host });
    this.relayManager = controller;
    this.lobbyId = lobbyId;
    this.gameController = gameController;
    this.gameId = id;
    this.botId = "pokerBot";

    console.log(`🟢 DisplayGameRelay initialized for gameId: ${this.gameId}`);

    this.lobbyController = new LobbyController({
      gameController: this.gameController,
      relayManager: this.relayManager,
      lobbyPorts: ports,
      lobbyWsUrl: `ws://${host}:${ports[0]}`,
    });

    this.lobbyController
      .createLobby({ lobbyId: this.lobbyId, playerId: this.botId })
      .then(() => {
        const lobby = this.lobbyController.lobbies.get(this.lobbyId);
        const game = this.gameController.createGame(
          "poker",
          false,
          this.lobbyId,
          this.gameId
        );
        this.gameController.activeGames.set(this.gameId, game);
        lobby.addGame(game);

        console.log(
          `🎮 Game ${this.gameId} registered in lobby ${this.lobbyId}`
        );
      })
      .catch((err) => {
        console.error(
          "❌ Failed to initialize DisplayGameRelay lobby/game:",
          err
        );
      });
    this.bot = new PokerBot(this.botId, this.gameController, this.gameId);
    this.webSocketMap.set(this.botId, this.bot.socket);

    console.log(
      `🤖 PokerBot ${this.botId} attached and registered in WebSocketMap`
    );
  }

  async processMessage(ws, message) {
    const { payload } = message;
    const playerId = payload?.playerId;
    const action = payload?.action;

    console.log(
      `📩 [${this.relayId}] Received message from ${playerId || "unknown"}:`,
      payload
    );

    if (playerId) {
      this.webSocketMap.set(playerId, ws);
      console.log(`📌 WebSocket for ${playerId} tracked/updated.`);
      console.log("lobbyController", this.lobbyController);
      // Ensure player is added to lobby if not already
      const lobby = this.lobbyController.lobbies.get(this.lobbyId);
      console.log("lobby", lobby);
      if (lobby.players.has(playerId)) {
        lobby.addPlayer({ playerId });
        console.log(`🧍 Player ${playerId} joined lobby ${lobby.lobbyId}`);
      }
    }

    let result;

    try {
      const game = this.gameController.activeGames.get(this.gameId);
      const lobby = this.lobbyController.lobbies.get("displayLobby");

      if (!game || !lobby) {
        throw new Error("Game or lobby not initialized yet.");
      }

      if (action === "sit" || action === "leave") {
        // ✅ Route to lobbyController joinLobbyPlayerToGame
        result = this.lobbyController.joinLobbyPlayerToGame({
          lobby,
          game,
          playerId,
          newLobbyStatus: null,
        });

        game.instance.addPlayer(playerId, payload.seatIndex);
        result.playersAtTable = [...game.players.entries()].map(([id, p]) => ({
          playerId: id,
          seatIndex: p.seatIndex,
        }));
        result.gameState = game.instance.getGameDetails();
      } else if (action === "gameAction") {
        // ✅ Route to gameController for any game actions (bet, fold, etc)
        result = await this.gameController.processMessage(payload);
      } else {
        console.warn(`⚠️ Unknown action: ${action}`);
        return;
      }

      if (!result) return;

      result.relayId ??= this.relayId;
      result.uuid = uuidv4();
      result.type = "displayGame";

      const response = {
        relayId: this.relayId,
        uuid: uuidv4(),
        payload: result,
      };

      // 🔐 PRIVATE RESPONSE
      if (result.private && playerId) {
        console.log(`🔐 Sending private response to ${playerId}`);
        this.sendResponse(playerId, JSON.parse(JSON.stringify(response)));

        if (playerId === this.botId) {
          this.bot.receiveGameMessage(result);
        }
        return;
      }

      // 📡 BROADCAST RESPONSE
      if (result.broadcast) {
        console.log(`📡 Broadcasting response to all players`);
        const broadcastPayload = JSON.parse(JSON.stringify(response));
        delete broadcastPayload.payload.private;
        this.broadcastResponse(broadcastPayload);
        return;
      }

      // 📬 DEFAULT TO DIRECT RESPONSE
      if (playerId) {
        console.log(`📬 Sending direct response to ${playerId}`);
        this.sendResponse(playerId, response);
      }
    } catch (err) {
      console.error(
        "❌ Error during DisplayGameRelay message processing:",
        err
      );
      this.sendResponse(playerId, {
        relayId: this.relayId,
        payload: {
          type: "error",
          action: "controllerError",
          message: err.message,
        },
      });
    }
  }

  removeSocket(ws) {
    let playerId = null;

    // 🔍 Reverse-lookup playerId from socket
    for (const [id, socket] of this.webSocketMap.entries()) {
      if (socket === ws) {
        playerId = id;
        break;
      }
    }

    // 👇 Always call parent method to clean up map
    super.removeSocket(ws);

    if (!playerId) {
      console.warn("⚠️ Could not identify playerId for closed socket.");
      return;
    }

    console.log(`🧹 Cleaning up player ${playerId} on disconnect...`);

    // 💬 Try to remove from lobby
    const lobby = this.lobbyController?.lobbies?.get("displayLobby");
    if (lobby?.players?.has(playerId)) {
      lobby.players.delete(playerId);
      console.log(`🚪 Player ${playerId} removed from lobby`);
    }

    // ♠️ Try to remove from game
    const game = this.gameController?.activeGames?.get(this.gameId);
    if (game?.players?.has(playerId)) {
      game.players.delete(playerId);
      console.log(`🪑 Player ${playerId} removed from game`);
    }
  }
}

module.exports = DisplayGameRelay;
