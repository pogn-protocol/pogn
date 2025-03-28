const Relay = require("./relay");
const { v4: uuidv4 } = require("uuid");
const RelayConnector = require("./relayConnector");

class GameRelay extends Relay {
  constructor(relayId, ports, gameController) {
    console.log("Initializing GameRelay...", relayId, ports);
    super("game", relayId, ports);
    this.gameController = gameController;
    this.ports = ports;
    this.relayId = relayId;
    this.players = [];
    this.lobbyWs = null;
    this.lobbyId = null;
    this.gameIds = [];
    //console ever 5 seconds if running
    // this.interval = setInterval(() => {
    //   console.log("GameRelay is running...");
    //   console.log("Active games", this.gameController.activeGames);
    //   console.log("WebSocket Map", this.webSocketMap);
    // }, 30000);
  }

  processMessage(ws, message) {
    const response = {
      relayId: null,
      payload: {
        type: null,
        action: null,
        gameId: null,
        playerId: null,
      },
    };

    console.log("GameRelay for games:", this.gameIds);
    console.log("🎮 GameRelay Processing Message:", message);

    if (message?.relayId !== this.relayId) {
      console.error(
        `Game relay ${this.relayId} received message for different relay:`,
        message.relayId
      );
      response.error = `Game relay ${this.relayId} received message for different relay:`;
    }

    const payload = message.payload;
    if (!payload) {
      console.error("No payload in message:", message);
      response.error = "No payload in message";
    }
    const { type, action, gameId, playerId } = payload;
    if (!gameId) {
      console.warn("No gameId in payload:", payload);
      response.error = "No gameId in payload";
    }
    if (!type || type !== "game") {
      console.error("Type not set to game:", type);
      response.error = "Type not set to game";
    }
    if (!action) {
      console.error("No action in payload:", payload);
      response.error = "No action in payload";
    }
    if (!playerId) {
      console.error("No playerId in payload.");
      response.error = "No playerId in payload";
    }
    if (response.error) {
      this.sendResponse(ws, response);
      return;
    }

    if (action === "test") {
      console.warn("⚠️ Test Message Recieved:", type);
      console.log("message", message);
      this.webSocketMap.set(payload.lobbyId, ws);
      this.sendToLobbyRelay(payload.lobbyId, {
        relayId: this.relayId,
        payload: {
          type: "test",
          gameId: payload.gameId,
          lobbyId: payload.lobbyId,
        },
      });
      return;
    }
    if (type !== "game") {
      console.warn("⚠️ Message sent to game not of type game:", type);
      return;
    }
    if (!this.gameIds.includes(gameId)) {
      console.warn("⚠️ Game not found in this relay.");
      return;
    }
    const game = this.gameController.activeGames.get(gameId);
    if (!game) {
      console.warn("⚠️ Game not found.");
      return;
    }

    if (playerId) {
      this.webSocketMap.set(playerId, ws);
      console.log(`✅ WebSocket mapped to real player ID: ${playerId}`);
    }
    try {
      response = this.gameController.processMessage(ws, message);
      console.log("GameRelay response:", response);
      if (response?.private) {
        this.sendResponse(ws, response.private);
      }
      //remove private from response
      delete response.private;
      if (response?.broadcast) {
        this.broadcastResponse(response);
      } else {
        this.sendResponse(ws, response);
      }
    } catch (error) {
      console.error("❌ GameRelay Error processing message:", error);
    }
  }

  sendToLobbyRelay(lobbyId, message) {
    console.log(`📡 Sending to LobbyId ${lobbyId}:`, message);
    this.sendResponse(lobbyId, message);
  }
}

module.exports = GameRelay;
