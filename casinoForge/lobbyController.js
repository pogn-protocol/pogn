const Lobby = require("./lobby");
const Player = require("./player");

class LobbyController {
  constructor({ gameController, relayManager, lobbyPorts = [], lobbyWsUrl }) {
    this.gameController = gameController;
    this.relayManager = relayManager;
    this.lobbies = new Map();

    this.messageHandlers = {
      login: (data) => this.joinLobby(data),
      createNewGame: (data) => this.createGame(data),
      joinGame: (data) => this.joinLobbyPlayerToGame(data),
      startGame: (data) => this.startGame(data),
      refreshLobby: (data) => this.refreshLobby(data),
      gameEnded: (data) => this.gameEnded(data),
      testGames: (data) => this.testGames(data),
      createLobby: (data) => this.createLobby(data),
    };
    this.messages = [];
    this.ports = lobbyPorts;
    this.lobbyWsUrl = lobbyWsUrl;
  }

  async processMessage(message) {
    try {
      console.log("Processing lobby message:", message);
      this.messages.push(message);
      console.log(
        "Preserved lobbyController.processedMessage message. Preserved messages",
        this.messages
      );

      const { payload } = message;
      const { lobbyId, action, playerId, gameId, gameType } = payload || {};

      const lobby = this.lobbies.get(lobbyId);
      if (!lobby && action !== "createLobby") {
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

      console.log("lobby", lobby);
      let response = await this.messageHandlers[action]({
        lobby,
        playerId,
        gameId,
        gameType,
        lobbyId,
      });

      console.log("LobbyController response", response);

      if (!response.payload?.lobbyId) {
        response.payload.lobbyId = lobbyId;
      }
      if (!response.payload?.playerId) {
        response.payload.playerId = playerId;
      }
      return response;
    } catch (error) {
      console.error("Error processing message in LobbyController:", error);
      return {
        type: "error",
        payload: { message: "Failed to process message." },
      };
    }
  }

  gameEnded({ lobby, gameId }) {
    console.log("Game ended shutting relay down for:", gameId);
    this.relayManager.gameEnded(gameId);
    const game = lobby.getGame(gameId);
    game.lobbyStatus = "ended";
    console.log("Game ended:", game);

    lobby.removeGame(gameId);
    return {
      payload: {
        type: "lobby",
        lobbyId: lobby.lobbyId,
        action: "refreshLobby",
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

    //let gameStarted = this.gameController.startGame(game);
    game.lobbyStatus = "started";
    console.log("Game started:", game);
    this.gameController.activeGames.set(game.gameId, game);
    console.log(
      "Added started game to active games:",
      this.gameController.activeGames
    );
    let gameDetails = game.getGameDetails();
    console.log("Game started:", gameDetails);
    return {
      payload: {
        type: "lobby",
        action: "refreshLobby",
        lobbyId: lobby.lobbyId,
        lobbyPlayers: lobby.getLobbyPlayers(),
        lobbyGames: lobby.getLobbyGames(),
      },
      broadcast: true,
    };
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
      inLobby: true,
    });
    lobby.players.push(player);

    console.log(`Player ${playerId} joined the lobby.`);
    console.log("Lobby Players", lobby.getLobbyPlayers());
    console.log("Lobby Games", lobby.getLobbyGames());

    return {
      payload: {
        type: "lobby",
        action: "refreshLobby",
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

    game.players.set(playerId, { playerId });
    console.log(
      `${playerId} was added to the game. Current players:`,
      game.players
    );

    if (game.players.size >= game.instance.maxPlayers) {
      game.lobbyStatus = "readyToStart";
      console.log("The game is ready to start.");
    } else if (game.players.size >= game.instance.minPlayers) {
      game.lobbyStatus = "canStart";
      console.log("The game can start.");
    }

    return {
      payload: {
        type: "lobby",
        action: "refreshLobby",
        lobbyPlayers: lobby.getLobbyPlayers(),
        lobbyGames: lobby.getLobbyGames(),
        lobbyId: lobby.lobbyId,
      },
      broadcast: true,
    };
  }

  async createGame({ lobby, playerId, gameType, gameId }) {
    try {
      console.log(playerId, "creating", gameType, "game.");

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

      let game = this.gameController.createGame(
        gameType,
        false,
        lobby.lobbyId,
        gameId
      );
      console.log("Game created:", game);
      if (!game) {
        return {
          type: "error",
          payload: { message: "Game creation failed." },
        };
      }

      const [relay] = await this.relayManager.createRelays([
        {
          type: "game",
          id: game.gameId,
          options: {
            ports: this.gameController.gamePorts,
            controller: this.gameController,
            lobbyId: lobby.lobbyId,
          },
        },
      ]);
      console.log("Relay created:", relay);
      if (!relay || relay.length === 0) {
        throw new Error("New game relay creation failed.");
      }

      game.relayId = relay.id;
      game.wsAddress = relay.wsAddress;

      console.log(
        "GameRelay initialized:",
        this.relayManager.relays.get(game.relayId)
      );
      console.log("Created", game);

      setTimeout(() => {
        const gameRelay = this.relayManager.relays.get(game.relayId);
        if (gameRelay) {
          console.log("Sending test message via relay:", gameRelay);
          console.log(
            "Relay WebSocket address (post-init):",
            gameRelay.wsAddress
          );
        } else {
          console.warn(`⚠️ GameRelay with ID ${game.relayId} not found.`);
        }

        const lobbyRelay = this.relayManager.relays.get(lobby.lobbyId);
        if (lobbyRelay) {
          console.log("Lobby relay found:", lobbyRelay);
          console.log("Sending test message to lobby relay.");
          try {
            lobbyRelay.relayConnections.get(game.gameId)?.sendMessage({
              relayId: game.gameId,
              payload: {
                type: "relayConnector",
                action: "lobbyRelayToGameRelay",
                relayId: lobby.lobbyId,
                gameId: game.gameId,
                message: "lobbyConntroller lobby relay to game relay",
              },
            });
          } catch (e) {
            console.error("❌ Failed to send test message:", e.message);
          }
        } else {
          console.warn(
            `⚠️ No lobby relay found for lobby ID ${lobby.lobbyId}.`
          );
        }
      }, 5000);

      console.log("Game object:", game);
      console.log("Lobby object:", lobby);
      lobby.addGame(game);
      game.logAction(`${playerId} created game.`);
      const games = lobby.getLobbyGames();
      const players = lobby.getLobbyPlayers();
      console.log("Lobby games:", games, "Lobby players:", players);

      return {
        payload: {
          type: "lobby",
          action: "refreshLobby",
          lobbyId: lobby.lobbyId,
          lobbyPlayers: players,
          lobbyGames: games,
        },
        broadcast: true,
      };
    } catch (error) {
      console.error("❌ Error in createGame:", error.message);
      return {
        type: "error",
        payload: { message: "Failed to create game." },
      };
    }
  }

  refreshLobby({ lobby }) {
    console.log("Refreshing lobby...");

    return {
      payload: {
        type: "lobby",
        action: "refreshLobby",
        lobbyId: lobby.lobbyId,
        lobbyPlayers: lobby.getLobbyPlayers(),
        lobbyGames: lobby.getLobbyGames(),
      },
      broadcast: true,
    };
  }

  //create two lobby games with 2 players each ids:
  //     Player 1: d06b8035a89b7eed34b641f8ba1c893d330bd5486308ee649c1884bd69c4ba34
  // Player 2: 54ec4f8be6db8a27372d257d95310685bc1c7dc59c26f3a4c0a64c10b6e0b9eb

  // testGames(lobbyId) {
  //   console.log("lobbyId", lobbyId);
  //   const lobby = this.lobbies.get(lobbyId);
  //   if (lobby.getLobbyGames().length > 0) {
  //     console.log("Test games already created.");
  //     return {
  //       type: "lobby",
  //       action: "refreshLobby",
  //       payload: {
  //         lobbyPlayers: lobby.getLobbyPlayers(),
  //         lobbyGames: lobby.getLobbyGames(),
  //       },
  //       broadcast: true,
  //     };
  //   }
  //   const players = [
  //     "dcf52a360ff78e1ec864fa635ea21c81dbc2ef297a788ac9a91664a0ef95b7c1",
  //     "37b71d6b946b60bdaf3fdd5982e8b0a1886841b5859347637a7b07b81a933a4e",
  //   ];
  //   console.log("Creating test games...");

  //   if (lobbyId === "lobby1") {
  //     const game1 = this.gameController.createGame(
  //       "odds-and-evens",
  //       true,
  //       lobby.lobbyId,
  //       "firstGame"
  //     );
  //     const game2 = this.gameController.createGame(
  //       "odds-and-evens",
  //       true,
  //       lobby.lobbyId,
  //       "secondGame"
  //     );
  //   } else {
  //     const game1 = this.gameController.createGame(
  //       "odds-and-evens",
  //       true,
  //       lobby.lobbyId,
  //       "thirdGame"
  //     );
  //     const game2 = this.gameController.createGame(
  //       "odds-and-evens",
  //       true,
  //       lobby.lobbyId,
  //       "fourthGame"
  //     );
  //   }
  //   // game1.id = "firstGame";
  //   // game2.id = "secondGame";
  //   lobby.addGame(game1);
  //   lobby.addGame(game2);

  //   // Add players to the lobby
  //   players.forEach((playerId) => {
  //     if (!lobby.existsInLobby(playerId)) {
  //       lobby.players.push(new Player({ playerId, inLobby: true }));
  //     }
  //   });

  //   game1.players.set(players[0], { playerId: players[0] });
  //   game1.players.set(players[1], { playerId: players[1] });
  //   game1.lobbyStatus = "readyToStart";
  //   game1.logAction(`${players[0]} created game.`);
  //   game1.logAction(`${players[1]} joined game.`);

  //   game2.players.set(players[0], { playerId: players[0] });
  //   game2.players.set(players[1], { playerId: players[1] });
  //   game2.lobbyStatus = "readyToStart";
  //   game2.logAction(`${players[0]} created game.`);

  //   console.log("Test games created:", game1, game2);
  //   console.log("Lobby games", lobby.getLobbyGames());

  //   this.gameController.startGame(game1);
  //   this.gameController.startGame(game2);

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

  async createLobby({ lobbyId, ports }) {
    console.log("Creating lobby:", lobbyId);
    if (this.lobbies.has(lobbyId)) {
      console.warn(`Lobby ${lobbyId} already exists.`);
      return {
        type: "error",
        payload: { message: `Lobby ${lobbyId} already exists.` },
      };
    }

    let newLobby = new Lobby({ lobbyId });
    console.log("Lobbies", this.lobbies);
    console.log("sharedServer", this.relayManager.sharedServer);
    console.log("sharedPortMode", this.relayManager.sharedPortMode);
    let [newLobbyRelay] = await this.relayManager.createRelays([
      {
        type: "lobby",
        id: lobbyId,
        options: {
          //ports: ports || this.ports || null,
          // sharedServer: this.relayManager.sharedServer,
          controller: this,
        },
      },
    ]);

    if (!newLobbyRelay.wsAddress) {
      console.error("Failed to create lobby relay. No WebSocket address.");
      return {
        type: "error",
        payload: { message: "Failed to create lobby relay." },
      };
    }
    console.log("newLobbyRelay", newLobbyRelay);
    newLobby.relay = newLobbyRelay;
    newLobby.wsAddress = newLobbyRelay.wsAddress;
    newLobby.relayId = newLobbyRelay.id;

    this.lobbies.set(lobbyId, newLobby);

    console.log("Lobby created:", newLobby);
    console.log(this.lobbies);
    return {
      relayId: newLobbyRelay.id,
      payload: {
        type: "lobby",
        action: "newLobby",
        lobbyId: lobbyId,
        lobbyAddress: newLobbyRelay.wsAddress,
        lobbyPlayers: this.lobbies.get(lobbyId).getLobbyPlayers(),
        lobbyGames: this.lobbies.get(lobbyId).getLobbyGames(),
      },
      broadcast: true,
    };
  }

  async testGames(lobbyId) {
    console.log("lobbyId", lobbyId);
    const lobby = this.lobbies.get(lobbyId);
    let lobbyGames = lobby.getLobbyGames();
    console.log("lobbyGames", lobbyGames);

    console.log("lobbyGames length", lobbyGames.length);
    if (lobbyGames.length > 0 && lobby.getLobbyPlayers().length > 0) {
      console.log("Test games already created.");
      return {
        payload: {
          type: "lobby",
          action: "refreshLobby",
          lobbyId: lobbyId,
          lobbyPlayers: lobby.getLobbyPlayers(),
          lobbyGames: lobby.getLobbyGames(),
        },
        broadcast: true,
      };
    }

    const players = [
      "be7c4cf8b9db6950491f2de3ece4668a1beb93972082d021256146a2b4ae1348",
      "df08f70cb2f084d2fb787af232bbb18873e7d88919854669e4e691ead9baa4f4",
    ];
    this.joinLobby({ lobby, playerId: players[0] });
    this.joinLobby({ lobby, playerId: players[1] });
    console.log("Creating test games...");

    let game1, game2;

    if (lobbyId === "lobby1") {
      game1 = this.gameController.createGame(
        "rock-paper-scissors",
        true,
        lobbyId,
        "firstGame"
      );
      game2 = this.gameController.createGame(
        "odds-and-evens",
        true,
        lobbyId,
        "secondGame"
      );
    }

    if (lobbyId === "lobby2") {
      game1 = this.gameController.createGame(
        "rock-paper-scissors",
        true,
        lobbyId,
        "thirdGame"
      );
      game2 = this.gameController.createGame(
        "odds-and-evens",
        true,
        lobbyId,
        "fourthGame"
      );
    }

    this.lobbies.get(lobbyId).games.set(game1.gameId, game1);
    this.lobbies.get(lobbyId).games.set(game2.gameId, game2);

    try {
      const gameRelay1 = await this.gameController.createGameRelay(
        game1.gameId,
        game1.lobbyId
      );
      const gameRelay2 = await this.gameController.createGameRelay(
        game2.gameId,
        game2.lobbyId
      );

      if (!gameRelay1 || !gameRelay2) {
        throw new Error("One or both game relays failed to initialize.");
      }

      this.joinLobbyPlayerToGame({
        lobby,
        gameId: game1.gameId,
        playerId: players[0],
      });
      this.joinLobbyPlayerToGame({
        lobby,
        gameId: game1.gameId,
        playerId: players[1],
      });
      this.joinLobbyPlayerToGame({
        lobby,
        gameId: game2.gameId,
        playerId: players[0],
      });
      this.joinLobbyPlayerToGame({
        lobby,
        gameId: game2.gameId,
        playerId: players[1],
      });
      console.log("gameRelay1", gameRelay1);
      console.log("gameRelay2", gameRelay2);

      game1.lobbyStatus = "readyToStart";
      game2.lobbyStatus = "readyToStart";
      game1.wsAddress = gameRelay1.wsAddress;
      game2.wsAddress = gameRelay2.wsAddress;
      game1.relayId = gameRelay1.id;
      game2.relayId = gameRelay2.id;
      console.log("game1", game1);
      console.log("game2", game2);
      lobby.addGame(game1);
      lobby.addGame(game2);
      console.log("lobby", lobby);

      this.lobbies.set(lobbyId, lobby);
      this.gameController.startGame(game1);
      game1.lobbyStatus = "started";
      this.gameController.startGame(game2);
      game2.lobbyStatus = "started";

      console.log("Lobbies:", Array.from(this.lobbies.entries()));
      console.log("Test games created:", game1, game2);
      console.log("Lobby", lobbyId);
      console.log("Lobby games", lobby.getLobbyGames());
      console.log("Lobby Players", lobby.getLobbyPlayers());

      return {
        payload: {
          type: "lobby",
          action: "refreshLobby",
          lobbyId: lobby.lobbyId,
          lobbyPlayers: lobby.getLobbyPlayers(),
          lobbyGames: lobby.getLobbyGames(),
        },
        broadcast: true,
      };
    } catch (error) {
      console.error("❌ Error creating test games:", error.message);
    }
  }

  // Helper function to generate a standardized lobby response
  generateLobbyResponse(lobby) {
    return {
      payload: {
        type: "lobby",
        action: "refreshLobby",
        lobbyPlayers: lobby.getLobbyPlayers(),
        lobbyGames: lobby.getLobbyGames(),
      },
      broadcast: true,
    };
  }
}

module.exports = LobbyController;
