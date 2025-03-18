const WebSocket = require("ws");
global.WebSocket = WebSocket;
const LobbyRelay = require("./lobbyRelay");
const GameRelay = require("./gameRelay");

class RelayManager {
  constructor() {
    /// constructor(lobbyController, gamesController) {
    //   this.lobbyController = lobbyController;
    // this.gamesController = gamesController;
    this.lobbies = new Map();
    this.games = new Map();

    // ✅ Create the default lobby relay (This starts WebSocket on 8080)
    // this.createLobby("default");
  }

  createLobbyRelay(lobbyId, ports, lobbyController) {
    if (!this.lobbies.has(lobbyId)) {
      lobbyController.setRelayManager(this);
      const lobbyRelay = new LobbyRelay(lobbyId, ports, lobbyController);
      console.log(`🔥 Spawning LobbyRelay for lobby ${lobbyId}...`);
      lobbyController.setLobbyRelay(lobbyId, lobbyRelay);
      // this.lobbies.set(lobbyId, lobbyRelay);

      console.log(`✅ Lobby ${lobbyId} WebSocket started on 8080.`);
    }
    return this.lobbies.get(lobbyId);
  }

  createGameRelay(gameId, gamesController, players) {
    console.log(`🔍 Checking if gameId exists...`);
    console.log(`🔍 gameId: ${gameId}`);
    if (!this.games.has(gameId)) {
      console.log(`🔥 Spawning GameRelay for game ${gameId}...`);
      // const gamePort = this.findAvailablePort();
      const gamePorts = gamesController.gamePorts;

      const gameRelay = new GameRelay(
        gameId,
        players,
        gamePorts,
        gamesController
      );
      gamesController.addGameRelay(gameId, gameRelay);
      this.games.set(gameId, gameRelay);

      console.log(
        `✅ GameRelay ${gameId} WebSocket started on ws://localhost:${gamePorts}`
      );
      return { gameRelay, gamePorts };
    } else {
      console.log(`❌ Game ${gameId} already exists.`);
    }
    return {
      gameRelay: this.games.get(gameId),
      gamePort: this.games.get(gameId).port,
    };
  }

  findAvailablePort(basePort = 9000) {
    let port = basePort;
    while ([...this.games.values()].some((game) => game.port === port)) {
      port++; // Move to the next available port
    }
    return port;
  }

  removeGame(gameId) {
    if (this.games.has(gameId)) {
      this.games.get(gameId).shutdown();
      this.games.delete(gameId);
      console.log(`❌ Game ${gameId} removed.`);
    }
  }
}

module.exports = RelayManager;
