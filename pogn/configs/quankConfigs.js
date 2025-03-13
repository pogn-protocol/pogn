const { v4: uuidv4 } = require("uuid");

module.exports = {
  id: uuidv4(), // ✅ Dynamically generate a unique ID
  basePort: 8081, // Starting port for the relay server
  portRange: 5, // Number of ports to scan for peers
  maxPortAttempts: 5, // Max attempts to find an available port

  relayConfigs: {
    // 🔌 Relay Settings
    protocol: "ws", // Protocol to use (WebSocket)
    enableTLS: false, // Toggle TLS support (future scalability)
    discoveryMode: "dynamic", // "static", "dynamic", or "hybrid"
    staticPeers: [
      // Used only for "static" or "hybrid" discovery modes
      "ws://localhost:8082",
      "ws://localhost:8083",
    ],
    peerTimeout: 5000, // ⏱️ Timeout for peer connection attempts
  },

  stateConfigs: {
    // 🗂️ State Management Configs
    externalStatePath: "./states/state.json", // 📍 External shared state file
    internalStateDir: "./states/", // 📂 Directory for internal state files
    autoSyncInterval: 10000, // 🔄 Auto-save interval for internal state
    maxPeers: 10, // 🚦 Limit the number of known peers (prevents overload)
  },

  messengerConfigs: {
    // ✉️ Messaging Settings (New)
    idExchangeInterval: 5000, // 🔄 Frequency for sending ID exchange requests
    retryOnFail: true, // 🔁 Retry sending messages if the first attempt fails
    maxRetries: 3, // 🚨 Max retries before giving up
  },
};
