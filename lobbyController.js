//import lobby class
const Lobby = require("./lobby");
const Game = require("./game"); // Import the Game class

class LobbyController {
  constructor(gamesController) {
    this.gamesController = gamesController; // Use the shared instance
    this.lobby = new Lobby();
  }

  processMessage(action, payload) {
    console.log("Processing lobby action:", action, payload);

    switch (action) {
      case "login":
        return this.joinLobby(payload.playerId);

      case "verifyResponse":
        return this.handleVerifyResponse(payload.playerId);

      case "createNewGame":
        return this.createGame(payload);

      case "getGames":
        return this.getGames();

      case "joinGame":
        return this.joinPlayer(payload);

      default:
        console.warn(`Unhandled lobby action: ${action}`);
        return {
          type: "error",
          payload: { message: `Unknown action: ${action}` },
        };
    }
  }

  getGames() {
    console.log("games", this.lobby.getLobbyGames());
    const games = this.lobby.getLobbyGames();
    return {
      type: "lobby",
      action: "lobbyGames",
      payload: { games },
    };
  }

  joinLobby(playerId) {
    if (!playerId) {
      return {
        type: "error",
        payload: { message: "Public key required to join the lobby" },
      };
    }

    this.lobby.addPlayer(playerId, { inLobby: false });
    console.log(`Player ${playerId} added or updated in the lobby.`);

    console.log("Sterilizing lobby players...");
    this.lobby.sterilizeLobby();
    console.log("players", this.lobby);
    return {
      type: "lobby",
      action: "verifyPlayer",
      payload: {},
      //broadcasts to everyone via relay.js code
    };
  }

  updatePlayers() {
    console.log("Updating players...", this.lobby.getVerifiedLobbyPlayers());
    return {
      type: "lobby",
      action: "updateLobbyPlayers",
      payload: {
        players: this.lobby.getVerifiedLobbyPlayers(),
      },
      broadcast: true,
    };
  }

  handleVerifyResponse(playerId) {
    console.log(`Verifying player: ${playerId}`);

    if (this.lobby.verifyPlayer(playerId)) {
      console.log(`Player ${playerId} is verified.`);
    } else {
      console.log(`Player ${playerId} does not exist in the lobby.`);
    }

    return {
      type: "lobby",
      action: "playerVerified",
      payload: {
        message: `Player ${playerId} successfully verified.`,
        playerId,
        players: this.lobby.getVerifiedLobbyPlayers(),
      },
      broadcast: false,
    };
  }
  joinPlayer(payload) {
    const { gameId, playerId } = payload;

    const joinResult = this.lobby.joinPlayer(gameId, playerId);
    if (joinResult?.error) {
      return {
        type: "error",
        payload: { message: joinResult.message },
      };
    }
    console.log(`Player ${playerId} joined game ${JSON.stringify(joinResult)}`);

    return {
      type: "lobby",
      action: "lobbyGames",
      payload: {
        games: this.lobby.getLobbyGames(),
      },
      broadcast: true,
    };
  }

  createGame(payload) {
    const { gameType, playerId } = payload;
    console.log("Creating game:", gameType, playerId);

    if (!this.gamesController.gameClasses[gameType]) {
      console.error(`Unsupported game type: ${gameType}`);
      return {
        type: "error",
        payload: { message: `Unsupported game type: ${gameType}` },
      };
    }
    if (!playerId) {
      return {
        type: "error",
        payload: { message: "Player ID required to create a game" },
      };
    }

    // Create and initialize the game
    const game = new Game(gameType);
    const gameInstance = new this.gamesController.gameClasses[gameType]();
    game.setGameInstance(gameInstance);
    this.lobby.addGame(game);
    game.logAction(`${playerId} created game.`);
    const games = this.lobby.getLobbyGames();
    console.log("games", games);
    return {
      type: "lobby",
      action: "lobbyGames",
      payload: { games },
      broadcast: true,
    };
  }
}

module.exports = LobbyController;
