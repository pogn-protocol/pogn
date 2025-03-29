const Relay = require("./relay");
const { v4: uuidv4 } = require("uuid");

class LobbyRelay extends Relay {
  constructor(relayId, ports, lobbyController, targetUrl = null) {
    super("lobby", relayId, ports);
    this.lobbyController = lobbyController;
    this.relayConnections = new Map();
    this.relayId = relayId;
    this.gameConnections = [];
  }

  async processMessage(ws, message) {
    console.log("Processing message in lobby relay:", message);
    let error = null;
    if (message?.payload?.type === "relayConnector") {
      console.log("LobbyRelay processing relayConnector message:", message);
      const oldId = [...this.webSocketMap.keys()].find(
        (key) => this.webSocketMap.get(key) === ws
      );

      if (oldId) {
        console.log(
          `🔄 Updating WebSocket ID from ${oldId} to ${message?.payload?.relayId}`
        );
        this.webSocketMap.delete(oldId); // Remove the old ID
      }

      this.webSocketMap.set(message?.payload?.relayId, ws);
      this.gameConnections.push(message?.payload?.relayId);
      return;
    }

    if (message?.payload?.type === "test") {
      console.log(
        `Lobby relay {$this.relayId} processing test message:`,
        message
      );
      return;
    }

    if (this.gameConnections.some((id) => id === message?.relayId)) {
      console.warn("Lobby relay processing message from game relay:", message);
      return;
    }

    console.log(`Processing message in lobby relay ${this.relayId}:`, message);
    if (message?.relayId !== this.relayId && message?.relayId) {
      console.log("Game connections", this.gameConnections);
      console.error(
        `Lobby relay ${this.relayId} received message for ${message.relayId} relay:`,
        message
      );
      return;
    }

    const payload = message.payload;
    if (!payload) {
      console.error("No payload in message:", message);
      error = "No payload in message";
    }
    const { type, action, lobbyId, playerId } = payload;
    if (!lobbyId) {
      console.error("No lobbyId in payload:", payload);
      error = "No lobbyId in payload";
    }
    if (!type || type !== "lobby") {
      console.error("Type not set to lobby:", type);
      error = "Type not set to lobby";
    }
    if (!action) {
      console.error("No action in payload:", payload);
      error = "No action in payload";
    }
    if (!playerId) {
      console.warn("No playerId in payload.");
      error = "No playerId in payload";
    }

    console.log("Processing lobby message:", { action, payload });
    const existingSocket = this.webSocketMap.get(playerId);

    if (existingSocket && existingSocket !== ws) {
      console.log(`Player ${playerId} reconnected. Replacing old WebSocket.`);
      // existingSocket.send(
      //   JSON.stringify({
      //     payload: {
      //       type: "lobby",
      //       action: "disconnected",
      //       playerId,
      //       lobbyId: payload.lobbyId,
      //       message: "You have been disconnected due to a new connection.",
      //     },
      //   })
      // );
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
    let response;
    if (!error) {
      response =
        action === "login"
          ? await this.lobbyController.testGames(payload.lobbyId)
          : await this.lobbyController.processMessage(message);
    } else {
      response = {
        type: "error",
        payload: { error },
      };
    }
    response.relayId = this.relayId;
    response.uuid = uuidv4(); // Assign unique identifier to messages
    console.log("Lobby response", response);

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
