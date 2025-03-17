const RelayManager = require("./casinoForge/relayManager");
const GamesController = require("./casinoForge/gamesController");
const LobbyController = require("./casinoForge/lobbyController");

// ✅ Initialize Controllers
let gamePorts = [9000]; // ✅ Define game ports
const gamesController = new GamesController(gamePorts);
const lobbyController = new LobbyController(gamesController);

// ✅ Initialize RelayManager (which will create the lobby relay)
const relayManager = new RelayManager();
relayManager.createLobbyRelay("lobby", lobbyController, gamesController);
//let gameRelay = relayManager.createGameRelay("game", gamesController);
//console.log("gameRelay", gameRelay);

//module.exports = { relayManager }; // ✅ NO WebSocket server here
