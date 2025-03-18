const Lobby = require("./lobby");
const Player = require("./player"); // Import the Player class

class LobbyController {
  constructor(gameController, relayManager) {
    this.gameController = gameController; // Use the shared instance
    this.relayManager = relayManager; // ✅ Store the RelayManager instance
    this.lobbies = new Map();
    //make default lobby
    const lobby = new Lobby("default");
    //put lobby in map
    this.lobbies.set(lobby.lobbyId, lobby);

    // setInterval(() => {
    //   this.testEmitter();
    // }, 10000);

    this.messageHandlers = {
      login: (data) => this.joinLobby(data),
      createNewGame: (data) => this.createGame(data),
      joinGame: (data) => this.joinLobbyPlayerToGame(data),
      startGame: (data) => this.startGame(data), // ✅ Cleaner signature
      endGame: (data) => this.endGame(data),
      refreshLobby: (data) => this.refreshLobby(data),
    };
  }

  processMessage(message) {
    console.log("Processing lobby message:", message);

    const { lobbyId, action, payload } = message;
    const { playerId, gameId } = payload || {};

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      console.warn(`⚠️ Lobby ${lobbyId} not found.`);
      return {
        type: "error",
        payload: { message: `Lobby ${lobbyId} not found.` },
      };
    }

    if (!this.messageHandlers[action]) {
      console.warn(`⚠️ Unknown action: ${action}`);
      return {
        type: "error",
        payload: { message: `Unknown action: ${action}` },
      };
    }

