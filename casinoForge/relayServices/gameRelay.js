const Relay = require("./relay");
const { v4: uuidv4 } = require("uuid");
const { validateGameRelayMessageRecieved } = require("../ghUtils/validations");
const { checkGameRelayPermissions } = require("../ghUtils/permissions");

class GameRelay extends Relay {
  constructor({ id, ports, gameController, lobbyId, host }) {
    console.log("Initializing GameRelay...", id, ports);
    super({ type: "game", id, ports, host });
    this.gameController = gameController;
    this.ports = ports;
    this.relayId = id;
    this.players = [];
    this.lobbyWs = null;
    this.lobbyId = lobbyId || null;
    this.gameIds = [];
    this.relayConnections = [];
    //console ever 5 seconds if running
    // this.interval = setInterval(() => {
    //   console.log("GameRelay is running...");
    //   console.log("Active games", this.gameController.activeGames);
    //   console.log("WebSocket Map", this.webSocketMap);
    // }, 30000);
  }

  async processMessage(ws, message) {
    console.log("GameRelay processing message:", message);

    // Step 1: Permissions check
    const permission = checkGameRelayPermissions(message);
    if (permission?.error) {
      return this.sendResponse(message?.payload?.playerId, {
        relayId: this.relayId,
        uuid: uuidv4(),
        payload: {
          type: "error",
          action: "permissionDenied",
          message: permission.error,
        },
      });
    }

    // Step 2: Handle relayConnector
    if (message?.payload?.type === "relayConnector") {
      console.log("GameRelay received relayConnector message:", message);
      const relayId = message?.payload?.relayId;
      this.webSocketMap.set(relayId, ws);
      this.relayConnections.push(relayId);

      this.sendToLobbyRelay(message?.payload?.lobbyId, {
        relayId: message?.payload?.lobbyId,
        payload: {
          type: "relayConnector",
          action: "gameToLobbyRelayTest",
          lobbyId: message?.payload?.lobbyId,
          relayId: this.relayId,
        },
      });
      return;
    }

    // Step 3: Handle test messages
    if (message?.payload?.type === "test") {
      console.log("GameRelay received test message:", message);
      return;
    }

    // Step 4: Prevent cross-relay messages
    if (message?.relayId && message.relayId !== this.relayId) {
      if (this.relayConnections.includes(message.relayId)) {
        console.warn(
          `⚠️ Ignoring message from connected relay ${message.relayId}`
        );
        return;
      } else {
        console.warn(
          `❌ Relay ID mismatch: expected ${this.relayId}, got ${message.relayId}`
        );
        return;
      }
    }

    // Step 5: Set up WebSocket tracking for player
    const playerId = message?.payload?.playerId;
    if (playerId && !this.webSocketMap.has(playerId)) {
      console.log(`Tracking new playerId in WebSocketMap: ${playerId}`);
      this.webSocketMap.set(playerId, ws);

      // Remove temporary WS entry
      for (const [key, socket] of this.webSocketMap.entries()) {
        if (socket === ws && key.startsWith("temp-")) {
          this.webSocketMap.delete(key);
          console.log(`🧹 Removed temp WebSocket key: ${key}`);
        }
      }
    }

    try {
      const validation = validateGameRelayMessageRecieved(
        message?.payload,
        this.relayId,
        this.gameIds
      );
      if (validation?.error) {
        return this.sendResponse(playerId || message?.relayId, {
          relayId: this.relayId,
          uuid: uuidv4(),
          payload: {
            type: "error",
            action: "relayValidationFailed",
            message: validation.error,
          },
        });
      }
    } catch (error) {
      console.error("❌ Error validating message:", error);
      return;
    }

    // Step 7: Forward to GameController
    try {
      const response = await this.gameController.processMessage(
        message.payload
      );
      console.log("GameRelay response:", response);
      if (!response) return;

      response.relayId ??= this.relayId;
      response.uuid = uuidv4();

      if (response.payload?.private) {
        console.log(
          "GameRelay sending private response to:",
          response.payload.private
        );
        const privateResponse = JSON.parse(JSON.stringify(response));
        this.sendResponse(playerId, privateResponse);
      }

      if (response.broadcast) {
        console.log("GameRelay broadcasting response to all players.");
        const publicResponse = JSON.parse(JSON.stringify(response));
        delete publicResponse.payload.private;
        this.broadcastResponse(publicResponse);
      }

      if (!response.broadcast && !response.payload?.private) {
        console.log("GameRelay sending direct response to:", playerId);
        this.sendResponse(playerId, response);
      }
    } catch (err) {
      console.error("❌ GameRelay controller processing error:", err);
    }
  }

  sendToLobbyRelay(lobbyId, message) {
    console.log(`📡 Sending to LobbyId ${lobbyId}:`, message);
    this.sendResponse(lobbyId, message);
  }
}

module.exports = GameRelay;
