const Lobby = require("./lobby");
const Player = require("./player"); // Import the Player class

class LobbyController {
  constructor(gameController, relayManager) {
    this.gameController = gameController; // Use the shared instance
    this.relayManager = relayManager; // ✅ Store the RelayManager instance
    this.lobbies = new Map();
    //make default lobby
    //put lobby in map
    this.lobbies.set("default", new Lobby("default"));

    // setInterval(() => {
    //   this.testEmitter();
    // }, 10000);

    this.messageHandlers = {
      login: (data) => this.joinLobby(data),
      createNewGame: (data) => this.createGame(data),
      joinGame: (data) => this.joinLobbyPlayerToGame(data),
      startGame: (data) => this.startGame(data), // ✅ Cleaner signature
      refreshLobby: (data) => this.refreshLobby(data),
      gameEnded: (data) => this.gameEnded(data),
    };
    this.messages = [];
  }

  processMessage(message) {
    console.log("Preserved messages", this.messages);
    console.log("Processing lobby message:", message);

    const { lobbyId, action, payload } = message;
    const { playerId, gameId, gameType } = payload || {};

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
    console.log("lobby", lobby);
    return this.messageHandlers[action]({
      lobby,
      playerId,
      gameId,
      gameType,
    });
  }

  gameEnded({ lobby, gameId }) {
    console.log("Game ended shutting relay down for:", gameId);
    //remove game from lobby
    this.relayManager.gameEnded(gameId);
    //this.relayManager.relays.get(lobby.lobbyId).relayConnections.delete(gameId);
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

  startGame({ lobby, gameId }) {
    console.log("Starting game:", gameId);
    const game = lobby.getGame(gameId);
    if (!game) {
      return {
        type: "error",
        payload: { message: `Game with ID ${gameId} not found in the lobby.` },
      };
    }

    //lobby.removeGame(gameId); // Remove from lobby

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
        action: "refreshLobby",
        payload: {
          //game: gameDetails,
          lobbyPlayers: lobby.getLobbyPlayers(),
          lobbyGames: lobby.getLobbyGames(),
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

  createGame({ lobby, playerId, gameType }) {
    console.log(playerId, " creating ", gameType, " game.");
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

    // const game = this.gameController.createGame(gameType, {
    //   players,
    //   ports,
    //   controller: this.gameController,
    //   lobbyId: lobby.lobbyId,
    // });

    const game = this.gameController.createGame(gameType, true, lobby.lobbyId);

    console.log("gameRelay", this.relayManager.relays.get(game.relayId));
    console.log(
      "relay wsAddress",
      this.relayManager.relays.get(game.relayId)?.wsAddress
    );
    //this.relayManager.connectRelayToWS(lobby.lobbyId, game.relay.wsAddress);
    setTimeout(() => {
      console.log("gameRelay", this.relayManager.relays.get(game.relayId));
      console.log(
        "relay wsAddress",
        this.relayManager.relays.get(game.relayId).wsAddress
      );
      console.log("sending test message");
      console.log("lobby", lobby);
      console.log(this.relayManager.relays.get(lobby.lobbyId));
      console.log("game", game);
      // this.relayManager.relays
      //   .get(lobby.lobbyId)
      //   .relayConnections.get(game.gameId)
      //   .sendMessage({
      //     type: "game",
      //     action: "test",
      //     id: lobby.lobbyId,
      //     payload: {
      //       lobbyId: lobby.lobbyId,
      //       gameId: game.gameId,
      //       message: "test message",
      //     },
      //   });
    }, 10000);

    console.log("game", game);
    console.log("lobby", lobby);
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

  // test(playerId) {
  //   const lobby = this.lobbies.get("default");
  //   console.log(`Player ${playerId} is reconnecting or joining a game.`);
  //   let testGame = lobby
  //     .getLobbyGames()
  //     .find((game) => game.status === "joining");
  //   console.log("Lobby Games", lobby.getLobbyGames());
  //   console.log("testGame", testGame);
  //   if (!testGame) {
  //     lobby.games = [];
  //     lobby.players = [];
  //     console.log("No available games. Creating a new game.");
  //     this.createGame({
  //       lobby: lobby,
  //       gameType: "odds-and-evens",
  //       playerId: playerId,
  //     });
  //     console.log(
  //       "Created a new game and added to lobby:",
  //       lobby.getLobbyGames()
  //     );
  //     console.log("lobby.games", lobby.games);
  //     lobby.games[0].status = "test";
  //     testGame = lobby.games[0];
  //     console.log("testGame", testGame);
  //   } else {
  //     console.log(`Player ${playerId} is joining an existing game:`, testGame);
  //   }
  //   this.joinLobby({
  //     lobby: lobby,
  //     playerId: playerId,
  //   });

  //   console.log("joining player to game", testGame.gameId, playerId);
  //   this.processMessage({
  //     lobbyId: "default",
  //     action: "joinGame",
  //     payload: {
  //       gameId: testGame.gameId,
  //       playerId,
  //     },
  //   });
  //   console.log("joined player to game", testGame.gameId, playerId);
  //   testGame = lobby.getGameDetails(testGame.gameId);
  //   lobby.games[0].status = "joining";

  //   console.log("testGame", testGame);
  //   if (Object.keys(testGame.players).length === testGame.instance.maxPlayers) {
  //     console.log(`Game ${testGame.gameId} is now full. Starting game.`);
  //     lobby.games[0].status = "readyToStart";
  //   }
  //   console.log("sending refresh lobby");
  //   return {
  //     type: "lobby",
  //     action: "refreshLobby",
  //     payload: {
  //       lobbyPlayers: lobby.getLobbyPlayers(),
  //       lobbyGames: lobby.getLobbyGames(),
  //     },
  //     broadcast: true,
  //   };
  // }

  //

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
  }

  //create two lobby games with 2 players each ids:
  //     Player 1: d06b8035a89b7eed34b641f8ba1c893d330bd5486308ee649c1884bd69c4ba34
  // Player 2: 54ec4f8be6db8a27372d257d95310685bc1c7dc59c26f3a4c0a64c10b6e0b9eb

  testGames() {
    const lobby = this.lobbies.get("default");
    if (lobby.getLobbyGames().length > 0) {
      console.log("Test games already created.");
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
    const players = [
      "d06b8035a89b7eed34b641f8ba1c893d330bd5486308ee649c1884bd69c4ba34",
      "54ec4f8be6db8a27372d257d95310685bc1c7dc59c26f3a4c0a64c10b6e0b9eb",
    ];
    console.log("Creating test games...");
    const game1 = this.gameController.createGame(
      "odds-and-evens",
      true,
      lobby.lobbyId,
      "firstGame"
    );
    const game2 = this.gameController.createGame(
      "odds-and-evens",
      true,
      lobby.lobbyId,
      "secondGame"
    );
    // game1.id = "firstGame";
    // game2.id = "secondGame";
    lobby.addGame(game1);
    lobby.addGame(game2);

    // Add players to the lobby
    players.forEach((playerId) => {
      if (!lobby.existsInLobby(playerId)) {
        lobby.players.push(new Player({ playerId, inLobby: true }));
      }
    });

    game1.players.set(players[0], { playerId: players[0] });
    game1.players.set(players[1], { playerId: players[1] });
    game1.status = "readyToStart";
    game1.logAction(`${players[0]} created game.`);
    game1.logAction(`${players[1]} joined game.`);

    game2.players.set(players[0], { playerId: players[0] });
    game2.players.set(players[1], { playerId: players[1] });
    game2.status = "readyToStart";
    game2.logAction(`${players[0]} created game.`);

    console.log("Test games created:", game1, game2);
    console.log("Lobby games", lobby.getLobbyGames());

    this.gameController.startGame(game1);
    this.gameController.startGame(game2);

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

  // lobbyRelay.broadcastResponse({
  //   type: "lobby",
  //   action: "refreshLobby",
  //   payload: {
  //     lobbyPlayers: lobby.getLobbyPlayers(),
  //     lobbyGames: lobby.getLobbyGames(),
  //   },
  // });
  // }
}

module.exports = LobbyController;
