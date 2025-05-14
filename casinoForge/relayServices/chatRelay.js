const Relay = require("./relay");

class ChatRelay extends Relay {
  constructor({ id, ports, host }) {
    super({ type: "chat", id, ports, host });
  }

  async processMessage(ws, message) {
    const playerId = message?.payload?.playerId;
    const action = message?.payload?.action;

    // Track player socket
    if (playerId && !this.webSocketMap.has(playerId)) {
      this.webSocketMap.set(playerId, ws);
    }

    if (message?.payload?.type !== "chat") return;

    if (action === "join") {
      console.log(`🛠 ChatRelay: ${playerId} joined chat`);
      this.chatMap.set(playerId, ws);

      this.broadcastResponse({
        payload: {
          type: "chat",
          playerId: "system",
          text: `${playerId.slice(0, 6)} joined chat.`,
        },
      });
      return;
    }

    if (action === "leave") {
      console.log(`🚪 ChatRelay: ${playerId} left chat`);
      this.chatMap.delete(playerId);
      this.broadcastResponse({
        payload: {
          type: "chat",
          playerId: "system",
          text: `${playerId.slice(0, 6)} left chat.`,
        },
      });
      return;
    }

    console.log("💬 Chat message:", message);
    this.broadcastResponse(message);
  }
}

module.exports = ChatRelay;
