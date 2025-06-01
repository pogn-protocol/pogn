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
    this.observers = new Map();
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

        //  this.gameController.activeGames.set(this.gameId, game);
        lobby.addGame(game);
        // this.lobbyController.startGame({
        //   lobby,
        //   game,
        // });
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

    if (action === "observe") {
      this.observers.set(playerId, ws);
      console.log(`👁️ Player ${playerId} is now observing`);

      const game = this.gameController.activeGames.get(this.gameId);
      const gameState = game?.instance?.getGameDetails?.() || {};

      const view =
        game?.instance?.getPrivateHands?.([playerId])?.[playerId] || {};

        const playersAtTable = [...game.players.entries()].map(([id, p]) => ({
          playerId: id,
          seatIndex: p.seatIndex,
        }));

const observerResponse = {
  relayId: this.relayId,
  uuid: uuidv4(),
  payload: {
    type: "displayGame",
    action: "update",
    playerId,
    gameId: this.gameId,
    gameState,
    playersAtTable, // ✅ add this
    hand: view.hand || [],
    hands: view.hands || {},
  },
};

      console.log("Observer response to send:", observerResponse);
      ws.send(JSON.stringify(observerResponse));
      return;
    }

    if (playerId) {
      this.webSocketMap.set(playerId, ws);
      console.log(`📌 WebSocket for ${playerId} tracked/updated.`);
      console.log("lobbyController", this.lobbyController);
      const lobby = this.lobbyController.lobbies.get(this.lobbyId);
      this.lobbyController.joinLobby({
        lobby,
        playerId,
      });
      console.log(`🧍 Player ${playerId} joined lobby ${this.lobbyId}`);
    }

    let result;
    try {
      let game = this.gameController.activeGames.get(this.gameId);
      const lobby = this.lobbyController.lobbies.get("displayLobby");

      if (!game || !lobby) {
        console.warn("Game or lobby not initialized yet.");
      }
      let startResult = null;
      if (action === "sit" || action === "leave") {
        game = this.lobbyController.lobbies
          .get("displayLobby")
          .getGame(this.gameId);
        console.log("game", game);
        console.log(`🔄 Processing sit/leave action: ${action}`);
        result = this.lobbyController.joinLobbyPlayerToGame({
          lobby,
          game,
          playerId,
          newLobbyStatus: null,
        });
        game.players.get(playerId).seatIndex =
          payload?.gameActionParams?.seatIndex;
        console.log("Game after sit/leave action:", game);
        const realPlayerCount = [...game.players.keys()].filter(
          (id) => id !== this.botId
        ).length;
        console.log(`🧑‍🤝‍🧑 Real player count (excluding bot): ${realPlayerCount}`);
        console.log("game", game);
        if (
          realPlayerCount >= 1 &&
          !this.gameStarted &&
          game.lobbyStatus !== "started"
        ) {
          console.log(
            `🟢 Starting game ${this.gameId} with ${realPlayerCount} players`
          );
          this.gameStarted = true;
          console.log("game.lobbyStatus", game.lobbyStatus);
          console.warn("game.gameStatus", game.gameStatus);
          game.lobbyStatus = "canStart"; // Ensure game is ready to start
          startResult = this.gameController.startGame(game);
          console.log("startResult", startResult);
          if (startResult?.gameAction === "gameStarted") {
            console.log(
              `🎉 Game ${this.gameId} started successfully! Initializing....`
            );
            startResult = game.instance.init();
            game.gameStatus = "in-progress";
            console.log("Game started and initialized:", game);
            console.log("startResult", startResult);
          }
        } else {
          //put the player in the game instance
          // game.instance.players.set(playerId, game.players.get(playerId));
          const seatIndex = game.players.get(playerId).seatIndex;
          console.log(`🪑 Player ${playerId} assigned to seat ${seatIndex} `);

          game.instance.addPlayer(playerId, seatIndex);
          console.log("Game instance updated with players:", game.instance);
        }

        result.playersAtTable = [...game.players.entries()].map(([id, p]) => ({
          playerId: id,
          seatIndex: p.seatIndex,
        }));

        result = {
          payload: {
            ...(startResult || {}),
            type: "displayGame",
            action,
            gameId: this.gameId,
            playerId,
            playersAtTable: [...game.players.entries()].map(([id, p]) => ({
              playerId: id,
              seatIndex: p.seatIndex,
            })),
            gameState: game.instance.getGameDetails(),
          },
          broadcast: true,
        };
        console.log("Sit/leave result:", result);
      } else if (action === "gameAction") {
        console.log("payload", payload);
        result = await this.gameController.processMessage(payload);
        console.log("Game action result:", result);
      } else {
        console.warn(`⚠️ Unknown action: ${action}`);
        return;
      }
      console.log("result", result);
      if (!result) return;

      result.payload.type = "displayGame";

      const response = {
        relayId: this.relayId,
        uuid: uuidv4(),
        ...result,
      };
      console.log("Response to send:", response);
      // 🔐 SEND PRIVATE HANDS TO EACH PLAYER INDIVIDUALLY
      if (response.payload?.private) {
        for (const [targetPlayerId, handData] of Object.entries(
          response.payload.private
        )) {
          const privateResponse = JSON.parse(JSON.stringify(response));
          privateResponse.payload = {
            ...response.payload,
            ...handData,
            playerId: targetPlayerId,
            action: "privateHand",
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

      // 📡 BROADCAST RESPONSE
      if (response.broadcast) {
        console.log(`📡 Broadcasting response to all players`);
        const broadcastPayload = JSON.parse(JSON.stringify(response));
        delete broadcastPayload.payload.private;
        this.broadcastResponse(broadcastPayload);
        //this.bot.receiveGameMessage(broadcastPayload.payload);
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

  broadcastResponse(message) {
    console.log("Broadcasting message to all players and observers:", message);

    for (const [playerId, socket] of this.webSocketMap.entries()) {
      if (playerId === this.botId) continue;
      if (!socket || socket.readyState !== 1) continue;
      try {
        socket.send(JSON.stringify(message));
      } catch (err) {
        console.error(`❌ Failed to send to ${playerId}`, err);
      }
    }

    // Send to all observers
    for (const [observerId, socket] of this.observers.entries()) {
      if (!socket || socket.readyState !== 1) {
        this.observers.delete(observerId);
        continue;
      }
      try {
        socket.send(JSON.stringify(message));
      } catch (err) {
        console.error(`❌ Failed to send to observer ${observerId}`, err);
        this.observers.delete(observerId);
      }
    }

    // Bot last
    if (this.bot?.receiveGameMessage) {
      this.bot.receiveGameMessage(message);
    }
  }

  // broadcastResponse(message) {
  //   console.log("Broadcasting message to all players:", message);
  //   for (const [playerId, socket] of this.webSocketMap.entries()) {
  //     if (playerId === this.botId) continue; // bot is handled separately
  //     if (!socket || socket.readyState !== 1) {
  //       console.warn(`⚠️ WebSocket not open for ${playerId}`);
  //       continue;
  //     }
  //     try {
  //       socket.send(JSON.stringify(message));
  //     } catch (err) {
  //       console.error(`❌ Failed to send to ${playerId}`, err);
  //     }
  //   }

  //   // ✅ Always route to bot separately
  //   if (this.bot && typeof this.bot.receiveGameMessage === "function") {
  //     console.log(`🤖 [PokerBot] Broadcasting message:`, message);
  //     this.bot.receiveGameMessage(message);
  //   }
  // }

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

    // 👁️ Observer cleanup
    if (this.observers.has(playerId)) {
      this.observers.delete(playerId);
      console.log(`👁️ Observer ${playerId} removed on disconnect`);
    }

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
