class Relay {
  constructor(type, id, port) {
    console.log("WebSocket global check:", typeof WebSocket);

    console.log("Initializing Relay...");
    // 🔥 Fixed: port should be singular, not 'ports'
    this.type = type;
    this.id = id;
    this.port = port; // 🔥 Store port as a class property
    this.webSocketMap = new Map();

    this.interval = setInterval(() => {
      console.log(this.type, "Relay is running...");
      //console.log("Active games", this.gamesController.activeGames);
      console.log("WebSocket Map", this.webSocketMap);
    }, 10000);

    // this.wss = new WebSocket.Server({ port: this.port }, () => {
    //   // 🔥 Use this.port
    //   console.log(
    //     `✅ ${this.type} Relay ${this.id} running on ws://localhost:${this.port}`
    //   );
    // });
    //  this.setupWebSocketHandlers();

    try {
      this.wss = new WebSocket.Server({ port: this.port }, () => {
        console.log(
          `✅ ${this.type} Relay ${this.id} running on ws://localhost:${this.port}`
        );
      });

      this.setupWebSocketHandlers();
    } catch (error) {
      console.error("❌ WebSocket Server Error:", error);
      //this.handleServerError(error);
    }

    // ✅ Catch errors during execution
    this.wss?.on("error", (error) => this.handleServerError(error));
  }

  handleServerError(error) {
    // if (error.code === "EADDRINUSE") {
    //   console.error(
    //     `❌ Port ${this.port} is already in use. Trying a new port...`
    //   );
    // }
    // ✅ Automatically try a new port (increments)
    // const newPort = this.port + 1;
    // console.log(`🔄 Retrying on port ${newPort}...`);
    // // ✅ Try again on a new port
    // new Relay(this.type, this.id, newPort);
    // } else {
    //   console.error("❌ WebSocket Server Error:", error);
    // }
  }

  setupWebSocketHandlers() {
    this.wss.on("connection", (ws) => {
      console.log(`🔌 New connection to ${this.type} Relay ${this.id}`);
      this.handleConnection(ws);
      console.log("connected");
    });
  }

  handleConnection(ws) {
    ws.on("message", (message) => {
      console.log(`Relay Received Message`);
      console.log("type", this.type);
      console.log("msg type", typeof message);
      console.log("Message:", message);
      try {
        if (Buffer.isBuffer(message)) {
          message = message.toString("utf-8");
        }
        console.log("type of debuffered message", typeof message);
        console.log("debuffered message", message);
        let parsedMessage;
        try {
          parsedMessage = JSON.parse(message); // ✅ Only parse if it's a valid JSON string
          //  parsedMessage = JSON.parse(parsedMessage);
        } catch (err) {
          console.error("❌ JSON Parsing Error:", err);
          // return; // 🚨 Exit to prevent further issues
        }
        // const parsedMessage = JSON.parse(message);
        console.log("type of parsed message", typeof parsedMessage);
        console.log(`📨 ${this.type} Relay Received Message:`, parsedMessage);

        // ✅ Extract playerId and store WebSocket reference
        const playerId = parsedMessage.payload?.playerId;
        if (playerId) {
          console.log(`🔄 Storing WebSocket for player ${playerId}`);
          this.webSocketMap.set(playerId, ws); // ✅ Store player connection
        }
        console.log("ws", ws);
        console.log("WebSocket Map:", this.webSocketMap);

        // ✅ Let subclass handle the message
        this.processMessage(ws, parsedMessage);
      } catch (error) {
        console.error(
          `❌ Error processing message in ${this.type} Relay:`,
          error
        );
        // ws.send(
        //   JSON.stringify({
        //     type: "error",
        //     payload: { message: "Relay side Error." },
        //   })
        // );
      }
    });

    ws.on("close", () => {
      console.log("🔌 Player disconnected");
      for (const [playerId, socket] of this.webSocketMap.entries()) {
        if (socket === ws) {
          this.webSocketMap.delete(playerId);
          console.log(`🛑 Removed WebSocket reference for player ${playerId}`);
        }
      }
    });
  }

  handleDisconnection(ws) {
    for (const [playerId, socket] of this.webSocketMap.entries()) {
      if (socket === ws) {
        this.webSocketMap.delete(playerId);
        console.log(
          `⚠️ ${this.type} Relay ${this.id}: Player ${playerId} disconnected.`
        );
        break;
      }
    }
  }

  sendToPlayer(playerId, message) {
    const ws = this.webSocketMap.get(playerId);

    if (!ws) {
      console.warn(`⚠️ WebSocket not found for player ${playerId}`);
      return;
    }

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn(`⚠️ WebSocket for player ${playerId} is not open.`);
      this.webSocketMap.delete(playerId); // Remove stale WebSocket
    }
  }

  // ✅ Abstract method: Subclasses must implement this
  processMessage(ws, action, payload) {
    console.warn(`⚠️ processMessage not implemented in ${this.type} Relay.`);
  }

  // shutDown() {
  //   console.log(`🛑 Shutting down ${this.type} Relay ${this.id}...`);
  //   this.wss.close(() => {
  //     console.log(`✅ ${this.type} Relay ${this.id} closed.`);
  //   });
  // }
}

module.exports = Relay;
