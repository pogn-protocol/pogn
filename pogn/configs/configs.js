const { v4: uuidv4 } = require("uuid");

module.exports = {
  id: uuidv4(), // ✅ Dynamically generate a unique ID
  basePort: 8081,
  portRange: 5,
  maxPortAttempts: 5,

  // 🔗 Relay Configs
  relayManager: {
    basePort: 8081, // ✅ Add this line
    portRange: 5, // ✅ Add this line
    maxPortAttempts: 5, // ✅ Add this line
    protocol: "ws",
    enableTLS: false,
    discoveryMode: "dynamic",
    staticPeers: ["ws://localhost:8082", "ws://localhost:8083"],
  },

  // 💬 Messenger Configs
  messengerService: {
    idExchangeInterval: 5000,
    messageValidation: true,
  },

  // 🗂️ State Configs
  stateManager: {
    externalStatePath: "./testData/state.json",
    internalStateDir: "./testData/",
    autoSyncInterval: 10000,
  },

  // 💰 Money Service Configs
  moneyService: {
    currency: "USD",
    transactionLimit: 10000,
    allowNegativeBalance: false,
  },
};
