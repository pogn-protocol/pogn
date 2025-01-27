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

      case "createNewGame":
        return this.createGame(payload);

      case "joinGame":
        return this.joinLobbyPlayerToGame(payload);

      case "startGame":
        return this.startGame(payload);

      default:
        console.warn(`Unhandled lobby action: ${action}`);
        return {
          type: "error",
          payload: { message: `Unknown action: ${action}` },
        };
    }
  }

  startGame(payload) {
    console.log("Starting game:", payload);
    const { gameId, playerId } = payload;

    // Call the Lobby's startGame method
    const game = this.lobby.startGame(gameId, playerId);

    if (game.error) {
      console.error(`Error starting game: ${game.message}`);
      return {
        type: "error",
        action: "startGameFailed",
        payload: { message: game.message },
      };
    }

    console.log("game", game);
    this.gamesController.addActiveGame(gameId, game);
    console.log(this.gamesController.activeGames);

    console.log(`Player ${playerId} started game ${gameId}`);
    const players = this.lobby.getLobbyPlayers();
    const games = this.lobby.getLobbyGames();
    console.log("players", players, "games", games);
    return {
      type: "lobby",
      action: "refreshLobby",
      payload: {
        lobbyPlayers: players,
        lobbyGames: games,
      },
      broadcast: true,
    };
  }

  joinLobby(playerId) {
    if (!playerId) {
      return {
        type: "error",
        payload: { message: "Public key required to join the lobby" },
      };
    }

    this.lobby.joinLobby(playerId, { inLobby: true });
    console.log(`Player ${playerId} added or updated in the lobby.`);
    console.log("Lobby Players", this.lobby.getLobbyPlayers());

    return {
      type: "lobby",
      action: "refreshLobby",
      payload: {
        lobbyPlayers: this.lobby.getLobbyPlayers(),
        lobbyGames: this.lobby.getLobbyGames(),
      },
      broadcast: true,
    };
  }

  joinLobbyPlayerToGame(payload) {
    const { gameId, playerId } = payload;

    const joinResult = this.lobby.joinLobbyPlayerToGame(gameId, playerId);
    if (joinResult?.error) {
      return {
        type: "error",
        payload: { message: joinResult.message },
      };
    }
    console.log(`Player ${playerId} joined game ${JSON.stringify(joinResult)}`);

    return {
      type: "lobby",
      action: "refreshLobby",
      payload: {
        lobbyPlayers: this.lobby.getLobbyPlayers(),
        lobbyGames: this.lobby.getLobbyGames(),
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
    let players = this.lobby.getLobbyPlayers();
    console.log("games", games, "players", players);
    return {
      type: "lobby",
      action: "refreshLobby",
      payload: {
        lobbyPlayers: this.lobby.getLobbyPlayers(),
        lobbyGames: games,
      },
      broadcast: true,
    };
  }

  test(playerId) {
    console.log(`Player ${playerId} is reconnecting or joining a game.`);
    let testGame = this.lobby
      .getLobbyGames()
      .find((game) => game.status === "joining");
    console.log("Lobby Games", this.lobby.getLobbyGames());
    console.log("testGame", testGame);
    if (!testGame) {
      //delete all lobby games
      this.lobby.games = [];
      this.lobby.players = [];
      console.log("No available games. Creating a new game.");
      this.createGame({
        gameType: "rock-paper-scissors",
        playerId,
      });
      console.log(
        "Created a new game and added to lobby:",
        this.lobby.getLobbyGames()
      );
      console.log("this.lobby.games", this.lobby.games);
      this.lobby.games[0].status = "test";
      testGame = this.lobby.games[0];
      console.log("testGame", testGame);
    } else {
      console.log(`Player ${playerId} is joining an existing game:`, testGame);
    }

    //Add the player to the lobby
    this.lobby.joinLobby(playerId);
    // Add the player to the available game
    console.log("joining player to game", testGame.gameId, playerId);
    this.lobby.joinLobbyPlayerToGame(testGame.gameId, playerId);
    console.log("joined player to game", testGame.gameId, playerId);
    testGame = this.lobby.getGameDetails(testGame.gameId);
    this.lobby.games[0].status = "joining";
    // testGame.status = "joining";

    // Check if the game is now full and should be started

    console.log("testGame", testGame);
    if (Object.keys(testGame.players).length === testGame.instance.maxPlayers) {
      console.log(`Game ${testGame.gameId} is now full. Starting game.`);
      this.lobby.games[0].status = "readyToStart";
      // this.startGame({
      //   gameId: testGame.gameId,
      //   playerId,
      // });
    }
    console.log("sending refresh lobby");
    return {
      type: "lobby",
      action: "refreshLobby",
      payload: {
        lobbyPlayers: this.lobby.getLobbyPlayers(),
        lobbyGames: this.lobby.getLobbyGames(),
      },
      broadcast: true,
    };
  }

  refreshLobby() {
    return {
      type: "lobby",
      action: "refreshLobby",
      payload: {
        lobbyPlayers: this.lobby.getLobbyPlayers(),
        lobbyGames: this.lobby.getLobbyGames(),
      },
      broadcast: true,
    };
  }
}

module.exports = LobbyController;
