const RelayManager = require("./casinoForge/relayManager");
const GameController = require("./casinoForge/gameController");
const LobbyController = require("./casinoForge/lobbyController");
const relay = require("./casinoForge/relay");
const lobbyRelay = require("./casinoForge/lobbyRelay");
const gameRelay = require("./casinoForge/gameRelay");

// ✅ Initialize Controllers
let gamePorts = [9000, 9001, 9002, 9003, 9004]; // ✅ Define game ports
let lobbyPorts = [8080]; // ✅ Define lobby ports
let lobbyWsUrl = "ws://localhost:9000"; // ✅ Define lobby WebSocket URL
const relayManager = new RelayManager();
const gameController = new GameController(gamePorts, lobbyWsUrl, relayManager);
const lobbyController = new LobbyController(gameController, relayManager);

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

//lobbyController.createLobby({type:"lobby", id: "lobby1", options: {controller: lobbyController} });
//lobbyController.createLobby({ type: "lobby", id: "lobby2", options: { controller: lobbyController } });
lobbyController.createLobby({ lobbyId: "lobby1" });
lobbyController.createLobby({ lobbyId: "lobby2" });

// const createdRelays = relayManager.createRelays(relayConfigs);
// console.log("Created Relays:", createdRelays);

// ✅ Initialize RelayManager (which will create the lobby relay)
// relayManager.createRelays("lobby", "default", {
//   controller: lobbyController,
// });

// ✅ Create a game relay
// new relay("game", "game1", 9000, "ws://localhost:9001");
// new relay("game", "game2", 9001, "ws://localhost:9000");

// a lobby and game relay
// new lobbyRelay("lobby1", [8080], lobbyController, "ws://localhost:9000");
// new gameRelay("game1", [9000], gameController, "ws://localhost:8080");

//let gameRelay = relayManager.createGameRelay("game", gameController);
//console.log("gameRelay", gameRelay);

//module.exports = { relayManager }; // ✅ NO WebSocket server here
