const Relay = require("./relay");
const { v4: uuidv4 } = require("uuid");
const { validateLobbyRelayMessageRecieved } = require("./validations");
const { checkLobbyRelayPermissions } = require("./permissions");

class LobbyRelay extends Relay {
  constructor({ id, ports, lobbyController, host }) {
    super({ type: "lobby", id, ports, host });
    this.lobbyController = lobbyController;
    this.relayConnections = new Map();
    this.relayId = id;
    this.gameConnections = [];
  }

  async processMessage(ws, message) {
    console.log(`${this.relayId} processing message in lobby relay:`, message);

    // Step 1: Permissions check
    try {
      const permission = checkLobbyRelayPermissions(message?.payload);
      if (permission?.error) {
        console.warn(
          `Permission denied for player ${message?.payload?.playerId}:`,
          permission.error
        );
        return this.sendResponse(ws, {
          relayId: this.relayId,
          payload: {
            type: "error",
            action: "permissionDenied",
            message: permission.error,
          },
        });
      }
    } catch (error) {
      console.error("Error checking permissions:", error);
      return;
    }

    // Step 2: relayConnector message short-circuit
    if (message?.payload?.type === "relayConnector") {
      console.log("LobbyRelay processing relayConnector message:", message);
      const incomingRelayId = message.payload.relayId;
      const oldId = [...this.webSocketMap.keys()].find(
        (key) => this.webSocketMap.get(key) === ws
      );

      if (oldId) {
        console.log(
          `🔄 Updating WebSocket ID from ${oldId} to ${incomingRelayId}`
        );
        this.webSocketMap.delete(oldId);
      }

      this.webSocketMap.set(incomingRelayId, ws);

      if (incomingRelayId !== this.relayId) {
        console.log(`📡 Linked game relay ${incomingRelayId}`);
        this.gameConnections.push(incomingRelayId);
      } else {
        console.log("🔁 Ignored self-connection.");
      }
      return;
    }

    // Step 3: test message short-circuit
    if (message?.payload?.type === "test") {
      console.log(
        `✅ Lobby relay ${this.relayId} received test message:`,
        message
      );
      return;
    }

    // Step 4: Validation
    const validation = validateLobbyRelayMessageRecieved(message);
    if (validation?.error) {
      console.warn("❌ Message failed relay validation:", validation.error);
      return this.sendResponse(ws, {
        payload: {
          type: "error",
          action: "relayValidationFailed",
          message: validation.error,
        },
      });
    }

    // Step 5: Protect from mismatched relay messages
    if (this.gameConnections.includes(message?.relayId)) {
      console.warn("⚠️ Ignoring message from connected game relay.");
      return;
    }

    if (message?.relayId && message?.relayId !== this.relayId) {
      console.warn(
        `⚠️ Relay ID mismatch: expected ${this.relayId} but got ${message.relayId}`
      );
      return;
    }

    // Step 6: Track player socket connection
    const { playerId } = message.payload;
    const oldId = [...this.webSocketMap.keys()].find(
      (key) => this.webSocketMap.get(key) === ws
    );
    if (oldId && oldId !== playerId) {
      console.log(`🛠 Replacing old socket for player ${playerId}`);
      this.webSocketMap.delete(oldId);
      const existingSocket = this.webSocketMap.get(playerId);
      if (existingSocket && existingSocket !== ws) existingSocket.close();
    }
    this.webSocketMap.set(playerId, ws);

    try {
      const response = await this.lobbyController.processMessage(
        message.payload
      );
      console.log("Lobby relay response", response);

      if (!response) return;

      response.relayId ??= this.relayId;
      response.uuid = uuidv4();
      console.log("Lobby response with uuid", response);
      console.log("Lobby response with uuid", response);
      if (response.payload?.private) {
        console.log(
          "Lobby relay sending private response to player:",
          response.payload.private
        );
        const privateResponse = JSON.parse(JSON.stringify(response));
        this.sendResponse(playerId, privateResponse);
      }
      if (response.broadcast) {
        console.log("Lobby relay broadcasting response to all players.");
        const publicResponse = JSON.parse(JSON.stringify(response));
        delete publicResponse.payload.private;
        this.broadcastResponse(publicResponse);
      }

      if (!response.broadcast && !response.payload?.private) {
        console.log("Lobby relay sending response to player:", playerId);
        this.sendResponse(playerId, response);
      }
    } catch (error) {
      console.error(
        "Lobby Relay: Error processing message in lobbyController:",
        error
      );
      return;
    }
  }
}

module.exports = LobbyRelay;
