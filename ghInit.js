const { Server } = require("ws");
const express = require("express");
const pognConfigs = require("./configs/pognConfigs");

const RelayManager = require("./casinoForge/relay/relayManager");
const GameController = require("./casinoForge/controllers/gameController");
const LobbyController = require("./casinoForge/controllers/lobbyController");
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
        relayId = parsed?.relayId;
        if (Array.isArray(parsed) && parsed[0] === "REQ") {
          console.log("sharedServer REQ message:", parsed);
          return;
        }
        if (Array.isArray(parsed) && parsed[0] === "EVENT") {
          const event = parsed[1];
          console.log("sharedServer EVENT message:", event);
          const relayTag = event.tags?.find(([tag]) => tag === "relayId");
          console.log("sharedServer relayTag:", relayTag);
          relayId = relayTag?.[1]; // ✅ extract relayId from tag
          console.log("Recived Nostr event:", event);
          // return;
        }

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

      relay.handleMessage(ws, rawMsg);
    });
  });
}

app.get("/", (req, res) => {
  res.send("Relay server is alive.");
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

console.log("📦 Bootstrapping Lobbies...");
(async () => {
  console.log("📦 Bootstrapping Lobbies...");
  await Promise.all(
    pognConfigs.LOBBY_IDS.map((lobbyId) =>
      lobbyController.createLobby({ lobbyId })
    )
  );

  console.log("📦 Bootstrapping Games...", pognConfigs.INITGAMES);
  await lobbyController.initGames(pognConfigs.INITGAMES);
})();

server.listen(PORT, () => {
  console.log(`🌐 HTTP+WS server listening on port ${PORT}`);
});
