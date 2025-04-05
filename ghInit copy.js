const RelayManager = require("./casinoForge/relayManager");
const GameController = require("./casinoForge/gameController");
const LobbyController = require("./casinoForge/lobbyController");
const relay = require("./casinoForge/relay");
const lobbyRelay = require("./casinoForge/lobbyRelay");
const gameRelay = require("./casinoForge/gameRelay");
const express = require("express");
const pognConfigs = require("./pognConfigs");

const app = express();
app.get("/", (req, res) => {
  res.send("Relay server is alive.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Dummy HTTP server listening on port ${PORT}`);
});

// ✅ Initialize Controllers
let gamePorts = pognConfigs.GAME_PORTS; // ✅ Define game ports
let lobbyPorts = pognConfigs.LOBBY_PORTS; // ✅ Define lobby ports
let lobbyWsUrl = pognConfigs.WS_URL; // ✅ Define WebSocket URL for lobby

let sharedWss = null;
if (pognConfigs.SHARED_PORT) {
  sharedWss = new Server({ port: config.PORT });
  console.log(`🌐 Shared WebSocket server started on port ${config.PORT}`);
}

const relayManager = new RelayManager({
  lobbyPorts: pognConfigs.LOBBY_PORTS,
  gamePorts: pognConfigs.GAME_PORTS,
  sharedPort: pognConfigs.SHARED_PORT_MODE,
  sharedWss: sharedWss,
});

const gameController = new GameController({
  relayManager,
  gamePorts: pognConfigs.GAME_PORTS,
  lobbyWsUrl: pognConfigs.WS_URL,
});
const lobbyController = new LobbyController({
  gameController,
  relayManager,
  lobbyPorts: pognConfigs.LOBBY_PORTS,
  gamePorts: pognConfigs.GAME_PORTS,
});

const relayConfigs = [
  {
    type: "lobby",
    id: "lobby1",
    options: {
      ports: [8080], // Port for the lobby relay
      controller: lobbyController, // Optional controller name
    },
  },
  {
    type: "lobby",
    id: "lobby2",
    options: {
      ports: [8081], // Port for the game relay
      controller: lobbyController, // Optional controller name
    },
  },
];

console.log("creating lobbies");
lobbyController.createLobby({
  type: "lobby",
  id: "lobby1",
  options: { controller: lobbyController },
});
//lobbyController.createLobby({ type: "lobby", id: "lobby2", options: { controller: lobbyController } })
//lobbyController.createLobby({ lobbyId: "lobby1" });
//lobbyController.createLobby({ lobbyId: "lobby2" });

// const createdRelays = relayManager.createRelays(relayConfigs);
// console.log("Created Relays:", createdRelays);

// ✅ Initialize RelayManager (which will create the lobby relay)
// relayManager.createRelays("lobby", "default", {
//   controller: lobbyController,
// });

// ✅ Create a game relay/
// new relay("game", "game1", 9000, "ws://localhost:9001");
// new relay("game", "game2", 9001, "ws://localhost:9000");

// a lobby and game relay
// new lobbyRelay("lobby1", [8080], lobbyController, "ws://localhost:9000");
// new gameRelay("game1", [9000], gameController, "ws://localhost:8080");

//let gameRelay = relayManager.createGameRelay("game", gameController);
//console.log("gameRelay", gameRelay);

//module.exports = { relayManager }; // ✅ NO WebSocket server here
