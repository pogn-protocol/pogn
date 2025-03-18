const Relay = require("./relay");
const RelayConnector = require("./relayConnector");

class LobbyRelay extends Relay {
  constructor(lobbyId, ports, lobbyController, targetUrl = null) {
    super("lobby", lobbyId, ports[0]); // Pass targetUrl for potential relay connections
    this.lobbyController = lobbyController;

    if (targetUrl) {
      this.relayConnector = new RelayConnector(
        targetUrl
        //  (message) => this.broadcastResponse(message) // ✅ Forward messages to connected clients
      );
    }
  }

  processMessage(ws, message) {
    // ✅ Extract type, action and payload from message
    const { type, action, payload } = message;
    if (type === "hello") {
      this.relayConnector.sendMessage({
        type: "hello",
        payload: { message: "Hello back from lobby relay" },
      });
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

    this.webSocketMap.set(playerId, ws);
    console.log(`Player ${playerId} added to WebSocket map.`);

    let response =
      action === "login"
        ? this.lobbyController.test(playerId)
        : this.lobbyController.processMessage(message);
    console.log("Lobby response", response);
    if (response) {
      this.sendResponse(playerId, response);
      if (response.broadcast) {
        this.broadcastResponse(response);
      }
    }
  }
}

module.exports = LobbyRelay;
