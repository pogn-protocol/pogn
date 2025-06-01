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
    console.log("id", id);
    this.relayManager = controller;
    this.lobbyId = lobbyId;
    this.gameController = gameController;
    this.gameId = id;
    this.botId = "pokerBot";
    this.gameStarted = false;

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
      })
      .finally(() => {
        this.initBot(this.botId);
      });
  }

  initBot(botId) {
    const game = this.lobbyController.lobbies
      .get("displayLobby")
      .getGame(this.gameId);
    console.log(`🤖 Initializing PokerBot with ID: ${botId}`);
    this.bot = new PokerBot(this.botId, this, this.gameController, this.gameId);
    this.webSocketMap.set(this.botId, this.bot.socket);
    this.lobbyController.joinLobby({
      lobby: this.lobbyController.lobbies.get(this.lobbyId),
      playerId: this.botId,
    });
    this.lobbyController.joinLobbyPlayerToGame({
      lobby: this.lobbyController.lobbies.get(this.lobbyId),
      game,
      playerId: this.botId,
      newLobbyStatus: null,
    });

    game.players.get(botId).seatIndex = 0;
    console.log(
      `🤖 PokerBot ${this.botId} attached and registered in webSocketMap`
    );
  }

  async processMessage(ws, message) {
    console.log("Message received in DisplayGameRelay:", message);
    const { payload } = message;
    const playerId = payload?.playerId;
    const action = payload?.action;

    console.log(
      `📩 [${this.relayId}] Received message from ${playerId || "unknown"}:`,
      payload
    );

    try {
      // Handle player connection and WebSocket tracking
      if (playerId) {
        this.handlePlayerConnection(ws, playerId);
      }

      // Only handle display-specific actions locally, let parent handle others
      if (this.shouldHandleLocally(action)) {
        const result = await this.routeAction(action, payload, playerId);
        if (result) {
          await this.sendGameResponse(result, playerId);
        }
      } else {
        // For standard game actions, we need to handle them ourselves since
        // parent expects different payload type
        const result = await this.handleGameAction(payload);
        if (result) {
          await this.sendGameResponse(result, playerId);
        }
      }
    } catch (err) {
      console.error(
        "❌ Error during DisplayGameRelay message processing:",
        err
      );
      this.sendErrorResponse(playerId, err);
    }
  }

  shouldHandleLocally(action) {
    // Display relay handles seating and display-specific actions
    const displayActions = ["sit", "leave"];
    return displayActions.includes(action);
  }

  handlePlayerConnection(ws, playerId) {
    // Only set if not already tracked to avoid overriding parent logic
    if (!this.webSocketMap.has(playerId)) {
      this.webSocketMap.set(playerId, ws);
      console.log(`📌 WebSocket for ${playerId} tracked/updated.`);
    }

    const lobby = this.lobbyController.lobbies.get(this.lobbyId);
    if (lobby && !lobby.players?.has(playerId)) {
      this.lobbyController.joinLobby({ lobby, playerId });
      console.log(`🧍 Player ${playerId} joined lobby ${this.lobbyId}`);
    }
  }

  async routeAction(action, payload, playerId) {
    switch (action) {
      case "sit":
      case "leave":
        return this.handleSeatAction(action, payload, playerId);
      default:
        console.log(`Delegating action '${action}' to game controller`);
        return null; // Will be handled by handleGameAction
    }
  }

  handleSeatAction(action, payload, playerId) {
    console.log(`🔄 Processing sit/leave action: ${action}`);

    const game = this.lobbyController.lobbies
      .get("displayLobby")
      .getGame(this.gameId);
    const lobby = this.lobbyController.lobbies.get("displayLobby");

    if (!game || !lobby) {
      throw new Error("Game or lobby not initialized");
    }

    // Join player to game
    const result = this.lobbyController.joinLobbyPlayerToGame({
      lobby,
      game,
      playerId,
      newLobbyStatus: null,
    });

    // Set seat index
    const seatIndex = payload?.gameActionParams?.seatIndex;
    if (seatIndex !== undefined) {
      game.players.get(playerId).seatIndex = seatIndex;
      console.log(`🪑 Player ${playerId} assigned to seat ${seatIndex}`);
    }

    // Check if game should start
    const realPlayerCount = [...game.players.keys()].filter(
      (id) => id !== this.botId
    ).length;
    console.log(`🧑‍🤝‍🧑 Real player count (excluding bot): ${realPlayerCount}`);

    let startResult = null;
    if (this.shouldStartGame(realPlayerCount, game)) {
      startResult = this.startGame(game);
    } else if (realPlayerCount > 0) {
      // Add existing player to running game
      game.instance.addPlayer(playerId, seatIndex);
      console.log(`🎮 Player ${playerId} added to existing game`);
    }

    return this.createSeatActionResponse(action, playerId, game, startResult);
  }

  shouldStartGame(realPlayerCount, game) {
    return (
      realPlayerCount >= 1 &&
      !this.gameStarted &&
      game.lobbyStatus !== "started"
    );
  }

  startGame(game) {
    console.log(`🟢 Starting game ${this.gameId} with players`);
    this.gameStarted = true;

    game.lobbyStatus = "canStart";
    const startResult = this.gameController.startGame(game);

    if (startResult?.gameAction === "gameStarted") {
      console.log(
        `🎉 Game ${this.gameId} started successfully! Initializing....`
      );
      const initResult = game.instance.init();
      game.gameStatus = "in-progress";
      return { ...startResult, ...initResult };
    }

    return startResult;
  }

  createSeatActionResponse(action, playerId, game, startResult) {
    const playersAtTable = [...game.players.entries()].map(([id, p]) => ({
      playerId: id,
      seatIndex: p.seatIndex,
    }));

    return {
      payload: {
        ...(startResult || {}),
        type: "displayGame",
        action,
        gameId: this.gameId,
        playerId,
        playersAtTable,
        gameState: game.instance.getGameDetails(),
      },
      broadcast: true,
    };
  }

  async handleGameAction(payload) {
    console.log("🎮 Processing game action:", payload);
    const result = await this.gameController.processMessage(payload);
    console.log("Game action result:", result);
    return result;
  }

  async sendGameResponse(result, playerId) {
    if (!result) return;

    result.payload.type = "displayGame";
    const response = {
      relayId: this.relayId,
      uuid: uuidv4(),
      ...result,
    };

    console.log("Response to send:", response);

    // Handle private data (like hole cards)
    // if (response.payload?.private) {
    //   this.sendPrivateData(response);
    // }
    if (response.payload?.private) {
      // Only send private hands to players in game.players map
      response.payload.private = Object.fromEntries(
        Object.entries(response.payload.private).filter(([id]) =>
          this.gameController.activeGames.get(this.gameId)?.players?.has(id)
        )
      );
      this.sendPrivateData(response);
    }

    // Handle broadcast vs direct response
    if (response.broadcast) {
      this.sendBroadcastResponse(response);
    } else if (playerId) {
      this.sendDirectResponse(playerId, response);
    }
  }

  sendPrivateData(response) {
    console.log("🔐 Sending private data to players");

    for (const [targetPlayerId, handData] of Object.entries(
      response.payload.private
    )) {
      const privateResponse = {
        ...JSON.parse(JSON.stringify(response)),
        payload: {
          ...response.payload,
          ...handData,
          playerId: targetPlayerId,
          action: "privateHand",
        },
      };
      delete privateResponse.payload.private;

      if (targetPlayerId === this.botId) {
        console.log(`🤖 Sending private hand to bot`, privateResponse);
        this.bot.receiveGameMessage(privateResponse);
      } else {
        console.log(`🔐 Sending private hand to ${targetPlayerId}`);
        this.sendResponse(targetPlayerId, privateResponse);
      }
    }
  }

  sendBroadcastResponse(response) {
    console.log(`📡 Broadcasting response to all players`);
    const broadcastPayload = JSON.parse(JSON.stringify(response));
    delete broadcastPayload.payload.private;
    this.broadcastResponse(broadcastPayload);
  }

  sendDirectResponse(playerId, response) {
    console.log(`📬 Sending direct response to ${playerId}`);
    this.sendResponse(playerId, response);
  }

  sendErrorResponse(playerId, error) {
    const errorResponse = {
      relayId: this.relayId,
      uuid: uuidv4(),
      payload: {
        type: "error",
        action: "controllerError",
        message: error.message,
      },
    };

    if (playerId) {
      this.sendResponse(playerId, errorResponse);
    }
  }

  broadcastResponse(message) {
    console.log("Broadcasting message to all players:", message);
    for (const [playerId, socket] of this.webSocketMap.entries()) {
      if (playerId === this.botId) continue; // bot is handled separately
      if (!socket || socket.readyState !== 1) {
        console.warn(`⚠️ WebSocket not open for ${playerId}`);
        continue;
      }
      try {
        socket.send(JSON.stringify(message));
      } catch (err) {
        console.error(`❌ Failed to send to ${playerId}`, err);
      }
    }

    // ✅ Always route to bot separately
    if (this.bot && typeof this.bot.receiveGameMessage === "function") {
      console.log(`🤖 [PokerBot] Broadcasting message:`, message);
      this.bot.receiveGameMessage(message);
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
