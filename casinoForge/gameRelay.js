const Relay = require("./relay");
const { v4: uuidv4 } = require("uuid");
const RelayConnector = require("./relayConnector");
const { verifyGameRelayMessageRecieved } = require("./verifications");

class GameRelay extends Relay {
  constructor({ id, ports, gameController, lobbyId, host }) {
    console.log("Initializing GameRelay...", id, ports);
    //  constructor({type, id, ports, host = "localhost"}) {
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

  processMessage(ws, message) {
    if (
      message?.payload?.playerId &&
      !this.webSocketMap.has(message.payload.playerId)
    ) {
      console.log(
        `🔄 Updating WebSocket map with playerId ${message.payload.playerId}`
      );
      this.webSocketMap.set(message.payload.playerId, ws);

      // Optional: clean up temp IDs
      for (const [key, socket] of this.webSocketMap.entries()) {
        if (socket === ws && key.startsWith("temp-")) {
          this.webSocketMap.delete(key);
          console.log(`🧹 Removed temp socket key ${key}`);
        }
      }
    }

    let error = null;
    if (message?.payload?.type === "relayConnector") {
      console.log("GameRelay processing relayConnector message:", message);
      this.webSocketMap.set(message?.payload?.relayId, ws);
      this.relayConnections.push(message?.payload?.relayId);
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
      console.warn(
        `Game relay ${this.relayId} received message for different relay:`,
        message.relayId
      );

      if (this.relayConnections.some((id) => id === message?.relayId)) {
        console.warn(
          `${this.relayId} processing message from relayConnection: ${message.relayId}`,
          message
        );
        return;
      }
      // response.error = `Game relay ${this.relayId} received message for different relay:`;
    }

    const { isValid, error: validationError } =
      require("./verifications").verifyGameRelayMessageRecieved(
        message,
        this.relayId,
        this.gameIds
      );

    if (!isValid) {
      console.warn(`❌ Verification failed: ${validationError}`);
      const errorResponse = {
        type: "error",
        payload: { message: validationError },
        relayId: this.relayId,
        uuid: uuidv4(),
      };
      this.sendResponse(
        message?.payload?.playerId || message?.relayId,
        errorResponse
      );
      return;
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
      const privateResponse = structuredClone(response);
      console.log("response shallow copy:", privateResponse);
      delete response.payload.private;

      //remove private from response
      if (response?.broadcast) {
        this.broadcastResponse(response);
      } else {
        this.sendResponse(response?.payload?.playerId, response);
      }
      if (privateResponse.payload?.private) {
        //deepcopy
        console.log("GameRelay private response:", privateResponse);
        this.sendResponse(privateResponse.payload?.playerId, privateResponse);
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
