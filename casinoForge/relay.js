const { Server } = require("ws");
const { v4: uuidv4 } = require("uuid");

class Relay {
  constructor({ type, id, ports, host = "localhost" }) {
    console.log(`🚀 Initializing ${type} Relay (ID: ${id}, Ports: ${ports})`);
    this.type = type;
    this.id = id; // Unique relay ID
    this.ports = ports;
    this.host = host;
    this.webSocketMap = new Map(); // Track WebSocket connections
    this.wss = null; // WebSocket server instance
    this.wsAddress = null; // WebSocket address
    this.messages = []; // Store messages for later use
    // this.sharedServer = sharedServer;

    //this.consoleTest(Date.now(), 15000); // Broadcast every 5 seconds
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

  async init(sharedWss = null) {
    console.log(
      `🔗 Initializing ${this.type} Relay ${this.id}...Sharedwss ${sharedWss}`
    );

    console.log(
      `🔗 Initializing ${this.type} Relay ${this.id}...Sharedwss`,
      sharedWss
    );

    if (sharedWss) {
      this.wss = sharedWss;
      this.wsAddress = `ws://${this.host}:${process.env.PORT || this.ports[0]}`;

      // 🛑 Only attach handlers once!
      if (!this.wss._relayHandlerAttached) {
        this.setupWebSocketHandlers();
        this.wss._relayHandlerAttached = true;
      } else {
        console.log(
          `🟡 Skipping handler attach for ${this.id} (already attached)`
        );
      }

      return true;
    }
    // 🚨 Defensive guard in case we somehow get here again
    if (this.wss) {
      console.warn(`🟡 Relay ${this.id} already initialized, skipping init.`);
      return true;
    }

    // 🔁 Local mode fallback
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
              console.warn(`⚠️ Port ${port} in use, trying next...`);
              resolve(); // try next port
            } else {
              console.error(`❌ Error on port ${port}:`, error.message);
              reject(error);
            }
          });

          server.on("close", () => {
            console.log(`🛑 Server on port ${port} closed.`);
          });
        });

        if (initialized) break;
      } catch (err) {
        console.error(`❌ Failed to init Relay ${this.id} on port ${port}`);
      }
    }

    if (!initialized) {
      console.error(`❌ All ports failed for Relay ${this.id}`, this.ports);
    }

    return initialized;
  }

  // async init(sharedWss = null) {
  //   console.log(
  //     `🔗 Initializing ${this.type} Relay ${this.id}...Sharedwss ${sharedWss}`
  //   );
  //   if (sharedWss) {
  //     // ✅ Heroku mode: Use shared WebSocket server
  //     this.wss = sharedWss;
  //     this.wsAddress = `ws://${this.host}:${process.env.PORT}`;
  //     console.log(`✅ [Shared] Relay ${this.id} using ${this.wsAddress}`);
  //     this.setupWebSocketHandlers();
  //     return true;
  //   }

  //   // 🔁 Local mode: Try each port until one works
  //   let initialized = false;

  //   for (const port of this.ports) {
  //     try {
  //       await new Promise((resolve, reject) => {
  //         const server = new Server({ port });

  //         server.on("listening", () => {
  //           this.wss = server;
  //           this.wsAddress = `ws://${this.host}:${port}`;
  //           console.log(`✅ Relay ${this.id} running on ${this.wsAddress}`);
  //           this.setupWebSocketHandlers();
  //           initialized = true;
  //           resolve();
  //         });

  //         server.on("error", (error) => {
  //           if (error.code === "EADDRINUSE") {
  //             console.warn(`⚠️ Port ${port} in use, trying next...`);
  //             resolve(); // try next port
  //           } else {
  //             console.error(`❌ Error on port ${port}:`, error.message);
  //             reject(error);
  //           }
  //         });

  //         server.on("close", () => {
  //           console.log(`🛑 Server on port ${port} closed.`);
  //         });
  //       });

  //       if (initialized) break;
  //     } catch (err) {
  //       console.error(`❌ Failed to init Relay ${this.id} on port ${port}`);
  //     }
  //   }

  //   if (!initialized) {
  //     console.error(`❌ All ports failed for Relay ${this.id}`, this.ports);
  //   }

  //   return initialized;
  // }

  // async init() {
  //   let initialized = false;

  //   for (const port of this.ports) {
  //     try {
  //       await new Promise((resolve, reject) => {
  //         const server = new Server({ port });
  //         server.on("listening", () => {
  //           this.wss = server;
  //           this.wsAddress = `ws://${this.host}:${port}`;
  //           console.log(`✅ Relay ${this.id} running on ${this.wsAddress}`);
  //           this.setupWebSocketHandlers();
  //           initialized = true;
  //           resolve();
  //         });

  //         server.on("error", (error) => {
  //           if (error.code === "EADDRINUSE") {
  //             console.warn(`⚠️ Port ${port} is already in use, trying next...`);
  //             resolve(); // Continue trying other ports
  //           } else {
  //             console.error(
  //               `❌ Unexpected error on port ${port}:`,
  //               error.message
  //             );
  //             reject(error);
  //           }
  //         });

  //         server.on("close", () => {
  //           console.log(`🛑 Server on port ${port} closed.`);
  //         });
  //       });

  //       if (initialized) {
  //         break;
  //       }
  //     } catch (error) {
  //       console.error(
  //         `❌ Error initializing Relay ${this.id} on port ${port}:`,
  //         error.message
  //       );
  //     }
  //   }

  //   if (!initialized) {
  //     console.error(
  //       `❌ All specified ports failed for Relay ${this.id}. Ports: ${this.ports}`
  //     );
  //   }

  //   return initialized;
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
        console.log("Parsed message", parsedMessage);
        this.messages.push(parsedMessage); // Store the message for later use
        if (parsedMessage?.payload?.type === "ping") {
          console.log(`${this.relayId} received ping from client:`, message);
          ws.send(
            JSON.stringify({
              relayId: this.relayId,
              uuid: message.uuid,
              payload: {
                type: "pong",
                action: "pong",
                message: "Ping received",
              },
            })
          );
          return;
        }
        console.log(`${this.id} relay messages`, this.messages);
        if (parsedMessage?.uuid) {
          console.log(`🔗 Message UUID: ${parsedMessage.uuid}`);
        }
        this.processMessage(ws, parsedMessage);
      } catch (error) {
        console.error(
          `❌ Error processing message in ${this.type} Relay:`,
          error
        );
      }
    });

    ws.on("close", () => {
      console.log(`🔌 ${this.type} Relay: websocket disconnected.`);
      this.removeSocket(ws);
    });
  }

  /** 📩 Process Incoming Messages */
  processMessage(ws, message) {
    console.warn(`⚠️ ${this.type} Relay class not extended.`);
    console.log("Message:", message);
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
