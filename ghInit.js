const { Server } = require("ws");
const express = require("express");
const pognConfigs = require("./pognConfigs");

const RelayManager = require("./casinoForge/relayManager");
const GameController = require("./casinoForge/gameController");
const LobbyController = require("./casinoForge/lobbyController");
const http = require("http");

// 🟢 Start dummy Express server for Heroku web dyno
const app = express();

const PORT = pognConfigs.PORT || 3000;

// ✅ Create ONE HTTP server and attach Express + WebSocket to it
const server = http.createServer(app);
let sharedServer = null;

if (pognConfigs.SHARED_PORT_MODE) {
  sharedServer = new Server({ server }); // ✅ attach to *existing* HTTP server
  console.log(`🔁 Shared WebSocket server attached to port ${PORT}`);
}

//if heroku, use the shared server
if (process.env.NODE_ENV === "production") {
  app.get("/", (req, res) => {
    res.send("Relay server is alive.");
  });

  server.listen(PORT, () => {
    console.log(`🌐 HTTP+WS server listening on port ${PORT}`);
  });
}

// 🔧 Initialize Relay Manager with config-driven ports
const relayManager = new RelayManager({
  lobbyPorts: pognConfigs.LOBBY_PORTS,
  gamePorts: pognConfigs.GAME_PORTS,
  sharedPortMode: pognConfigs.SHARED_PORT_MODE,
  sharedServer,
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
