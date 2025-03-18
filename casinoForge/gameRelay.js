const Relay = require("./relay");
const { v4: uuidv4 } = require("uuid");
const RelayConnector = require("./relayConnector");

class GameRelay extends Relay {
  constructor(gameId, ports, gamesController, targetUrl = null) {
    console.log("Initializing GameRelay...");
    super("game", gameId, ports[0]);
    this.gamesController = gamesController;
    this.ports = ports;
    this.gameId = gameId;
    this.players = [];

    // players.forEach((playerId) => this.webSocketMap.set(playerId, null));
    //console ever 5 seconds if running
    // this.interval = setInterval(() => {
    //   console.log("GameRelay is running...");
    //   console.log("Active games", this.gamesController.activeGames);
    //   console.log("WebSocket Map", this.webSocketMap);
    // }, 30000);

    if (targetUrl) {
      this.relayConnector = new RelayConnector(
        targetUrl
        //  (message) => this.broadcastResponse(message) // ✅ Forward messages to connected clients
      );
    }
  }

  processMessage(ws, message) {
    console.log("🎮 GameRelay Processing Message:", message);
    const { payload } = message;
    const gameId = payload?.gameId;
    const game = this.gamesController.activeGames.get(gameId);
    if (!game) {
      console.warn("⚠️ Game not found.");
      return;
    }

    const playerId = payload?.playerId;
    if (playerId) {
      this.webSocketMap.set(playerId, ws);
      console.log(`✅ WebSocket mapped to real player ID: ${playerId}`);
    }
    try {
      this.gamesController.processMessage(ws, message);
    } catch (error) {
      console.error("❌ GameRelay Error processing message:", error);
    }
  }

  // handleConnection(ws) {
  //   console.log("🔌 GameRelay: New WebSocket connection established");
  //   const tempPlayerId = `temp-${Date.now()}-${Math.random()}`;
  //   this.webSocketMap.set(tempPlayerId, ws);
  //   console.log(`📌 Temporary WebSocket stored for ${tempPlayerId}`);
  //   ws.on("message", (message) => {
  //     console.log("📨 GameRelay Received Message", message);
  //     try {
  //       if (Buffer.isBuffer(message)) {
  //         message = message.toString("utf-8");
  //       }
  //       const parsedMessage = JSON.parse(message);
  //       console.log("🎮 GameRelay Message:", parsedMessage);

  //       const gameId = parsedMessage.payload?.gameId;
  //       const game = this.gamesController.activeGames.get(gameId);
  //       if (!game) {
  //         console.warn("⚠️ Game not found.");
  //         this.sendError(ws, "Game not found.");
  //         return;
  //       }

  //       const playerId = parsedMessage.payload?.playerId;
  //       if (playerId) {
  //         this.webSocketMap.set(playerId, ws);
  //         console.log(`✅ WebSocket mapped to real player ID: ${playerId}`);
  //       }
  //       this.gamesController.processMessage(ws, parsedMessage);
  //     } catch (error) {
  //       console.error("❌ GameRelay Error processing message:", error);
  //       ws.send(
  //         JSON.stringify({
  //           type: "error",
  //           payload: { message: "GameRelay Error." },
  //         })
  //       );
  //     }
  //   });

  //   ws.on("close", () => {
  //     console.log("🔌 GameRelay: Player disconnected");

  //     let found = false;
  //     for (const [playerId, socket] of this.webSocketMap.entries()) {
  //       if (socket === ws) {
  //         this.webSocketMap.delete(playerId);
  //         found = true;
  //         console.log(`🛑 Removed WebSocket reference for player ${playerId}`);
  //       }
  //     }

  //     if (!found) {
  //       console.warn(
  //         "⚠️ Player WebSocket reference not found in map. Possible issue with storing connection."
  //       );
  //     }
  //   });
  // }

  // broadcastResponse(response) {
  //   console.log(`📡 GameRelay Broadcasting from gameId: ${this.gameId}`);

  //   // Log the entire WebSocket map
  //   console.log(
  //     "🛠️ WebSocket Map Contents:",
  //     Array.from(this.webSocketMap.entries())
  //   );

  //   console.log("response", response);
  //   //add a uuid to the response
  //   response.uuid = uuidv4();

  //   for (const [playerId, ws] of this.webSocketMap.entries()) {
  //     console.log(`🔹 Sending to Player: ${playerId}, WebSocket:`, ws);

  //     if (!ws) {
  //       console.warn(`⚠️ WebSocket for player ${playerId} is null.`);
  //       continue;
  //     }

  //     if (ws.readyState !== WebSocket.OPEN) {
  //       console.warn(`⚠️ WebSocket for player ${playerId} is not open.`);
  //       continue;
  //     }

  //     ws.send(JSON.stringify(response));
  //   }
  // }
}

module.exports = GameRelay;
