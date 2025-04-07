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
  sharedServer = new Server({ server });
  console.log(`🔁 Shared WebSocket server attached to port ${PORT}`);
}

const relayManager = new RelayManager({
  lobbyPorts: pognConfigs.LOBBY_PORTS,
  gamePorts: pognConfigs.GAME_PORTS,
  sharedPortMode: pognConfigs.SHARED_PORT_MODE,
  sharedServer,
  host: pognConfigs.HOST,
});

if (pognConfigs.SHARED_PORT_MODE) {
  // sharedServer = new Server({ server }); // ✅ attach to *existing* HTTP server
  console.log(`🔁 Shared WebSocket server attached to port ${PORT}`);
  sharedServer.on("connection", (ws) => {
    ws.on("message", (rawMsg) => {
      let relayId;
      let parsed;

      try {
        parsed = JSON.parse(rawMsg);
        console.log("sharedServer parsed message:", parsed);
        relayId = parsed.relayId;
        console.log("sharedServer relayId:", relayId);
        if (!relayId) throw new Error("Missing relayId");
      } catch (err) {
        console.error("❌ Invalid message (must include relayId):", err);
        return;
      }

      const relay = relayManager.relays.get(relayId);
      if (!relay) {
        console.warn(`⚠️ No relay found for relayId: ${relayId}`);
        return;
      }
      console.log(`🔗 Routing shared WebSocket to Relay`, relay);

      // if (!ws._relayInitialized) {
      //   relay.handleConnection(ws); // registers ws into webSocketMap
      //   ws._relayInitialized = true;
      // }

      relay.handleMessage(ws, rawMsg); // 👈 forward to correct relay
    });
  });
}

//if heroku, use the shared server
//if (process.env.NODE_ENV === "production") {

app.get("/", (req, res) => {
  res.send("Relay server is alive.");
});

//}

// 🔧 Initialize Relay Manager with config-driven ports

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

server.listen(PORT, () => {
  console.log(`🌐 HTTP+WS server listening on port ${PORT}`);
});