    // Attach extracted values so handlers don't need to extract them again
    return this.messageHandlers[action]({ lobby, payload, playerId, gameId });
  }

  startGame({ lobby, gameId }) {
    console.log("Starting game:", gameId);
    const game = lobby.getGame(gameId);
    if (!game) {
      return {
        type: "error",
        payload: { message: `Game with ID ${gameId} not found in the lobby.` },
      };
    }

    lobby.removeGame(gameId); // Remove from lobby

    try {
      const startGameResult = this.gameController.startGame(game);
      if (startGameResult?.error) {
        console.error(`Error starting game: ${game.message}`);
        return {
          type: "error",
          action: "startGameFailed",
          payload: { message: game.message },
        };
      }

      console.log(this.gameController.activeGames);
      let gameDetails = game.getGameDetails();
      console.log("Game started:", gameDetails);
      return {
        type: "lobby",
        action: "startGame",
        payload: {
          game: gameDetails,
        },
        broadcast: true,
      };
    } catch (error) {
      console.error(`Error starting game: ${error}`);
    }
  }

  joinLobby({ lobby, playerId }) {
    console.log(playerId, " joining lobby.");
    if (!playerId) {
      return {
        type: "error",
        payload: { message: "Public key required to join the lobby" },
      };
    }

    if (lobby.players.some((p) => p.playerId === playerId)) {
      console.log(`Player ${playerId} already in the lobby!`);
      return;
    }
    console.log("Adding player", playerId);
    const player = new Player({
      playerId,
      inLobby: true, // Default to true when adding a player to the lobby
    });
    lobby.players.push(player);

    console.log(`Player ${playerId} joined the lobby.`);
    console.log("Lobby Players", lobby.getLobbyPlayers());
    console.log("Lobby Games", lobby.getLobbyGames());

    return {
      type: "lobby",
      action: "refreshLobby",
      payload: {
        lobbyPlayers: lobby.getLobbyPlayers(),
        lobbyGames: lobby.getLobbyGames(),
      },
      broadcast: true,
    };
  }

  joinLobbyPlayerToGame({ lobby, gameId, playerId }) {
    console.log("Joining playerId", playerId, "to game", gameId);
    const game = lobby.getGame(gameId);
    if (!game) {
      return {
        type: "error",
        payload: { message: `Game with ID ${gameId} not found.` },
      };
    }
    let gamePlayers;
    if (
      Array.from(game.players.values()).some((p) => p.playerId === playerId)
    ) {
      console.log(`Player ${playerId} already in the game!`);
      return {
        type: "error",
        payload: { message: `Player ${playerId} already in the game!` },
      };
    }

    if (game.players.length >= game.instance.maxPlayers) {
      console.log(`Game is full. Max players: ${game.instance.maxPlayers}`);
      return {
        type: "error",
        payload: {
          message: `Game is full. Max players: ${game.instance.maxPlayers}`,
        },
      };
    }

    game.players.set(playerId, { playerId }); // Store the playerId as the key and an object as the value
    console.log(
      `${playerId} was added to the game. Current players:`,
      game.players
    );

    if (game.players.size >= game.instance.maxPlayers) {
      game.status = "readyToStart";
      console.log("The game is ready to start.");
    } else if (game.players.size >= game.instance.minPlayers) {
      game.status = "canStart";
      console.log("The game can start.");
    }

    return {
      type: "lobby",
      action: "refreshLobby",
      payload: {
        lobbyPlayers: lobby.getLobbyPlayers(),
        lobbyGames: lobby.getLobbyGames(),
      },
      broadcast: true,
    };
  }

  createGame({ lobby, gameType, playerId }) {
    console.log(playerId, " Creating game: ", gameType);
    if (!this.gameController.gameClasses[gameType]) {
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

    const game = this.gameController.createGame(gameType, true, playerId);
    console.log("gameRelay", this.relayManager.relays.get(game.gameId));
    console.log("relay ws", this.relayManager.relays.get(game.gameId).ws);
    this.relayManager.connectRelayToWS(lobby.lobbyId, game.relay.wsAddress);
    setTimeout(() => {
      console.log("sending test message");
      this.relayManager.relays.get(game.gameId).sendMessage({
        type: "hello",
        payload: { message: "Hello from lobby" },
      });
    }, 10000);

    console.log("game", game);
    lobby.addGame(game);
    game.logAction(`${playerId} created game.`);
    const games = lobby.getLobbyGames();
    let players = lobby.getLobbyPlayers();
    console.log("games", games, "players", players);

    return {
      type: "lobby",
      action: "refreshLobby",
      payload: {
        lobbyPlayers: lobby.getLobbyPlayers(),
        lobbyGames: games,
      },
      broadcast: true,
    };
  }

  test(playerId) {
    const lobby = this.lobbies.get("default");
    console.log(`Player ${playerId} is reconnecting or joining a game.`);
    let testGame = lobby
      .getLobbyGames()
      .find((game) => game.status === "joining");
    console.log("Lobby Games", lobby.getLobbyGames());
    console.log("testGame", testGame);
    if (!testGame) {
      lobby.games = [];
      lobby.players = [];
      console.log("No available games. Creating a new game.");
      this.createGame({
        type: "lobby",
        action: "createNewGame",
        payload: {
          gameType: "testGame",
          playerId,
        },
      });
      console.log(
        "Created a new game and added to lobby:",
        lobby.getLobbyGames()
      );
      console.log("lobby.games", lobby.games);
      lobby.games[0].status = "test";
      testGame = lobby.games[0];
      console.log("testGame", testGame);
    } else {
      console.log(`Player ${playerId} is joining an existing game:`, testGame);
    }
    this.joinLobby({
      type: "lobby",
      action: "joinLobby",
      payload: {
        playerId,
      },
    });

    console.log("joining player to game", testGame.gameId, playerId);
    this.processMessage({
      type: "lobby",
      action: "joinGame",
      payload: {
        gameId: testGame.gameId,
        playerId,
      },
    });
    console.log("joined player to game", testGame.gameId, playerId);
    testGame = lobby.getGameDetails(testGame.gameId);
    lobby.games[0].status = "joining";

    console.log("testGame", testGame);
    if (Object.keys(testGame.players).length === testGame.instance.maxPlayers) {
      console.log(`Game ${testGame.gameId} is now full. Starting game.`);
      lobby.games[0].status = "readyToStart";
    }
    console.log("sending refresh lobby");
    return {
      type: "lobby",
      action: "refreshLobby",
      payload: {
        lobbyPlayers: lobby.getLobbyPlayers(),
        lobbyGames: lobby.getLobbyGames(),
      },
      broadcast: true,
    };
  }

  endGame(lobby, { gameId }) {
    console.log("Ending game:", gameId);
    this.gameController.endGame(gameId);
    // const game = this.gameController.activeGames.get(gameId);
    // if (!game) {
    //   console.warn(`⚠️ Cannot end game ${gameId}: Not found.`);
    //   return;
    // }

    // console.log("Ending game:", game);
    // game.status = "ended";
    // game.gameLog.push("Game ended.");
    // console.log("gameRelay", game.relay, "gameRelayStatus", game.relay.status);
    // game.relay.broadcastResponse({
    //   type: "game",
    //   action: "gameEnded",
    //   payload: {
    //     playerId: "lobbyController",
    //     gameId: gameId,
    //     status: "ended",
    //     gameLog: game.gameLog, // Include game history
    //   },
    // });
    // setTimeout(() => {
    //  // game.gameRelay.shutdown();
    //  this.gameController.endGame(gameId);
    // }, 3000);
    lobby.removeGame(gameId);

    return {
      type: "lobby",
      action: "refreshLobby",
      payload: {
        lobbyPlayers: lobby.getLobbyPlayers(),
        lobbyGames: lobby.getLobbyGames(),
      },
      broadcast: true,
    };
  }

  refreshLobby({ lobby }) {
    console.log("Refreshing lobby...");

    this.relayManager.relays.get(lobby.lobbyId).broadcastResponse({
      type: "lobby",
      action: "refreshLobby",
      payload: {
        lobbyPlayers: lobby.getLobbyPlayers(),
        lobbyGames: lobby.getLobbyGames(),
      },
    });

    // lobbyRelay.broadcastResponse({
    //   type: "lobby",
    //   action: "refreshLobby",
    //   payload: {
    //     lobbyPlayers: lobby.getLobbyPlayers(),
    //     lobbyGames: lobby.getLobbyGames(),
    //   },
    // });
  }
}

module.exports = LobbyController;
