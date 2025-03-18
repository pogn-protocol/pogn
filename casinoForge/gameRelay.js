const Relay = require("./relay");
const { v4: uuidv4 } = require("uuid");
const RelayConnector = require("./relayConnector");

class GameRelay extends Relay {
  constructor(gameId, ports, gameController, targetUrl = null) {
    console.log("Initializing GameRelay...");
    super("game", gameId, ports[0]);
    this.gameController = gameController;
    this.ports = ports;
    this.gameId = gameId;
    this.players = [];

    // players.forEach((playerId) => this.webSocketMap.set(playerId, null));
    //console ever 5 seconds if running
    // this.interval = setInterval(() => {
    //   console.log("GameRelay is running...");
    //   console.log("Active games", this.gameController.activeGames);
    //   console.log("WebSocket Map", this.webSocketMap);
    // }, 30000);

    if (targetUrl) {
      this.relayConnector = new RelayConnector(targetUrl);
    }
  }

  processMessage(ws, message) {
    console.log("🎮 GameRelay Processing Message:", message);
    const { payload } = message;
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
}

module.exports = GameRelay;
