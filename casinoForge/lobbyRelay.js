const Relay = require("./relay");
const { v4: uuidv4 } = require("uuid");
const { verifyLobbyRelayMessageRecieved } = require("./verifications");

class LobbyRelay extends Relay {
  constructor({ id, ports, lobbyController, host }) {
    //  constructor({ type, id, ports, host = "localhost" }) {
    super({ type: "lobby", id, ports, host });
    this.lobbyController = lobbyController;
    this.relayConnections = new Map();
    this.relayId = id;
    this.gameConnections = [];
  }

  async processMessage(ws, message) {
    console.log(`${this.relayId} processing message in lobby relay:`, message);

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
      // ✅ Prevent self-registration
      const incomingRelayId = message?.payload?.relayId;

      if (incomingRelayId !== this.relayId) {
        console.log(
          `Lobby relay ${this.relayId} received relayConnector message from ${incomingRelayId}`
        );
        this.gameConnections.push(incomingRelayId);
      } else {
        console.log(
          `Lobby relay ${this.relayId} received its own relayConnector message. Ignoring.`
        );
      }
      //   this.gameConnections.push(message?.payload?.relayId);
      return;
    }

    if (message?.payload?.type === "test") {
      console.log(
        `Lobby relay {$this.relayId} processing test message:`,
        message
      );
      return;
    }

    const { valid, error } = verifyLobbyRelayMessageRecieved(message);
    if (!valid) {
      console.error(error);
      return this.sendResponse(ws, { payload: { type: "error", error } });
    }

    const { payload } = message;
    const { action, lobbyId, playerId } = payload;

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
    // console.log(`🔄 Updating WebSocket ID to ${this.relayId}::${playerId}`);
    // const socketKey = `${this.relayId}::${playerId}`;
    // this.webSocketMap.set(socketKey, ws);
    // console.log(`WebSocket map updated with key: ${socketKey}`);
    let response;
    if (!error) {
      response =
        action === "login" && payload.lobbyId !== "lobby3"
          ? await this.lobbyController.testGames(payload.lobbyId)
          : await this.lobbyController.processMessage(message);
    } else {
      response = {
        type: "error",
        payload: { error },
      };
    }
    if (!response.relayId) {
      response.relayId = this.relayId;
    }
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
