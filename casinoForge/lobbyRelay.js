const Relay = require("./relay");

class LobbyRelay extends Relay {
  constructor(lobbyId, lobbyController) {
    super("lobby", lobbyId, 8080);
    this.lobbyController = lobbyController;
    this.webSocketMap = new Map(); // ✅ Ensure WebSocket Map exists

    this.interval = setInterval(() => {
      console.log("lobbyRelay is running...");
      console.log("lobbyPlayers", this.lobbyController.players);
      console.log("WebSocket Map", this.webSocketMap);
    }, 30000);
  }

  processMessage(ws, message) {
    // ✅ Extract type, action and payload from message
    const { type, action, payload } = message;
    if (type !== "lobby") {
      console.warn("Message sent to lobby not of type lobby:", type);
      this.sendError(ws, "Lobby received message of wrong type.");
      return; // ✅ Return early
    }
    console.log("Processing lobby message:", { action, payload });

    if (!payload?.playerId) {
      console.warn("No playerId in payload.");
      this.sendError(ws, "No playerId in payload.");
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

    this.webSocketMap.set(playerId, ws);
    console.log(`Player ${playerId} added to WebSocket map.`);

    let response =
      action === "login"
        ? this.lobbyController.test(playerId)
        : this.lobbyController.processMessage(action, payload);
    console.log("Lobby response", response);
    if (response) {
      this.sendToPlayer(playerId, response);
      if (response.broadcast) {
        this.broadcastResponse(response);
      }
    }
  }

  /**
   * ✅ Ensure broadcastResponse is available in LobbyRelay
   */
  broadcastResponse(response) {
    for (const ws of this.webSocketMap.values()) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(response));
      }
    }
  }

  /**
   * ✅ Add sendError in case it's missing in Relay
   */
  sendError(ws, message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "error", payload: { message } }));
    }
  }
}

module.exports = LobbyRelay;
