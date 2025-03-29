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
    let error = null;
    if (message?.payload?.type === "relayConnector") {
      console.log("GameRelay processing relayConnector message:", message);
      this.webSocketMap.set(message?.payload?.relayId, ws);
      this.sendToLobbyRelay(message?.payload?.relayId, {
        relayId: message?.payload?.lobbyId,
        payload: {
          type: "relayConnector",
          action: "gameToLobbyRelayTest",
          // gameId: message?.payload?.gameId,
          lobbyId: message?.payload?.lobbyId,
          relayId: this.relayId,
        },
      });
      return;
    }
    if (message?.payload?.type === "test") {
      console.log("GameRelay processing test message:", message);
      return;
    }

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
      error = "No payload in message";
    }
    const { type, action, gameId, playerId } = payload;
    if (!gameId) {
      console.warn("No gameId in payload:", payload);
      error = "No gameId in payload";
    }
    if (!type || type !== "game") {
      console.error("Type not set to game:", type);
      error = "Type not set to game";
    }
    if (!action) {
      console.error("No action in payload:", payload);
      error = "No action in payload";
    }
    if (!playerId) {
      console.error("No playerId in payload.");
      error = "No playerId in payload";
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
      let response;
      if (!error) {
        response = this.gameController.processMessage(ws, message);
      } else {
        response = {
          type: "error",
          payload: { message: error },
        };
      }
      response.relayId = this.relayId;
      response.uuid = uuidv4();
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
