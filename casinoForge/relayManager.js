const WebSocket = require("ws");
global.WebSocket = WebSocket;
const LobbyRelay = require("./lobbyRelay");
const GameRelay = require("./gameRelay");
const RelayConnector = require("./relayConnector");

class RelayManager {
  constructor() {
    this.relays = new Map(); // ✅ Store all relays (lobby & game)
    // this.gamePorts = [9000]; // ✅ Define game ports
    this.lobbyPorts = [8080]; // ✅ Define lobby ports
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
      switch (type) {
        case "lobby":
          relay = new LobbyRelay(
            id,
            options.ports || this.lobbyPorts,
            options.controller
          );
          await relay.init(); // Await relay initialization

          break;

        case "game":
          relay = new GameRelay(
            id,
            options.ports || this.gamePorts,
            options.controller,
            options.lobbyId
          );
          relayInitialized = await relay.init(); // Await relay initialization
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

  // createRelays(relayConfigs = []) {
  //   if (!Array.isArray(relayConfigs) || relayConfigs.length === 0) {
  //     console.warn("⚠️ No relay configurations provided.");
  //     return [];
  //   }

  //   const createdRelays = [];

  //   relayConfigs.forEach(({ type, id, options = {} }) => {
  //     console.log(`🔗 Creating ${type} Relay ${id} with options`, options);

  //     if (this.relays.has(id)) {
  //       console.warn(`⚠️ Relay ${id} already exists.`);
  //       createdRelays.push(this.relays.get(id));
  //       return;
  //     }

  //     let relay;
  //     switch (type) {
  //       case "lobby":
  //         relay = new LobbyRelay(
  //           id,
  //           options.ports || this.lobbyPorts,
  //           options.controller
  //         );
  //         console.log(`🔥 Created LobbyRelay for ${id}`);
  //         break;

  //       case "game":
  //         console.log(this.gamePorts);

  //         relay = new GameRelay(
  //           id,
  //           options.ports || this.gamePorts,
  //           options.controller,
  //           options.lobbyId
  //         );
  //         relay.gameIds = [id];
  //         console.log(`🔥 Created GameRelay for ${id}`);

  //         if (options.lobbyId) {
  //           const lobbyRelay = this.relays.get(options.lobbyId);
  //           console.log("lobbyRelay", lobbyRelay);
  //           if (lobbyRelay) {
  //             console.log(
  //               `🔗 Linking GameRelay ${id} with LobbyRelay ${options.lobbyId}`
  //             );
  //             relay.lobbyWs = lobbyRelay.ws;
  //             relay.lobbyId = options.lobbyId;

  //             lobbyRelay.relayConnections.set(
  //               relay.id,
  //               new RelayConnector(
  //                 lobbyRelay.id,
  //                 relay.id,
  //                 relay.wsAddress,
  //                 (message) => {
  //                   console.log(
  //                     `📩 lobby relayConnector Recieved Message from GameRelay ${relay.id}:`,
  //                     message
  //                   );
  //                   const relayConnector = lobbyRelay.relayConnections.get(
  //                     relay.id
  //                   );
  //                   let ws = relayConnector?.relaySocket;
  //                   if (ws) {
  //                     lobbyRelay.processMessage(ws, message);
  //                   } else {
  //                     console.warn(
  //                       `⚠️ No relayConnector found for GameRelay ${relay.id}.`
  //                     );
  //                   }
  //                 },
  //                 () => {
  //                   console.log(
  //                     `✅ LobbyRelay ${options.lobbyId} connected to GameRelay ${relay.id}`
  //                   );
  //                 }
  //               )
  //             );
  //           } else {
  //             console.warn(`⚠️ No LobbyRelay found for ID ${options.lobbyId}.`);
  //           }
  //         }
  //         break;

  //       default:
  //         console.error(`❌ Unknown relay type: ${type}`);
  //         return null;
  //     }

  //     this.relays.set(id, relay);
  //     createdRelays.push(relay);
  //     console.log(`✅ ${type} Relay ${id} WebSocket started.`, relay);
  //   });

  //   return createdRelays;
  // }

  /** 🔗 Create relay dynamically based on type */
  // createRelay(type, id, options = {}) {
  //   console.log(`🔗 Creating ${type} Relay ${id} with options`, options);
  //   if (this.relays.has(id)) {
  //     console.warn(`⚠️ Relay ${id} already exists.`);
  //     return this.relays.get(id);
  //   }

  //   let relay;
  //   switch (type) {
  //     case "lobby":
  //       relay = new LobbyRelay(
  //         id,
  //         options.ports || this.lobbyPorts,
  //         options.controller
  //       );
  //       console.log(`🔥 Created LobbyRelay for ${id}`);
  //       break;

  //     case "game":
  //       console.log(this.gamePorts);
  //       //check if any relays with type game
  //       let gameRelay = [...this.relays.values()].find(
  //         (relay) => relay.type === "game"
  //       );

  //       if (gameRelay) {
  //         console.log(`⚠️ Relay game already exists.`);
  //         gameRelay.gameIds.push(id);
  //         return gameRelay;
  //       }

  //       relay = new GameRelay(
  //         "GAMERELAY",
  //         options.ports || this.gamePorts,
  //         options.controller,
  //         options.lobbyId
  //       );
  //       relay.gameIds.push(id);
  //       id = "GAMERELAY";
  //       console.log(`🔥 Created GameRelay for ${id}`);

  //       if (options.lobbyId) {
  //         const lobbyRelay = this.relays.get(options.lobbyId);
  //         console.log("lobbyRelay", lobbyRelay);
  //         if (lobbyRelay) {
  //           console.log(
  //             `🔗 Linking GameRelay ${id} with LobbyRelay ${options.lobbyId}`
  //           );
  //           // lobbyRelay.connectToGameRelay(id, relay.wsAddress);
  //           relay.lobbyWs = lobbyRelay.ws;
  //           relay.lobbyId = options.lobbyId;

  //           lobbyRelay.relayConnections.set(
  //             relay.id,
  //             new RelayConnector(
  //               lobbyRelay.id,
  //               relay.id,
  //               relay.wsAddress,
  //               (message) => {
  //                 console.log(
  //                   `📩 lobby relayConnector Recieved Message from GameRelay ${relay.id}:`,
  //                   message
  //                 );
  //                 const relayConnector = lobbyRelay.relayConnections.get(
  //                   relay.id
  //                 );
  //                 let ws = relayConnector?.relaySocket;
  //                 if (ws) {
  //                   lobbyRelay.processMessage(ws, message);
  //                 } else {
  //                   console.warn(
  //                     `⚠️ No relayConnector found for GameRelay ${relay.id}.`
  //                   );
  //                 }
  //               },
  //               () => {
  //                 console.log(
  //                   `✅ LobbyRelay ${options.lobbyId} connected to GameRelay ${relay.id}`
  //                 );
  //               }
  //             )
  //           );
  //         } else {
  //           console.warn(`⚠️ No LobbyRelay found for ID ${options.lobbyId}.`);
  //         }
  //       }
  //       console.log(`🔥 Created GameRelay for ${id}`);
  //       break;

  //     default:
  //       console.error(`❌ Unknown relay type: ${type}`);
  //       return null;
  //   }

  //   this.relays.set(id, relay);
  //   console.log(`✅ ${type} Relay ${id} WebSocket started.`, relay);
  //   return relay;
  // }

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
