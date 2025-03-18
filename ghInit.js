const RelayManager = require("./casinoForge/relayManager");
const GamesController = require("./casinoForge/gamesController");
const LobbyController = require("./casinoForge/lobbyController");
const relay = require("./casinoForge/relay");
const lobbyRelay = require("./casinoForge/lobbyRelay");
const gameRelay = require("./casinoForge/gameRelay");

// ✅ Initialize Controllers
let gamePorts = [9000]; // ✅ Define game ports
let lobbyPorts = [8080]; // ✅ Define lobby ports
let lobbyWsUrl = "ws://localhost:9000"; // ✅ Define lobby WebSocket URL
const gamesController = new GamesController(gamePorts, lobbyWsUrl);
const lobbyController = new LobbyController(gamesController);

// ✅ Initialize RelayManager (which will create the lobby relay)
const relayManager = new RelayManager();
relayManager.createLobbyRelay("lobbyRelay1", lobbyPorts, lobbyController);

// ✅ Create a game relay
// new relay("game", "game1", 9000, "ws://localhost:9001");
// new relay("game", "game2", 9001, "ws://localhost:9000");

// a lobby and game relay
// new lobbyRelay("lobby1", [8080], lobbyController, "ws://localhost:9000");
// new gameRelay("game1", [9000], gamesController, "ws://localhost:8080");

//let gameRelay = relayManager.createGameRelay("game", gamesController);
//console.log("gameRelay", gameRelay);

//module.exports = { relayManager }; // ✅ NO WebSocket server here
