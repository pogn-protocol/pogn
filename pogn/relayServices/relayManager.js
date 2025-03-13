const Relay = require("./relay");
const WebSocket = require("ws");
const configs = require("../configs/configs");

class RelayManager {
  constructor(quankId, onConnection, state) {
    this.quankId = quankId;
    this.configs = configs.relayManager;
    this.peers = new Map();
    this.relays = [];
    this.attempts = 0;
    this.isInitialized = false;
    this.activePorts = new Set(); // ✅ Track active ports to avoid duplicate attempts
    this.state = state;

    this.initialize(onConnection);
  }

  initialize(onConnection) {
    const { basePort, maxPortAttempts } = this.configs;

    const tryPort = (port) => {
      if (this.isInitialized || this.activePorts.has(port)) return; // ✅ Prevent duplicate attempts
      this.activePorts.add(port);

      console.log(`🚀 Initializing relay on ws://localhost:${port}`);

      try {
        const relay = new Relay(
          port,
          (ws) => {
            console.log(
              `[${this.quankId}] ✅ Incoming peer connection on port ${port}`
            );
            this.peers.set(
              `${ws._socket.remoteAddress}:${ws._socket.remotePort}`,
              ws
            );
            if (onConnection) onConnection(ws);
          },
          (err) => this.handleError(err, port, onConnection)
        );

        this.relays.push(relay);
        this.port = port;

        // ✅ Only set as initialized after relay starts listening
        relay.server.on("listening", () => {
          console.log(
            `[${this.quankId}] Relay successfully listening on ws://localhost:${port}`
          );
          this.isInitialized = true;
        });
      } catch (err) {
        this.handleError(err, port, onConnection);
      }
    };

    tryPort(basePort + this.attempts);
  }

  handleError(err, port, onConnection) {
    const { basePort, maxPortAttempts } = this.configs;

    if (err.code === "EADDRINUSE") {
      console.warn(`⚠️ Port ${port} is in use. Trying next port...`);

      if (this.attempts < maxPortAttempts) {
        this.attempts++;
        const nextPort = basePort + this.attempts;
        console.log(`🔁 Attempt ${this.attempts} with port ${nextPort}`);

        setTimeout(() => this.initialize(onConnection), 100);
      } else {
        console.error(
          `[${this.quankId}] ❗ All ports from ${basePort} to ${
            basePort + maxPortAttempts
          } attempted.`
        );
      }
    } else {
      console.error(`[${this.quankId}] ❗ Unexpected relay error:`, err);
    }
  }

  discoverPeers() {
    const { discoveryMode, staticPeers, basePort, portRange } = this.configs;
    console.log(`[${this.quankId}] 🔍 Discovering peers...`);

    if (discoveryMode === "static" || discoveryMode === "hybrid") {
      staticPeers.forEach((peerUrl) => {
        console.log(`[${this.quankId}] Trying static peer: ${peerUrl}`);
        this.connectToPeer(peerUrl);
      });
    }

    if (discoveryMode === "dynamic" || discoveryMode === "hybrid") {
      for (let port = basePort; port < basePort + portRange; port++) {
        if (port !== this.port) {
          const peerUrl = `ws://localhost:${port}`;
          console.log(
            `[${this.quankId}] Attempting connection to dynamic peer: ${peerUrl}`
          );
          this.connectToPeer(peerUrl);
        }
      }
    }
  }

  connectToPeer(peerUrl) {
    if (this.peers.has(peerUrl)) {
      console.log(
        `[${this.quankId}] ⚠️ Already connected to ${peerUrl}, skipping.`
      );
      return; // ✅ Skip if already connected
    }

    const ws = new WebSocket(peerUrl);

    ws.on("open", () => {
      console.log(`[${this.quankId}] ✅ Connected to peer: ${peerUrl}`);
      this.peers.set(peerUrl, ws);
      if (this.state) {
        this.state.addToState("internal", {
          peerUrl,
          connectedAt: Date.now(),
        });
        console.log(`[${this.quankId}] 📥 Recorded peer in state: ${peerUrl}`);
      }
    });

    ws.on("message", (message) => {
      console.log(`[${this.quankId}] 📩 Message from ${peerUrl}:`, message);
    });

    ws.on("close", () => {
      this.peers.delete(peerUrl); // ✅ Clean up closed connections
    });

    ws.on("error", () => {
      this.peers.delete(peerUrl); // ✅ Clean up on error
    });
  }

  broadcast(message) {
    this.peers.forEach((ws, peerUrl) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        console.log(`[${this.quankId}] 📢 Broadcasted to ${peerUrl}:`, message);
      }
    });
  }
}

module.exports = RelayManager;
