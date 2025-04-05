const { Server } = require("ws");
const express = require("express");
const pognConfigs = require("./pognConfigs");

const RelayManager = require("./casinoForge/relayManager");
const GameController = require("./casinoForge/gameController");
const LobbyController = require("./casinoForge/lobbyController");

// 🟢 Start dummy Express server for Heroku web dyno
const app = express();
app.get("/", (req, res) => {
  res.send("Relay server is alive.");
});
const PORT = pognConfigs.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 HTTP server listening on port ${PORT}`);
});

// 🛠️ Optional shared WebSocket server for Heroku (single port)
let sharedWss = null;
if (pognConfigs.SHARED_PORT_MODE) {
  sharedWss = new Server({ port: pognConfigs.PORT });
  console.log(`🔁 Shared WebSocket server started on port ${pognConfigs.PORT}`);
}

// 🔧 Initialize Relay Manager with config-driven ports
const relayManager = new RelayManager({
  lobbyPorts: pognConfigs.LOBBY_PORTS,
  gamePorts: pognConfigs.GAME_PORTS,
  sharedPortMode: pognConfigs.SHARED_PORT_MODE,
  sharedWss,
});

// 🎮 Init Game + Lobby controllers
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

// 🧪 Create all lobbies defined in config
console.log("📦 Bootstrapping Lobbies...");
pognConfigs.LOBBY_IDS.forEach((lobbyId) => {
  lobbyController.createLobby({ lobbyId });
});
