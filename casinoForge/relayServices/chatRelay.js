const Relay = require("./relay");

class ChatRelay extends Relay {
  constructor({ id, ports, host }) {
    super({ type: "chat", id, ports, host });
  }

  async processMessage(ws, message) {
    const playerId = message?.payload?.playerId;
    const action = message?.payload?.action;

    // Register player socket if new
    if (playerId) {
      for (const [key, socket] of this.webSocketMap.entries()) {
        if (socket === ws && key.startsWith("temp-")) {
          this.webSocketMap.delete(key);
          this.webSocketMap.set(playerId, ws);
          console.log(`🔁 Upgraded temp socket ${key} → ${playerId}`);
          break;
        }
      }

      if (!this.webSocketMap.has(playerId)) {
        this.webSocketMap.set(playerId, ws);
      }
    }

    if (message?.payload?.type !== "chat") return;

    if (action === "join") {
      console.log(`🛠 ChatRelay: ${playerId} joined chat`);
      this.broadcastResponse({
        relayId: "chat",
        payload: {
          type: "chat",
          action: "joined",
          playerId,
          text: `${playerId.slice(0, 6)} joined chat.`,
          system: true,
        },
      });
      return;
    }

    if (action === "leave") {
      this.webSocketMap.delete(playerId); // ✅ remove on leave
      this.broadcastResponse({
        relayId: "chat",
        payload: {
          type: "chat",
          action: "left",
          playerId,
          text: `${playerId.slice(0, 6)} left chat.`,
          system: true,
        },
      });
      return;
    }

    console.log("💬 Chat message:", message);
    this.broadcastResponse(message);
  }
}

module.exports = ChatRelay;
