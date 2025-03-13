const WebSocket = require("ws");

class Relay {
  constructor(port, onConnection, onError) {
    this.port = port;
    this.onError = onError;
    this.initializeServer(onConnection);
  }

  initializeServer(onConnection) {
    try {
      console.log(`🚀 Initializing relay on ws://localhost:${this.port}`);
      this.server = new WebSocket.Server({ port: this.port }, () => {
        console.log(`✅ Relay listening on ws://localhost:${this.port}`);
      });

      this.server.on("connection", (ws, req) => {
        console.log(
          `🤝 New peer connected from ${req.socket.remoteAddress}:${req.socket.remotePort}`
        );
        if (typeof onConnection === "function") {
          onConnection(ws);
        } else {
          console.error("❗ onConnection is not a function");
        }
      });

      this.server.on("error", (err) => {
        console.error(`❗ Relay error on port ${this.port}:`, err.message);
        if (typeof this.onError === "function") {
          this.onError(err, this.port);
        }
      });

      this.server.on("close", () => {
        console.warn(
          `❗ Relay server on port ${this.port} has closed unexpectedly.`
        );
      });
    } catch (err) {
      console.error(
        `❗ Error initializing relay on port ${this.port}:`,
        err.message
      );
      if (typeof this.onError === "function") {
        this.onError(err, this.port);
      }
    }
  }

  sendMessage(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn(`⚠️ Cannot send message. WebSocket is not open.`);
    }
  }

  close(callback) {
    if (this.server) {
      console.log(`🛑 Closing relay on port ${this.port}`);
      this.server.close((err) => {
        if (err) {
          console.error(`❗ Error closing server on port ${this.port}:`, err);
        } else {
          console.log(`✅ Relay successfully closed on port ${this.port}`);
        }
        if (typeof callback === "function") {
          callback();
        }
      });
    } else {
      console.warn(`⚠️ No active server to close on port ${this.port}`);
      if (typeof callback === "function") {
        callback();
      }
    }
  }
}

module.exports = Relay;
