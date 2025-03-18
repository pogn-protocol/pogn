const WebSocket = require("ws");
global.WebSocket = WebSocket;
const LobbyRelay = require("./lobbyRelay");
const GameRelay = require("./gameRelay");
const RelayConnector = require("./relayConnector");

class RelayManager {
  constructor() {
    this.relays = new Map(); // ✅ Store all relays (lobby & game)
  }

  /** 🔗 Create relay dynamically based on type */
  createRelay(type, id, options = {}) {
    if (this.relays.has(id)) {
      console.warn(`⚠️ Relay ${id} already exists.`);
      return this.relays.get(id);
    }

    let relay;
    switch (type) {
      case "lobby":
        relay = new LobbyRelay(id, options.ports, options.controller);
        console.log(`🔥 Created LobbyRelay for ${id}`);
        break;

      case "game":
        relay = new GameRelay(
          id,
          options.players,
          options.ports,
          options.controller
        );
        console.log(`🔥 Created GameRelay for ${id}`);
        break;

      default:
        console.error(`❌ Unknown relay type: ${type}`);
        return null;
    }

    this.relays.set(id, relay);
    console.log(`✅ ${type} Relay ${id} WebSocket started.`);
    return relay;
  }

  /** 🔗 Create and return a relay connector */
  connectRelayToWS(id, targetUrl) {
    console.log(`🔗 RelayManager connecting ${id} to ${targetUrl}`);
    if (!this.relays.has(id)) {
      console.warn(`⚠️ Relay ${id} not found.`);
      return null;
    }
    this.relays.get(id).relayConnector = new RelayConnector(targetUrl);
  }

  /** 🛑 Remove a relay */
  removeRelay(id) {
    if (this.relays.has(id)) {
      this.relays.get(id).shutdown();
      this.relays.delete(id);
      console.log(`❌ Relay ${id} removed.`);
    } else {
      console.warn(`⚠️ Relay ${id} not found.`);
    }
  }
}

module.exports = RelayManager;
