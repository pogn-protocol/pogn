const WebSocket = require("ws");
global.WebSocket = WebSocket;
const LobbyRelay = require("./lobbyRelay");
const GameRelay = require("./gameRelay");
const RelayConnector = require("./relayConnector");
const Relay = require("./relay");
const ChatRelay = require("./chatRelay");
const DisplayGameRelay = require("../displayGame/displayGameRelay");

class RelayManager {
  constructor({
    lobbyPorts = [],
    gamePorts = [],
    sharedPortMode = false,
    sharedServer = null,
    host = null,
  } = {}) {
    this.relays = new Map(); // ✅ Store all relays (lobby & game)
    // this.gamePorts = [9000]; // ✅ Define game ports
    this.lobbyPorts = lobbyPorts;
    this.gamePorts = gamePorts; // ✅ Define lobby ports
    this.sharedPortMode = sharedPortMode; // ✅ Define if shared port is used
    this.sharedServer = sharedServer; // ✅ Shared server instance
    console.log("sharedServer", sharedServer);
    console.log("sharedPortMode", sharedPortMode);
    this.host = host; // ✅ Host for WebSocket connections
  }

  async createRelays(relayConfigs = []) {
    if (!Array.isArray(relayConfigs) || relayConfigs.length === 0) {
      console.warn("⚠️ No relay configurations provided.");
      return [];
    }

    const createdRelays = [];

    for (const { type, id, options = {} } of relayConfigs) {
      console.log(`🔗 Creating ${type} Relay ${id} with options`, options);

      if (this.relays.has(id)) {
        console.warn(`⚠️ Relay ${id} already exists.`);
        createdRelays.push(this.relays.get(id));
        continue;
      }

      let relay;
      let relayInitialized = false;

      const ports =
        options.ports ||
        (type === "lobby"
          ? this.sharedPortMode
            ? this.lobbyPorts
            : [...this.lobbyPorts]
          : this.sharedPortMode
          ? this.gamePorts
          : [...this.gamePorts]);

      console.log(
        "Creating relay with ports",
        ports,
        "sharedPortMode",
        this.sharedPortMode,
        "sharedServer",
        this.sharedServer
      );

      switch (type) {
        case "chat":
          relay = new ChatRelay({
            id,
            ports,
            host: options.host || this.host,
          });

          await relay.init(this.sharedPortMode ? this.sharedServer : null);
          break;

        case "displayGame": {
          relay = new DisplayGameRelay({
            id,
            ports,
            host: options.host || this.host,
            controller: options.controller,
          });

          await relay.init(this.sharedPortMode ? this.sharedServer : null);
          break;
        }
        case "lobby":
          relay = new LobbyRelay({
            id,
            ports: options.ports || this.lobbyPorts,
            lobbyController: options.controller,
            host: options.host || this.host,
          });
          console.log(
            "sharedServer",
            this.sharedServer,
            "sharedPortMode",
            this.sharedPortMode
          );
          console.log(
            `[RelayManager] Initializing relay ${id} with sharedWss =`,
            !!(this.sharedPortMode && this.sharedServer)
          );

          await relay.init(this.sharedPortMode ? this.sharedServer : null);

          break;

        case "game":
          //  constructor({relayId, ports, gameController, host}) {
          // relay = new GameRelay(
          //   id,
          //   options.ports || this.gamePorts,
          //   options.controller,
          //   options.host || this.host
          // );
          relay = new GameRelay({
            id: id,
            ports: options.ports || this.gamePorts,
            gameController: options.controller,
            lobbyId: options.lobbyId,
            host: options.host || this.host,
          });
          console.log(
            "sharedServer",
            this.sharedServer,
            "sharedPortMode",
            this.sharedPortMode
          );
          console.log(
            `[RelayManager] Initializing relay ${id} with sharedWss =`,
            !!(this.sharedPortMode && this.sharedServer)
          );

          relayInitialized = await relay.init(
            this.sharedPortMode ? this.sharedServer : null
          );

          relay.gameIds = [id];
          if (relayInitialized) {
            console.log(`🔥 Created gameRelay for ${id}`);
          } else {
            throw new Error(`Failed to initialize gameRelay ${id}`);
          }
          console.log(`🔥 Created GameRelay for ${id}`);

          if (options.lobbyId) {
            const lobbyRelay = this.relays.get(options.lobbyId);
            console.log("lobbyRelay", lobbyRelay);
            if (lobbyRelay) {
              console.log(
                `🔗 Linking GameRelay ${id} with LobbyRelay ${options.lobbyId}`
              );
              relay.lobbyWs = lobbyRelay.ws;
              relay.lobbyId = options.lobbyId;
              const isDirectMode = this.sharedPortMode;
              lobbyRelay.relayConnections.set(
                relay.id,
                new RelayConnector(
                  lobbyRelay.id,
                  relay.id,
                  isDirectMode ? null : relay.wsAddress,
                  (message) => {
                    console.log(
                      `📩 lobby relayConnector Recieved Message from GameRelay ${relay.id}:`,
                      message
                    );
                    const relayConnector = lobbyRelay.relayConnections.get(
                      relay.id
                    );
                    let ws = relayConnector?.relaySocket;
                    if (ws || isDirectMode) {
                      lobbyRelay.processMessage(ws || null, message);
                      console.log(
                        `📩 lobby relayConnector processed message from GameRelay ${relay.id}`
                      );
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
          break;

        default:
          console.error(`❌ Unknown relay type: ${type}`);
          return null;
      }

      this.relays.set(id, relay);
      createdRelays.push(relay);
      console.log(`✅ ${type} Relay ${id} WebSocket started.`, relay);
    }

    return createdRelays;
  }

  gameEnded(gameId) {
    console.log(`Game ${gameId} ended.`);
    //let gameRelay = this.relays.get(gameId);
    //get all relays with type game
    let gameRelays = [...this.relays.values()].filter(
      (relay) => relay.type === "game"
    );
    console.log("gameRelays", gameRelays);
    gameRelays.forEach((relay) => {
      console.log("gameEnded checking relay for gameId", relay);
      relay.gameIds = relay.gameIds.filter((id) => id !== gameId);
      if (relay.gameIds.length === 0) {
        console.log("Founded game removing gameId from relay", relay);
        this.removeRelay(relay.id);
      }
    });
  }

  /** 🔗 Create and return a relay connector */
  // connectRelayToWS(id, targetUrl) {
  //   console.log(`🔗 RelayManager connecting ${id} to ${targetUrl}`);
  //   if (!this.relays.has(id)) {
  //     console.warn(`⚠️ Relay ${id} not found.`);
  //     return null;
  //   }
  //   this.relays.get(id).relayConnector = new RelayConnector(id, targetUrl);
  // }

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
