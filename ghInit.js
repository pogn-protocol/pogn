const RelayManager = require("./casinoForge/relayManager");
const GameController = require("./casinoForge/gameController");
const LobbyController = require("./casinoForge/lobbyController");
const relay = require("./casinoForge/relay");
const lobbyRelay = require("./casinoForge/lobbyRelay");
const gameRelay = require("./casinoForge/gameRelay");

// ✅ Initialize Controllers
let gamePorts = [9000]; // ✅ Define game ports
let lobbyPorts = [8080]; // ✅ Define lobby ports
let lobbyWsUrl = "ws://localhost:9000"; // ✅ Define lobby WebSocket URL
const relayManager = new RelayManager();
const gameController = new GameController(gamePorts, lobbyWsUrl, relayManager);
const lobbyController = new LobbyController(gameController, relayManager);

// ✅ Initialize RelayManager (which will create the lobby relay)
relayManager.createRelay("lobby", "default", {
  controller: lobbyController,
});

// ✅ Create a game relay
// new relay("game", "game1", 9000, "ws://localhost:9001");
// new relay("game", "game2", 9001, "ws://localhost:9000");

// a lobby and game relay
// new lobbyRelay("lobby1", [8080], lobbyController, "ws://localhost:9000");
// new gameRelay("game1", [9000], gameController, "ws://localhost:8080");

//let gameRelay = relayManager.createGameRelay("game", gameController);
//console.log("gameRelay", gameRelay);

//module.exports = { relayManager }; // ✅ NO WebSocket server here
