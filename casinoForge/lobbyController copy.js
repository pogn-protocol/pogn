const Lobby = require("./lobby");
const Player = require("./player");
const { checkLobbyControllerPermissions } = require("./permissions");
const {
  SimplePool,
  getPublicKey,
  finalizeEvent,
  nip19,
} = require("nostr-tools");
const { useWebSocketImplementation } = require("nostr-tools/pool");

// 👇 Required for Node.js
useWebSocketImplementation(WebSocket);

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
      gameInvite: (data) => this.gameInvite(data),
      postGameResult: (data) => this.postGameResult(data),
    };
    this.messages = [];
    this.ports = lobbyPorts;
    this.lobbyWsUrl = lobbyWsUrl;
    this.notePostGuards = new Map(); // memory-only guard
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
      const { lobbyId, action, playerId, gameId, gameType, params } =
        payload || {};

      const permission = checkLobbyControllerPermissions(message, this.lobbies);
      if (!permission.allowed) {
        console.warn(
          "⛔ LobbyController permission denied:",
          permission.reason
        );
        return {
          payload: {
            type: "error",
            message: permission.reason,
            action: "permissionDenied",
            lobbyId,
          },
        };
      }

      const lobby = this.lobbies.get(lobbyId);
      if (!lobby && action !== "createLobby") {
        console.warn(`⚠️ Lobby ${lobbyId} not found.`);
        return {
          payload: { type: "error", message: `Lobby ${lobbyId} not found.` },
        };
      }

      if (!this.messageHandlers[action]) {
        console.warn(`⚠️ Unknown action: ${action}`);
        return {
          payload: { type: "error", message: `Unknown action: ${action}` },
        };
      }

      console.log("lobby", lobby);
      let response = await this.messageHandlers[action]({
        lobby,
        playerId,
        gameId,
        gameType,
        lobbyId,
        params,
      });

      console.log("LobbyController response", response);

      // if (!response?.payload?.lobbyId) {
      //   response.payload.lobbyId = lobbyId;
      // }
      // if (!response?.payload?.playerId) {
      //   response.payload.playerId = playerId;
      // }
      return response;
    } catch (error) {
      console.error("Error processing message in LobbyController:", error);
      return {
        type: "error",
        payload: { message: "Failed to process message." },
      };
    }
  }

  async postGameResult({ playerId, lobbyId, params }) {
    const { gameSummary, profile } = params || {};
    const key = `${playerId}-${lobbyId}`;
    const now = Date.now();
    const lastPost = this.notePostGuards.get(key);

    if (lastPost && now - lastPost < 5000) {
      console.warn(`🛑 Prevented rapid repost from ${playerId} in ${lobbyId}`);
      return {
        payload: {
          type: "lobby",
          action: "postGameResultError",
          message: "You're posting too fast. Please wait a moment.",
          lobbyId,
          playerId,
        },
      };
    }

    this.notePostGuards.set(key, now);

    try {
      const nsec = process.env.POGNGAMEHUB;
      if (!nsec) throw new Error("Missing POGNGAMEHUB private key in .env");

      const { type, data: sk } = nip19.decode(nsec);
      if (type !== "nsec") throw new Error("Invalid nsec key format");

      const pk = getPublicKey(sk);

      const content = `🏆 Game Summary from ${
        profile?.name || playerId.slice(0, 12)
      }:\n\n${gameSummary}`;

      const event = finalizeEvent(
        {
          kind: 1,
          pubkey: pk,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content,
        },
        sk
      );

      const relays = [
        "wss://relay.damus.io",
        "wss://relay.snort.social",
        "wss://nos.lol",
        "wss://strfry.iris.to",
        "wss://relay.nostr.band",
      ];

      const pool = new SimplePool();

      // Use Promise.any() and the correct pool.publish usage
      try {
        await Promise.any(pool.publish(relays, event));
        console.log("✅ Published to at least one relay");
      } catch (err) {
        console.warn("❌ Failed to publish to any relay", err);
        throw new Error("Could not publish to any relay.");
      }

      return {
        payload: {
          type: "lobby",
          action: "postGameResultConfirmed",
          playerId,
          status: "success",
          message: "Game result posted to POGN Gamehub account on nostr.",
        },
        //private: playerId,
      };
    } catch (err) {
      console.error("❌ Failed to post game result:", err.message);
      return {
        payload: {
          type: "error",
          action: "postGameResultFailed",
          message: err.message,
          playerId,
        },
        private: playerId,
      };
    }
  }
  gameInvite({ lobby, gameId, playerId }) {
    console.log("Game invite:", gameId, playerId);
    const game = lobby.getGame(gameId);
    if (!game) {
      return {
        payload: {
          type: "gameInvite",
          action: "gameInviteError",
          message: `Game with ID ${gameId} not found.`,
        },
      };
    }
    console.log("Game invite:", game);
    //get joined player check if playerId
    return {
      payload: {
        type: "gameInvite",
        action: "inviteVerified",
        gameId: game.gameId,
        gameType: game.instance.gameType,
        gameName: game.instance.gameName,
        players: game.getJoinedPlayerIds(),
        gameDetails: game.getGameDetails(),
        allowedPlayers: game.allowedPlayers,
      },
      //  broadcast: true,
    };
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
      return {
        payload: {
          type: "lobby",
          action: "refreshLobby",
          lobbyPlayers: lobby.getLobbyPlayers(),
          lobbyGames: lobby.getLobbyGames(),
          lobbyId: lobby.lobbyId,
          private: playerId,
        },
        //broadcast: true,
      };
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
        lobbyId: lobby.lobbyId,
        private: playerId,
      },
      broadcast: true,
    };
  }

  joinLobbyPlayerToGame({ lobby, gameId, playerId }) {
    console.log(
      "Joining playerId",
      playerId,
      "to game",
      gameId,
      " in lobby",
      lobby
    );
    const game = lobby.getGame(gameId);
    if (!game) {
      return {
        type: "error",
        payload: { message: `Game with ID ${gameId} not found.` },
      };
    }
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

    if (game.isPrivate && !game.allowedPlayers.includes(playerId)) {
      console.log(
        `Player ${playerId} is not allowed to join this private game.`
      );
      return {
        type: "error",
        payload: {
          message: `PRIVATE GAME: Player ${playerId} is not invited.`,
        },
      };
    }

    game.players.set(playerId, { playerId });
    console.log(
      `${playerId} was added to the game. Current players:`,
      game.players
    );

    if (game.players.size >= game.instance.maxPlayers) {
      game.lobbyStatus = "readyToS9db6950491f2de3ece4668a1beb9397208tart";
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

  async createGame({ lobby, playerId, gameType, gameId, params }) {
    try {
      console.log(playerId, "creating", gameType, "game.");

      if (!this.gameController.customGames[gameType]) {
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

      console.log("params", params);
      if (params?.private && params?.allowedPlayers) {
        console.log("Created private game:", params.private);
        console.log("Allowed players:", params.allowedPlayers);
        game.isPrivate = params.private;
        game.allowedPlayers = params.allowedPlayers;
      }

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

  async initGames(gameConfigs = []) {
    try {
      for (const config of gameConfigs) {
        const {
          gameType,
          gameId,
          lobbyId,
          isPrivate = false,
          allowedPlayers = [],
          autoJoin = [],
          autoStart = false,
        } = config;

        console.log(`Creating game ${gameId} in lobby ${lobbyId}`);

        const game = this.gameController.createGame(
          gameType,
          true,
          lobbyId,
          gameId
        );

        game.isPrivate = isPrivate;
        game.allowedPlayers = allowedPlayers;
        //check if lobbyId exists if not create it
        if (!this.lobbies.has(lobbyId)) {
          console.log(`Creating lobby ${lobbyId} for game ${gameId}`);
          await this.createLobby({ lobbyId });
        }
        if (!this.lobbies.has(lobbyId)) {
          console.error(`Failed to create lobby ${lobbyId} for game ${gameId}`);
          throw new Error(
            `Failed to create lobby ${lobbyId} for game ${gameId}`
          );
        }
        //  this.lobbies.get(lobbyId)?.games.set(game.gameId, game);
        this.lobbies.get(lobbyId)?.addGame(game); // <- do this early, not after relay

        const relay = await this.gameController.createGameRelay(
          game.gameId,
          game.lobbyId
        );

        if (!relay) throw new Error(`Failed to create relay for ${gameId}`);

        game.wsAddress = relay.wsAddress;
        game.relayId = relay.id;

        console.log("autojoin", autoJoin);
        if (autoJoin.length > 0) {
          for (const playerId of autoJoin) {
            this.joinLobbyPlayerToGame({
              lobby: this.lobbies.get(lobbyId),
              gameId,
              playerId,
            });
          }
        }

        console.log("autostart", autoStart);
        if (autoStart) {
          console.log("Starting game automatically...");
          game.lobbyStatus = "canStart";
          let startRes = this.gameController.startGame(game);
          console.log("Game started:", startRes);
          game.lobbyStatus = "started";
        }

        this.lobbies.get(lobbyId)?.addGame(game);

        console.log(`✅ Created game ${gameId}`);
      }
      console.log("lobbies ", this.lobbies);

      console.log("✅ All test games initialized.");
    } catch (err) {
      console.error("❌ Error creating test games:", err.message);
    }
  }

  // async testGames() {
  //   const players = [
  //     "7385ee0c0287285560b3d6059741928dd40474afb6612ced5758663bd09d12eb",
  //     "df08f70cb2f084d2fb787af232bbb18873e7d88919854669e4e691ead9baa4f4",
  //   ];
  //   console.log("Creating test games...");

  //   let game1 = this.gameController.createGame(
  //     "rock-paper-scissors",
  //     true,
  //     "lobby1",
  //     "PrivateTestGame"
  //   );

  //   game1.isPrivate = true;
  //   game1.allowedPlayers = players;

  //   let game2 = this.gameController.createGame(
  //     "odds-and-evens",
  //     true,
  //     "lobby1",
  //     "secondGame"
  //   );

  //   let game3 = this.gameController.createGame(
  //     "rock-paper-scissors",
  //     true,
  //     "lobby2",
  //     "thirdGame"
  //   );
  //   let game4 = this.gameController.createGame(
  //     "odds-and-evens",
  //     true,
  //     "lobby2",
  //     "fourthGame"
  //   );

  //   this.lobbies.get("lobby1").games.set(game1.gameId, game1);
  //   this.lobbies.get("lobby1").games.set(game2.gameId, game2);
  //   this.lobbies.get("lobby2").games.set(game3.gameId, game3);
  //   this.lobbies.get("lobby2").games.set(game4.gameId, game4);

  //   console.log("Lobbies", this.lobbies);
  //   console.log("Creating test game relays...");
  //   try {
  //     const gameRelay1 = await this.gameController.createGameRelay(
  //       game1.gameId,
  //       game1.lobbyId
  //     );
  //     const gameRelay2 = await this.gameController.createGameRelay(
  //       game2.gameId,
  //       game2.lobbyId
  //     );

  //     const gameRelay3 = await this.gameController.createGameRelay(
  //       game3.gameId,
  //       game3.lobbyId
  //     );
  //     const gameRelay4 = await this.gameController.createGameRelay(
  //       game4.gameId,
  //       game4.lobbyId
  //     );

  //     if (!gameRelay1 || !gameRelay2) {
  //       throw new Error("One or both game relays failed to initialize.");
  //     }

  //     console.log(
  //       "Game relays created:",
  //       gameRelay1,
  //       gameRelay2,
  //       gameRelay3,
  //       gameRelay4
  //     );
  //     console.log("Joining players to games...");

  //     // this.joinLobbyPlayerToGame({
  //     //   lobby: this.lobbies.get("lobby1"),
  //     //   gameId: game1.gameId,
  //     //   playerId: players[0],
  //     // });
  //     // this.joinLobbyPlayerToGame({
  //     //   lobby: this.lobbies.get("lobby1"),
  //     //   gameId: game1.gameId,
  //     //   playerId: players[1],
  //     // });
  //     this.joinLobbyPlayerToGame({
  //       lobby: this.lobbies.get("lobby1"),
  //       gameId: game2.gameId,
  //       playerId: players[0],
  //     });
  //     this.joinLobbyPlayerToGame({
  //       lobby: this.lobbies.get("lobby1"),
  //       gameId: game2.gameId,
  //       playerId: players[1],
  //     });
  //     this.joinLobbyPlayerToGame({
  //       lobby: this.lobbies.get("lobby2"),
  //       gameId: game3.gameId,
  //       playerId: players[0],
  //     });
  //     this.joinLobbyPlayerToGame({
  //       lobby: this.lobbies.get("lobby2"),
  //       gameId: game3.gameId,
  //       playerId: players[1],
  //     });
  //     this.joinLobbyPlayerToGame({
  //       lobby: this.lobbies.get("lobby2"),
  //       gameId: game4.gameId,
  //       playerId: players[0],
  //     });
  //     this.joinLobbyPlayerToGame({
  //       lobby: this.lobbies.get("lobby2"),
  //       gameId: game4.gameId,
  //       playerId: players[1],
  //     });
  //     console.log("Players joined to games:", game1, game2, game3, game4);
  //     console.log("Starting games...");

  //     // game1.lobbyStatus = "readyToStart";
  //     game2.lobbyStatus = "readyToStart";
  //     game3.lobbyStatus = "readyToStart";
  //     game4.lobbyStatus = "readyToStart";

  //     game1.wsAddress = gameRelay1.wsAddress;
  //     game2.wsAddress = gameRelay2.wsAddress;
  //     game3.wsAddress = gameRelay3.wsAddress;
  //     game4.wsAddress = gameRelay4.wsAddress;

  //     game1.relayId = gameRelay1.id;
  //     game2.relayId = gameRelay2.id;
  //     game3.relayId = gameRelay3.id;
  //     game4.relayId = gameRelay4.id;

  //     console.log("game1", game1);
  //     console.log("game2", game2);
  //     console.log("game3", game3);
  //     console.log("game4", game4);

  //     console.log("Adding games to lobbies...");

  //     this.lobbies.get("lobby1").addGame(game1);
  //     this.lobbies.get("lobby1").addGame(game2);
  //     this.lobbies.get("lobby2").addGame(game3);
  //     this.lobbies.get("lobby2").addGame(game4);

  //     //this.lobbies.set("lobby1", this.lobbies.get("lobby1"));
  //     //this.lobbies.set("lobby2", this.lobbies.get("lobby2"));
  //     console.log("Lobbies:", Array.from(this.lobbies.entries()));
  //     console.log("Test games created:", game1, game2, game3, game4);
  //     //this.gameController.startGame(game1);
  //     //game1.lobbyStatus = "started";
  //     this.gameController.startGame(game2);
  //     game2.lobbyStatus = "started";
  //     this.gameController.startGame(game3);
  //     game3.lobbyStatus = "started";
  //     this.gameController.startGame(game4);
  //     game4.lobbyStatus = "started";

  //     console.log("Finished init Lobbies and games", this.lobbies);

  //     // return {
  //     //   payload: {
  //     //     type: "lobby",
  //     //     action: "refreshLobby",
  //     //     lobbyId: lobby.lobbyId,
  //     //     lobbyPlayers: lobby.getLobbyPlayers(),
  //     //     lobbyGames: lobby.getLobbyGames(),
  //     //   },
  //     //   broadcast: true,
  //     // };
  //   } catch (error) {
  //     console.error("❌ Error creating test games:", error.message);
  //   }
  // }

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
