const Relay = require("./relay");

class LobbyRelay extends Relay {
  constructor(lobbyId, ports, lobbyController, targetUrl = null) {
    super("lobby", lobbyId, ports[0]); // Pass targetUrl for potential relay connections
    this.lobbyController = lobbyController;
    this.relayConnections = new Map();
  }

  processMessage(ws, message) {
    console.log("🎰 LobbyRelay Processing Message:", message);
    //console.log("ws", ws);
    // ✅ Extract type, action and payload from message

    const { type, action, payload } = message;
    if (type === "test") {
      console.warn("Lobby relay received test message:", type);
      console.log("message", message);
      //set websocket
      const oldId = [...this.webSocketMap.keys()].find(
        (key) => this.webSocketMap.get(key) === ws
      );

      if (oldId) {
        console.log(
          `🔄 Updating WebSocket ID from ${oldId} to ${payload.gameId}`
        );
        this.webSocketMap.delete(oldId); // Remove the old ID
      }

      // Set the WebSocket with the correct gameId as the key
      this.webSocketMap.set(payload.gameId, ws);
      //console.log("WebSocket Map:", this.webSocketMap);
      return;
    }

    if (type !== "lobby") {
      console.warn("Message sent to lobby not of type lobby:", type);
      return; // ✅ Return early
    }
    console.log("Processing lobby message:", { action, payload });

    if (!payload?.playerId) {
      console.warn("No playerId in payload.");
      return; // ✅ Return early
    }

    const playerId = payload.playerId;
    const existingSocket = this.webSocketMap.get(playerId);

    if (existingSocket && existingSocket !== ws) {
      console.log(`Player ${playerId} reconnected. Replacing old WebSocket.`);
      existingSocket.send(
        JSON.stringify({
          type: "notification",
          payload: {
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

    let response =
      action === "login"
        ? this.lobbyController.testGames(playerId)
        : this.lobbyController.processMessage(message);
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
