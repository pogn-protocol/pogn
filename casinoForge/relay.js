const { Server } = require("ws");
const { v4: uuidv4 } = require("uuid");
const RelayConnector = require("./relayConnector");

class Relay {
  constructor(type, id, port, host = "localhost") {
    console.log(`🚀 Initializing ${type} Relay (ID: ${id}, Port: ${port})`);
    this.type = type;
    this.id = id; // Unique relay ID
    this.port = port; // WebSocket port
    this.webSocketMap = new Map(); // Track  WebSocket connections
    this.wsAddress = `ws://${host}:${port}`; // WebSocket address

    try {
      this.wss = new Server({ port }, () => {
        console.log(
          `✅ ${this.type} Relay running on ws://localhost:${this.port}`
        );
      });

      this.setupWebSocketHandlers();
    } catch (error) {
      console.error(`❌ WebSocket Server Error in ${this.type} Relay:`, error);
    }

    // ✅ Handle WebSocket server errors
    this.wss?.on("error", (error) => this.handleServerError(error));
  }

  connectToRelay(id, targetUrl) {
    console.log(`🔗 Connecting  ${id} relayConnector to ${targetUrl}`);

    this.relayConnector = new RelayConnector(
      id,
      targetUrl
      //  (message) => this.broadcastResponse(message) // ✅ Forward messages to connected clients
    );
  }

  /** 🔥 Handle WebSocket Server Errors */
  handleServerError(error) {
    console.error(`❌ ${this.type} Relay Server Error:`, error);
  }

  /** 🔌 Setup Connection Handlers */
  setupWebSocketHandlers() {
    this.wss.on("connection", (ws) => {
      console.log(`🔌 New connection to ${this.type} Relay ${this.id}`);
      this.handleConnection(ws);
    });
  }

  /** 🔄 Handle  Connection */
  handleConnection(ws) {
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    this.webSocketMap.set(tempId, ws);

    console.log(`📌 Temporary WebSocket stored for ${tempId}`);

    ws.on("message", (message) => {
      console.log(`📨 ${this.type} Relay Received Message`);
      console.log("Message:", message);

      try {
        // ✅ Handle binary buffer messages
        if (Buffer.isBuffer(message)) {
          message = message.toString("utf-8");
        }
        console.log("Converting message to JSON", message);
        const parsedMessage = JSON.parse(message);
        console.log("Parsed message", parsedMessage);
        this.processMessage(ws, parsedMessage);
      } catch (error) {
        console.error(
          `❌ Error processing message in ${this.type} Relay:`,
          error
        );
        // ws.send(
        //   JSON.stringify({
        //     type: "error",
        //     payload: { message: "Invalid message format." },
        //   })
        // );
      }
    });

    ws.on("close", () => {
      console.log(`🔌 ${this.type} Relay: websocket disconnected.`);
      this.removeSocket(ws);
    });
  }

  /** 📩 Process Incoming Messages */
  processMessage(ws, message) {
    console.log(`📨 Processing ${this.type} message:`, message);
    if (message.type === "hello") {
      this.broadcastResponse(message);
    }
  }

  removeSocket(ws) {
    //there no players for this class don't use the word players use id
    let found = false;
    for (const [id, socket] of this.webSocketMap.entries()) {
      if (socket === ws) {
        this.webSocketMap.delete(id);
        found = true;
        console.log(`🛑 Removed WebSocket reference for ${id}`);
      }
    }
  }

  broadcastResponse(response) {
    console.log(`📡 Broadcasting from ${this.type} Relay ID: ${this.id}`);
    console.log("Response:", response);
    console.log("WebSocket Map:", this.webSocketMap);

    response.uuid = uuidv4(); // Assign unique identifier to messages

    for (const [id, ws] of this.webSocketMap.entries()) {
      if (ws.readyState === ws.OPEN) {
        console.log(`📡 Broadcasting to ${id}`);
        ws.send(JSON.stringify(response));
      } else {
        console.warn(`⚠️ WebSocket not open for ${id}`);
      }
    }
  }

  sendResponse(id, message) {
    const ws = this.webSocketMap.get(id);
    if (!ws || ws.readyState !== ws.OPEN) {
      console.warn(`⚠️ WebSocket not found or not open for ${id}`);
      return;
    }
    ws.send(JSON.stringify(message));
  }

  /** 🛑 Shutdown Relay */
  shutdown() {
    console.log(`🛑 Shutting down ${this.type} Relay ${this.id}...`);

    for (const ws of this.webSocketMap.values()) {
      ws.close();
    }

    this.webSocketMap.clear();

    if (this.wss) {
      this.wss.close(() => {
        console.log(
          `✅ ${this.type} Relay ${this.id} WebSocket server closed.`
        );
      });
    } else {
      console.warn("⚠️ WebSocket server instance (wss) not found!");
    }
  }
}

module.exports = Relay;
