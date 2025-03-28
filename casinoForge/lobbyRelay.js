const Relay = require("./relay");

class LobbyRelay extends Relay {
  constructor(lobbyId, ports, lobbyController, targetUrl = null) {
    super("lobby", lobbyId, ports);
    this.lobbyController = lobbyController;
    this.relayConnections = new Map();
  }

  async processMessage(ws, message) {
    const response = {
      relayId: this.id,
      payload: {
        type: null,
        action: null,
        lobbyId: null,
        playerId: null,
      },
    };
    console.log(`Processing message in lobby relay ${this.id}:`, message);
    if (message?.relayId !== this.id) {
      console.error(
        `Lobby relay ${this.id} received message for ${message.relayId} relay:`,
        message
      );
      return;
    }

    const payload = message.payload;
    if (!payload) {
      console.error("No payload in message:", message);
      return;
    }
    const { type, action, lobbyId, playerId } = payload;
    if (!lobbyId) {
      console.error("No lobbyId in payload:", payload);
      return;
    }
    if (!type || type !== "lobby") {
      console.error("Type not set to lobby:", type);
      return;
    }
    if (!action) {
      console.error("No action in payload:", payload);
      return;
    }
    if (!playerId) {
      console.warn("No playerId in payload.");
      return; // ✅ Return early
    }

    if (type === "test") {
      console.warn("Lobby relay received test message:", type);
      console.log("message", message);
      const oldId = [...this.webSocketMap.keys()].find(
        (key) => this.webSocketMap.get(key) === ws
      );

      if (oldId) {
        console.log(
          `🔄 Updating WebSocket ID from ${oldId} to ${payload.gameId}`
        );
        this.webSocketMap.delete(oldId); // Remove the old ID
      }

      this.webSocketMap.set(payload.gameId, ws);
      return;
    }

    console.log("Processing lobby message:", { action, payload });
    const existingSocket = this.webSocketMap.get(playerId);

    if (existingSocket && existingSocket !== ws) {
      console.log(`Player ${playerId} reconnected. Replacing old WebSocket.`);
      existingSocket.send(
        JSON.stringify({
          payload: {
            type: "lobby",
            action: "disconnected",
            playerId,
            lobbyId: payload.lobbyId,
            message: "You have been disconnected due to a new connection.",
          },
        })
      );
      existingSocket.close();
      this.webSocketMap.delete(playerId);
    }

    const oldId = [...this.webSocketMap.keys()].find(
      (key) => this.webSocketMap.get(key) === ws
    );

    if (oldId) {
      console.log(`🔄 Updating WebSocket ID from ${oldId} to ${playerId}`);
      this.webSocketMap.delete(oldId); // Remove the old ID
    }

    this.webSocketMap.set(playerId, ws);
    console.log(`Player ${playerId} added to WebSocket map.`);

    response =
      action === "login"
        ? await this.lobbyController.testGames(payload.lobbyId)
        : this.lobbyController.processMessage(message);
    console.log("Lobby response", response);
    if (!response.payload.lobbyId) {
      console.warn("No lobbyId in payload.");
      response.payload.lobbyId = payload.lobbyId;
    }
    response.relayId = this.id;
    if (response) {
      console.log("Sending lobby response to player:", playerId);
      this.sendResponse(playerId, response);
      if (response.broadcast) {
        console.log("Broadcasting lobby response to all players.");
        this.broadcastResponse(response);
      }
    }
  }
}

module.exports = LobbyRelay;
