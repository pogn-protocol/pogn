const Relay = require("./relay");
const relayConfig = require("../config/relayConfig");

class RelayGenerator {
  constructor() {
    this.nextPort = relayConfig.basePort;
    this.maxRelays = relayConfig.maxRelays;
    this.relayConfig = {};
  }

  // Dynamically create relays using config settings
  createRelay(relayId) {
    if (Object.keys(this.relayConfig).length >= this.maxRelays) {
      throw new Error("Max relay limit reached!");
    }

    const relayPort = this.nextPort++;
    const relay = new Relay(relayId, relayPort);
    this.relayConfig[relayId] = { id: relayId, port: relayPort };

    console.log(`Relay ${relayId} created on port ${relayPort}`);

    // ✅ Load handlers from the config file
    relayConfig.handlers.forEach(({ type, path }) => {
      const handler = require(path);
      relay.registerHandler(type, handler.processMessage);
    });

    return relay;
  }
}

module.exports = new RelayGenerator();
