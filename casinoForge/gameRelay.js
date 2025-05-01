const Relay = require("./relay");
const { v4: uuidv4 } = require("uuid");
const { validateGameRelayMessageRecieved } = require("./validations");
const { checkGameRelayPermissions } = require("./permissions");

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
        // Using JSON parse/stringify for deep cloning
        const privateResponse = JSON.parse(JSON.stringify(response));
        this.sendResponse(playerId, privateResponse);
      }

      // Broadcast to all connected players, after sanitizing
      if (response.broadcast) {
        console.log("GameRelay broadcasting response to all players.");
        // Using JSON parse/stringify for deep cloning
        const publicResponse = JSON.parse(JSON.stringify(response));
        delete publicResponse.payload.private;
        this.broadcastResponse(publicResponse);
      }

      // Only send to sender if it's not a broadcast or private-only
      if (!response.broadcast && !response.payload?.private) {
        console.log("GameRelay sending direct response to:", playerId);
        this.sendResponse(playerId, response);
      }
      // if (response.payload.private) {
      //   console.log("gameRelay private response to player:", playerId);
      //   const privateResponse = structuredClone(response);
      //   delete response.payload.private;
      //   this.sendResponse(privateResponse.payload.playerId, privateResponse);
      // }
      // if (!response.broadcast) {
      //   this.sendResponse(playerId, response);
      // }
      // if (response.broadcast) {
      //   this.broadcastResponse(response);
      // }
    } catch (err) {
      console.error("❌ GameRelay controller processing error:", err);
      // this.sendResponse(playerId, {
      //   relayId: this.relayId,
      //   uuid: uuidv4(),
      //   payload: {
      //     type: "error",
      //     action: "controllerFailure",
      //     message: err.message || "Unknown error",
      //   },
      // });
    }
  }

  // async processMessage(ws, message) {
  //   console.log("GameRelay processing message:", message);
  //   const permission = checkGameRelayPermissions(message);
  //   if (!permission.allowed) {
  //     console.error(`⛔ GameRelay permission denied:`, permission.reason);
  //     return this.sendResponse(message.payload.playerId, {
  //       relayId: this.relayId,
  //       payload: {
  //         type: "error",
  //         action: "permissionDenied",
  //         reason: permission.reason,
  //       },
  //       uuid: uuidv4(),
  //     });
  //   }

  //   if (
  //     message?.payload?.playerId &&
  //     !this.webSocketMap.has(message.payload.playerId)
  //   ) {
  //     console.log(
  //       `🔄 Updating WebSocket map with playerId ${message.payload.playerId}`
  //     );
  //     this.webSocketMap.set(message.payload.playerId, ws);

  //     for (const [key, socket] of this.webSocketMap.entries()) {
  //       if (socket === ws && key.startsWith("temp-")) {
  //         this.webSocketMap.delete(key);
  //         console.log(`🧹 Removed temp socket key ${key}`);
  //       }
  //     }
  //   }

  //   let error = null;
  //   if (message?.payload?.type === "relayConnector") {
  //     console.log("GameRelay processing relayConnector message:", message);
  //     this.webSocketMap.set(message?.payload?.relayId, ws);
  //     this.relayConnections.push(message?.payload?.relayId);
  //     this.sendToLobbyRelay(message?.payload?.relayId, {
  //       relayId: message?.payload?.lobbyId,
  //       payload: {
  //         type: "relayConnector",
  //         action: "gameToLobbyRelayTest",
  //         lobbyId: message?.payload?.lobbyId,
  //         relayId: this.relayId,
  //       },
  //     });
  //     return;
  //   }
  //   if (message?.payload?.type === "test") {
  //     console.log("GameRelay processing test message:", message);
  //     return;
  //   }

  //   console.log("GameRelay for games:", this.gameIds);
  //   console.log("🎮 GameRelay Processing Message:", message);

  //   if (message?.relayId !== this.relayId) {
  //     console.warn(
  //       `Game relay ${this.relayId} received message for different relay:`,
  //       message.relayId
  //     );

  //     if (this.relayConnections.some((id) => id === message?.relayId)) {
  //       console.warn(
  //         `${this.relayId} processing message from relayConnection: ${message.relayId}`,
  //         message
  //       );
  //       return;
  //     }
  //   }

  //   const { isValid, error: validationError } =
  //     validateGameRelayMessageRecieved(
  //       message,
  //       this.relayId,
  //       this.relayId,
  //       this.gameIds
  //     );
  //   console.log("GameRelay validation:", isValid, validationError);

  //   if (!isValid) {
  //     console.warn(`❌ Verification failed: ${validationError}`);
  //     const errorResponse = {
  //       type: "error",
  //       payload: { message: validationError },
  //       relayId: this.relayId,
  //       uuid: uuidv4(),
  //     };
  //     this.sendResponse(
  //       message?.payload?.playerId || message?.relayId,
  //       errorResponse
  //     );
  //     return;
  //   }

  //   try {
  //     let response;
  //     if (!error) {
  //       response = await this.gameController.processMessage(ws, message);
  //       console.log("GameRelay response", response);
  //     } else {
  //       response = {
  //         type: "error",
  //         payload: { message: error },
  //       };
  //     }
  //     response.relayId = this.relayId;
  //     response.uuid = uuidv4();
  //     console.log("Serialized GameRelay response:", response);
  //     const privateResponse = structuredClone(response);
  //     console.log("response shallow copy:", privateResponse);
  //     delete response.payload.private;

  //     if (response?.broadcast) {
  //       this.broadcastResponse(response);
  //     } else {
  //       this.sendResponse(response?.payload?.playerId, response);
  //     }
  //     if (privateResponse.payload?.private) {
  //       console.log("GameRelay private response:", privateResponse);
  //       this.sendResponse(privateResponse.payload?.playerId, privateResponse);
  //     }
  //   } catch (error) {
  //     console.error("❌ GameRelay Error processing message:", error);
  //   }
  // }

  sendToLobbyRelay(lobbyId, message) {
    console.log(`📡 Sending to LobbyId ${lobbyId}:`, message);
    this.sendResponse(lobbyId, message);
  }
}

module.exports = GameRelay;
