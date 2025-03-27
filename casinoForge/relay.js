const { Server } = require("ws");
const { v4: uuidv4 } = require("uuid");

class Relay {
  // constructor(type, id, port, host = "localhost") {
  //   console.log(`🚀 Initializing ${type} Relay (ID: ${id}, Port: ${port})`);
  //   this.type = type;
  //   this.id = id; // Unique relay ID
  //   this.port = port; // WebSocket port
  //   this.webSocketMap = new Map(); // Track  WebSocket connections
  //   this.wsAddress = `ws://${host}:${port}`; // WebSocket address
  //   this.wss = null; // WebSocket server instance

  //   try {
  //     this.wss = new Server({ port }, () => {
  //       console.log(
  //         `✅ ${this.type} Relay  ${this.id} running on ws://localhost:${this.port}`
  //       );
  //     });

  //     this.setupWebSocketHandlers();
  //   } catch (error) {
  //     console.error(`❌ WebSocket Server Error in ${this.type} Relay:`, error);
  //   }

  //   // ✅ Handle WebSocket server errors
  //   this.wss?.on("error", (error) => this.handleServerError(error));
  // }
  constructor(type, id, ports, host = "localhost") {
    console.log(`🚀 Initializing ${type} Relay (ID: ${id}, Ports: ${ports})`);
    this.type = type;
    this.id = id; // Unique relay ID
    this.ports = ports;
    this.host = host;
    this.webSocketMap = new Map(); // Track WebSocket connections
    this.wss = null; // WebSocket server instance
    this.wsAddress = null; // WebSocket address

    //this.initializeServer(host); // Start the WebSocket server
    // this.tryInitializeServer(host);
    //this.initialize();

    this.consoleTest(Date.now(), 15000); // Broadcast every 5 seconds
  }

  consoleTest(start, duration) {
    setInterval(() => {
      const uptime = ((Date.now() - start) / 1000).toFixed(2);
      console.log(
        `🚢 Relay ID: ${this.id} - Type: ${this.type} - Uptime: ${uptime}s -
        wsAddress: ${this.wsAddress}`
      );
    }, duration);
  }

  async init() {
    let initialized = false;

    for (const port of this.ports) {
      try {
        await new Promise((resolve, reject) => {
          const server = new Server({ port });
          server.on("listening", () => {
            this.wss = server;
            this.wsAddress = `ws://${this.host}:${port}`;
            console.log(`✅ Relay ${this.id} running on ${this.wsAddress}`);
            this.setupWebSocketHandlers();
            initialized = true;
            resolve();
          });

          server.on("error", (error) => {
            if (error.code === "EADDRINUSE") {
              console.warn(`⚠️ Port ${port} is already in use, trying next...`);
              resolve(); // Continue trying other ports
            } else {
              console.error(
                `❌ Unexpected error on port ${port}:`,
                error.message
              );
              reject(error);
            }
          });

          server.on("close", () => {
            console.log(`🛑 Server on port ${port} closed.`);
          });
        });

        if (initialized) {
          break;
        }
      } catch (error) {
        console.error(
          `❌ Error initializing Relay ${this.id} on port ${port}:`,
          error.message
        );
      }
    }

    if (!initialized) {
      console.error(
        `❌ All specified ports failed for Relay ${this.id}. Ports: ${this.ports}`
      );
    }

    return initialized;
  }

  // tryInitializeServer(host) {
  //   const tryNextPort = (ports, index) => {
  //     if (index >= ports.length) {
  //       console.error(`❌ All specified ports failed for ${this.type} Relay.`);
  //       return;
  //     }

  //     const port = ports[index];
  //     console.log(`🚀 Attempting to start server on port ${port}...`);

  //     try {
  //       const server = new Server({ port });

  //       server.on("listening", () => {
  //         this.wss = server;
  //         this.wsAddress = `ws://${host}:${port}`;
  //         console.log(
  //           `✅ ${this.type} Relay ${this.id} running on ${this.wsAddress}`
  //         );
  //         this.setupWebSocketHandlers();
  //       });

  //       server.on("error", (error) => {
  //         if (error.code === "EADDRINUSE") {
  //           console.warn(
  //             `⚠️ Port ${port} is already in use. Skipping to the next port...`
  //           );
  //           tryNextPort(ports, index + 1); // Move to the next port
  //         } else {
  //           console.error(
  //             `❌ WebSocket Server Error on port ${port}:`,
  //             error.message
  //           );
  //         }
  //       });
  //     } catch (error) {
  //       console.error(
  //         `❌ Failed to initialize server on port ${port}:`,
  //         error.message
  //       );
  //       tryNextPort(ports, index + 1); // Move to the next port
  //     }
  //   };

  //   tryNextPort(this.ports, 0);
  // }

  /** 🔥 Handle WebSocket Server Errors */
  handleServerError(error) {
    console.error(`❌ ${this.type} Relay Server Error:`, error);
  }

  /** 🔌 Setup Connection Handlers */
  setupWebSocketHandlers() {
    this.wss.on("connection", (ws) => {
      console.log(`🔌 New connection to ${this.type} Relay id ${this.id}`);
      this.handleConnection(ws);
    });
  }

  /** 🔄 Handle  Connection */
  handleConnection(ws) {
    console.log(`🔌 ${this.type} Relay: WebSocket connected ws: ${ws}`);
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    this.webSocketMap.set(tempId, ws);

    console.log(`📌 Temporary WebSocket stored for ${tempId}`);

    ws.on("message", (message) => {
      console.log("📨 Relay Received Message");
      console.log(`📨 ${this.type} Relay Received Message`);
      //console.log("Message:", message);

      try {
        // ✅ Handle binary buffer messages
        if (Buffer.isBuffer(message)) {
          message = message.toString("utf-8");
        }
        const parsedMessage = JSON.parse(message);
        if (parsedMessage?.uuid) {
          console.log(`🔗 Message UUID: ${parsedMessage.uuid}`);
        }
        console.log("Parsed message", parsedMessage);

        if (parsedMessage.type !== this.type) {
          console.warn(
            `⚠️ Message sent to ${this.type} not of type ${this.type}:`,
            parsedMessage.type
          );
          return;
        }
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
    response.uuid = uuidv4(); // Assign unique identifier to messages
    console.log("Response:", response);
    console.log("WebSocket Map:", this.webSocketMap);

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
    console.log(`📡 ${this.type} Relay sending to ${id}:`);
    console.log("Message:", message);
    // console.log("WebSocket Map:", this.webSocketMap);
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
