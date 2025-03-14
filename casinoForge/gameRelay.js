const Relay = require("./relay");
//const WebSocket = require("ws");

class GameRelay extends Relay {
  constructor(gameId, players = [], ports, gamesController) {
    console.log("Initializing GameRelay...");
    super("game", gameId, ports[0]);
    this.gamesController = gamesController;
    this.ports = ports;
    this.gameId = gameId;
    this.players = players;

    players.forEach((playerId) => this.webSocketMap.set(playerId, null));
    //console ever 5 seconds if running
    this.interval = setInterval(() => {
      console.log("GameRelay is running...");
      console.log("Active games", this.gamesController.activeGames);
      console.log("WebSocket Map", this.webSocketMap);
    }, 30000);
  }

  handleConnection(ws) {
    console.log("🔌 GameRelay: New WebSocket connection established");

    // Generate a temporary player ID if needed (optional, depends on your flow)
    const tempPlayerId = `temp-${Date.now()}-${Math.random()}`;

    // 🔥 Store WebSocket immediately, even if no message is received yet
    this.webSocketMap.set(tempPlayerId, ws);
    console.log(`📌 Temporary WebSocket stored for ${tempPlayerId}`);

    ws.on("message", (message) => {
      console.log("📨 GameRelay Received Message");
      console.log("Message:", message);
      try {
        if (Buffer.isBuffer(message)) {
          message = message.toString("utf-8");
        }
        const parsedMessage = JSON.parse(message);
        console.log("🎮 GameRelay Message:", parsedMessage);

        const gameId = parsedMessage.payload?.gameId;
        const game = this.gamesController.activeGames.get(gameId);
        if (!game) {
          console.warn("⚠️ Game not found.");
          this.sendError(ws, "Game not found.");
          return;
        }

        const playerId = parsedMessage.payload?.playerId;
        if (playerId) {
          // 🔄 Replace the temporary WebSocket mapping with the real player ID
          this.webSocketMap.delete(tempPlayerId);
          this.webSocketMap.set(playerId, ws);
          console.log(`✅ WebSocket mapped to real player ID: ${playerId}`);
        }

        // ✅ Let subclass handle the message
        console.log("gameRelay processing message...");
        this.processMessage(ws, parsedMessage);
      } catch (error) {
        console.error("❌ GameRelay Error processing message:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            payload: { message: "GameRelay side Error." },
          })
        );
      }
    });

    ws.on("close", () => {
      console.log("🔌 GameRelay: Player disconnected");

      let found = false;
      for (const [playerId, socket] of this.webSocketMap.entries()) {
        if (socket === ws) {
          this.webSocketMap.delete(playerId);
          found = true;
          console.log(`🛑 Removed WebSocket reference for player ${playerId}`);
        }
      }

      if (!found) {
        console.warn(
          "⚠️ Player WebSocket reference not found in map. Possible issue with storing connection."
        );
      }

      // if (this.webSocketMap.size === 0) {
      //   console.log("🛑 All players disconnected. Shutting down GameRelay");
      //   this.shutdown();
      // }
    });
  }

  processMessage(ws, message) {
    const { type, action, payload } = message;
    if (type !== "game") {
      console.warn("Message sent to game not of type game:", type);
      this.sendError(ws, "Game received message of wrong type.");
      return;
    }

    console.log("Processing game message:", { action, payload });

    // ✅ Ensure game exists
    console.log("Active games", this.gamesController.activeGames);
    const game = this.gamesController.activeGames.get(payload.gameId);
    if (!game) {
      console.warn(`⚠️ Game ${payload.gameId} not found.`);
      this.sendError(ws, `Game ${payload.gameId} not found.`);
      return;
    }

    if (action === "endGame") {
      console.log(`🛑 Ending game ${payload.gameId}...`);
      this.gamesController.endGame(payload.gameId);

      // ✅ Broadcast game ended message
      this.broadcastResponse({
        type: "game",
        action: "gameEnded",
        payload: {
          gameId: payload.gameId,
          status: "ended",
          gameLog: game.gameLog, // Include game history
        },
        broadcast: true,
      });

      // ✅ Cleanup the relay
      this.shutdown();
      return;
    }

    // ✅ Store WebSocket reference for the player sending the message
    if (payload.playerId) {
      this.webSocketMap.set(payload.playerId, ws);
      console.log(`🔄 Updated WebSocket for player ${payload.playerId}`);
    }

    let response = this.gamesController.processMessage({ action, payload });
    console.log("Game response", response);

    if (response) {
      this.sendToPlayer(payload.playerId, response);
      if (response.broadcast) {
        this.broadcastResponse(response);
      }
    }
  }

  broadcastResponse(response) {
    for (const ws of this.webSocketMap.values()) {
      console.log("Broadcasting to:", ws);
      console.log("response", response);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(response));
      }
    }
  }

  shutdown() {
    console.log(`🛑 Shutting down GameRelay for ${this.gameId}...`);

    // ✅ Clear all WebSocket connections
    for (const [playerId, ws] of this.webSocketMap.entries()) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
        console.log(`🔴 Closed WebSocket for player ${playerId}`);
      }
    }
    this.webSocketMap.clear();

    // ✅ Stop the interval
    if (this.interval) {
      clearInterval(this.interval);
      console.log("🛑 Cleared running GameRelay interval.");
    }

    // ✅ Close the WebSocket server
    if (this.wss) {
      this.wss.close(() => {
        console.log(`✅ GameRelay WebSocket server for ${this.gameId} closed.`);
      });
    } else {
      console.warn("⚠️ WebSocket server instance (wss) not found!");
    }
  }
}

module.exports = GameRelay;
