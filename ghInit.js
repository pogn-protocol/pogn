// Initialize Controllers
const GamesController = require("./casinoForge/GamesController");
const LobbyController = require("./casinoForge/lobbyController");
const Relay = require("./casinoForge/Relay");
const gamesController = new GamesController();
const lobbyController = new LobbyController(gamesController);

// ✅ Initialize Relay AFTER controllers are ready
const lobbyRelay = new Relay(lobbyController, gamesController);
