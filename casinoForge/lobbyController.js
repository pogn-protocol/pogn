const Lobby = require("./lobby");
const Player = require("./player");

class LobbyController {
  constructor(gameController, relayManager) {
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
    };
    this.messages = [];
  }

  processMessage(message) {
    console.log("Preserved messages", this.messages);
    console.log("Processing lobby message:", message);

    const { payload } = message;
    const { lobbyId, action, playerId, gameId, gameType } = payload || {};

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
    this.relayManager.gameEnded(gameId);
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

    this.gameController.startGame(game);
    console.log(this.gameController.activeGames);
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
      },
      broadcast: true,
    };
  }

  async createGame({ lobby, playerId, gameType }) {
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

      const game = this.gameController.createGame(
        gameType,
        true,
        lobby.lobbyId
      );
      console.log("Game created:", game);

      try {
        const relay = await this.gameController.createRelay(
          gameType,
          game.gameId,
          this.gamePorts,
          lobby.lobbyId
        );

        game.relayId = relay.id;
        game.wsAddress = relay.wsAddress;

        console.log(
          "GameRelay initialized:",
          this.relayManager.relays.get(game.relayId)
        );
        console.log("Relay WebSocket address:", game.wsAddress);
      } catch (error) {
        console.error("❌ Failed to create relay for the game:", error.message);
        return {
          type: "error",
          payload: { message: "Relay creation failed." },
        };
      }

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

    this.relayManager.relays.get(lobby.lobbyId).broadcastResponse({
      payload: {
        type: "lobby",
        action: "refreshLobby",
        lobbyPlayers: lobby.getLobbyPlayers(),
        lobbyGames: lobby.getLobbyGames(),
      },
    });
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

  createLobby(lobbyId, ports) {
    console.log("Creating lobby:", lobbyId);
    if (this.lobbies.has(lobbyId)) {
      console.warn(`Lobby ${lobbyId} already exists.`);
      return {
        type: "error",
        payload: { message: `Lobby ${lobbyId} already exists.` },
      };
    }

    this.lobbies.set(lobbyId, new Lobby(lobbyId));
    console.log("Lobbies", this.lobbies);
    this.relayManager.createRelays([
      {
        type: "lobby",
        id: lobbyId,
        options: {
          ports: ports,
          controller: this,
        },
      },
    ]);
    return {
      payload: {
        type: "lobby",
        action: "refreshLobby",
        lobbyId: lobbyId,
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
      "c0ce18d4d92c90d3f82f0d8c9108f6fc9933c5b867bc5c9e7dc35082fba2f3a4",
      "df08f70cb2f084d2fb787af232bbb18873e7d88919854669e4e691ead9baa4f4",
    ];
    this.joinLobby({ lobby, playerId: players[0] });
    this.joinLobby({ lobby, playerId: players[1] });
    console.log("Creating test games...");

    let game1, game2;

    if (lobbyId === "lobby1") {
      game1 = this.gameController.createGame(
        "odds-and-evens",
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
        "odds-and-evens",
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
      this.gameController.startGame(game2);

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
      console.error("❌ Error creating relays for test games:", error.message);
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
