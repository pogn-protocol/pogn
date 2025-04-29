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
      const isProd = process.env.ENV === "production";
      const protocol = isProd ? "wss" : "ws";
      const host = this.host;
      const port = isProd ? "" : `:${this.ports[0] || 3000}`; // ← Only include port locally

      this.wsAddress = `${protocol}://${host}${port}`;
      console.log(`✅ [Shared] Relay ${this.id} using ${this.wsAddress}`);

      return true;
    }
    if (this.wss) {
      console.warn(`🟡 Relay ${this.id} already initialized, skipping init.`);
      return true;
    }
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

  handleServerError(error) {
    console.error(`❌ ${this.type} Relay Server Error:`, error);
  }

  setupWebSocketHandlers() {
    this.wss.on("connection", (ws) => {
      console.log(`🔌 New connection to ${this.type} Relay id ${this.id}`);
      this.handleConnection(ws);
    });
  }

  handleConnection(ws) {
    console.log(`🔌 ${this.type} Relay: WebSocket connected ws: ${ws}`);
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    this.webSocketMap.set(tempId, ws);

    console.log(`📌 Temporary WebSocket stored for ${tempId}`);

    ws.on("message", (message) => {
      console.log(
        `🔗 ${this.type} relay Id ${this.id} recieved message: ${message}`
      );
      this.handleMessage(ws, message, tempId);
    });

    ws.on("close", () => {
      console.log(`🔌 ${this.type} Relay: websocket disconnected.`);
      this.removeSocket(ws);
    });
  }

  handleMessage(ws, message) {
    console.log("ws", ws);
    console.log(
      `🔗 handleMessage ${this.type} relay Id ${this.id} recieved message: ${message}`
    );

    try {
      if (Buffer.isBuffer(message)) {
        message = message.toString("utf-8");
      }
      const parsedMessage = JSON.parse(message);
      console.log("Parsed message", parsedMessage);
      this.messages.push(parsedMessage);
      if (
        Array.isArray(parsedMessage) &&
        parsedMessage[0] === "EVENT" &&
        parsedMessage[1]
      ) {
        const event = parsedMessage[1];
        console.log("📥 Nostr Event Received:", event);

        if (
          event.kind === 1 &&
          event.tags?.some(
            ([tag, value]) => tag === "t" && value === "pogn/playerId"
          )
        ) {
          console.log("🎯 Got playerId update via Nostr relay:", event.content);
        }

        return;
      }
      if (parsedMessage?.payload?.type === "ping") {
        console.log(`${this.relayId} received ping from client:`, message);
        //get id from ws
        const pingerId = [...this.webSocketMap.keys()].find(
          (key) => this.webSocketMap.get(key) === ws
        );
        // const   relayId = parsedMessage?.relayId;
        console.log(`🔗 Sending pong to ${pingerId}`);
        // ws.send(
        //   JSON.stringify({
        //     relayId: this.relayId,
        //     uuid: parsedMessage.uuid,
        //     payload: {
        //       type: "pong",
        //       action: "pong",
        //       message: "Ping received",
        //     },
        //   })
        // );
        let pongMessage = {
          relayId: this.relayId,
          uuid: uuidv4(),
          payload: {
            senderId: pingerId,
            type: "pong",
            action: "pong",
            message: "Ping received",
          },
        };
        console.log("pongMessage", pongMessage);
        console.log("ws", ws);
        ws.send(JSON.stringify(pongMessage));
        //this.sendResponse(relayId, pongMessage);

        // this.sendResponse(ws, pongMessage);
        return;

        // this.sendResponse(id, {
        //   relayId: this.relayId,
        //   uuid: message.uuid,
        //   payload: {
        //     type: "pong",
        //     action: "pong",
        //     message: "Ping received",
        //   },
        // });
        // return;
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
  }

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

    if (!found) {
      console.warn("⚠️ Socket to remove not found in webSocketMap");
    }
  }

  broadcastResponse(response) {
    console.log(`📡 Broadcasting from ${this.type} Relay ID: ${this.id}`);
    response.uuid = uuidv4();
    console.log("Response:", response);

    for (const [id, ws] of this.webSocketMap.entries()) {
      if (ws.readyState === ws.OPEN) {
        console.log(`📡 Broadcasting to ${id}`);
        ws.send(JSON.stringify(response));
      } else {
        console.warn(`⚠️ WebSocket not open for ${id}`);
      }
    }
  }

  sendResponse(idOrWs, message) {
    let ws = null;
    let id = null;

    if (typeof idOrWs === "string") {
      id = idOrWs;
      ws = this.webSocketMap.get(id);
    } else {
      ws = idOrWs;
      // Inline reverse lookup without a helper
      for (const [storedId, socket] of this.webSocketMap.entries()) {
        if (socket === ws) {
          id = storedId;
          break;
        }
      }
    }

    if (!ws || ws.readyState !== ws.OPEN) {
      console.warn(`⚠️ WebSocket not found or not open for ${id ?? "unknown"}`);
      return;
    }

    console.log(`📡 ${this.type} Relay sending to ${id ?? "unknown"}:`);
    console.log("Message:", message);

    ws.send(JSON.stringify(message));
  }

  // sendResponse(idOrWs, message) {
  //   let ws = null;

  //   if (typeof idOrWs === "string") {
  //     ws = this.webSocketMap.get(idOrWs);
  //   } else {
  //     ws = idOrWs; // Assume it's already a WebSocket
  //     idOrWs = this.findIdBySocket(ws);
  //   }

  //   if (!ws || ws.readyState !== ws.OPEN) {
  //     console.warn(`⚠️ WebSocket not found or not open for ${idOrWs}`);
  //     return;
  //   }

  //   console.log(`📡 ${this.type} Relay sending to ${idOrWs}:`);
  //   console.log("Message:", message);

  //   ws.send(JSON.stringify(message));
  // }

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
