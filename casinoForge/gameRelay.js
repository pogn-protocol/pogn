const Relay = require("./relay");
const { v4: uuidv4 } = require("uuid");
const RelayConnector = require("./relayConnector");

class GameRelay extends Relay {
  constructor(gameId, ports, gameController) {
    console.log("Initializing GameRelay...", gameId, ports);
    super("game", gameId, ports[0]);
    this.gameController = gameController;
    this.ports = ports;
    this.gameId = gameId;
    this.players = [];
    this.lobbyWs = null;
    this.lobbyId = null;
    //console ever 5 seconds if running
    // this.interval = setInterval(() => {
    //   console.log("GameRelay is running...");
    //   console.log("Active games", this.gameController.activeGames);
    //   console.log("WebSocket Map", this.webSocketMap);
    // }, 30000);
  }

  processMessage(ws, message) {
    console.log("🎮 GameRelay Processing Message:", message);

    const { type, action, payload } = message;
    //type test console
    if (action === "test") {
      console.warn("⚠️ Test Message Recieved:", type);
      console.log("message", message);
      this.webSocketMap.set(payload.id, ws);
      this.sendToLobbyRelay(payload.id, {
        type: "test",
        payload: { relayType: this.type, gameId: this.gameId },
      });
      return;
    }
    if (type !== "game") {
      console.warn("⚠️ Message sent to game not of type game:", type);
      return;
    }
    const gameId = payload?.gameId;
    const game = this.gameController.activeGames.get(gameId);
    if (!game) {
      console.warn("⚠️ Game not found.");
      return;
    }

    const playerId = payload?.playerId;
    if (playerId) {
      this.webSocketMap.set(playerId, ws);
      console.log(`✅ WebSocket mapped to real player ID: ${playerId}`);
    }
    try {
      this.gameController.processMessage(ws, message);
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
