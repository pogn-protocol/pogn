const WebSocket = require("ws");
global.WebSocket = WebSocket;
const LobbyRelay = require("./lobbyRelay");
const GameRelay = require("./gameRelay");
const RelayConnector = require("./relayConnector");

class RelayManager {
  constructor() {
    this.relays = new Map(); // ✅ Store all relays (lobby & game)
    this.gamePorts = [9000]; // ✅ Define game ports
    this.lobbyPorts = [8080]; // ✅ Define lobby ports
  }

  /** 🔗 Create relay dynamically based on type */
  createRelay(type, id, options = {}) {
    console.log(`🔗 Creating ${type} Relay ${id} with options`, options);
    if (this.relays.has(id)) {
      console.warn(`⚠️ Relay ${id} already exists.`);
      return this.relays.get(id);
    }

    let relay;
    switch (type) {
      case "lobby":
        relay = new LobbyRelay(
          id,
          options.ports || this.lobbyPorts,
          options.controller
        );
        console.log(`🔥 Created LobbyRelay for ${id}`);
        break;

      case "game":
        console.log(this.gamePorts);
        relay = new GameRelay(
          id,
          options.ports || this.gamePorts,
          options.controller,
          options.lobbyId
        );
        console.log(`🔥 Created GameRelay for ${id}`);
        if (options.lobbyId) {
          const lobbyRelay = this.relays.get(options.lobbyId);
          console.log("lobbyRelay", lobbyRelay);
          if (lobbyRelay) {
            console.log(
              `🔗 Linking GameRelay ${id} with LobbyRelay ${options.lobbyId}`
            );
            // lobbyRelay.connectToGameRelay(id, relay.wsAddress);
            relay.lobbyWs = lobbyRelay.ws;
            relay.lobbyId = options.lobbyId;

            lobbyRelay.relayConnections.set(
              relay.id,
              new RelayConnector(
                lobbyRelay.id,
                relay.id,
                relay.wsAddress,
                (message) => {
                  console.log(
                    `📩 lobby relayConnector Recieved Message from GameRelay ${relay.id}:`,
                    message
                  );
                  const relayConnector = lobbyRelay.relayConnections.get(
                    relay.id
                  );
                  let ws = relayConnector?.relaySocket;
                  if (ws) {
                    lobbyRelay.processMessage(ws, message);
                  } else {
                    console.warn(
                      `⚠️ No relayConnector found for GameRelay ${relay.id}.`
                    );
                  }
                },
                () => {
                  console.log(
                    `✅ LobbyRelay ${options.lobbyId} connected to GameRelay ${relay.id}`
                  );
                }
              )
            );
          } else {
            console.warn(`⚠️ No LobbyRelay found for ID ${options.lobbyId}.`);
          }
        }
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
