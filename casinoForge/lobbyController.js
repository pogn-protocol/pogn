const BaseController = require("./baseController");
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
useWebSocketImplementation(WebSocket);
const {
  validateLobbyControllerResponse,
  validateLobbyControllerAction,
} = require("./validations");

class LobbyController extends BaseController {
  constructor({ gameController, relayManager, lobbyPorts = [], lobbyWsUrl }) {
    super({ type: "lobby", relayManager });
    this.gameController = gameController;
    this.lobbies = new Map();
    this.ports = lobbyPorts;
    this.lobbyWsUrl = lobbyWsUrl;
    this.notePostGuards = new Map();

    this.actionHandlers = {
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
      gameConfigs: (data) => this.gameConfigs(data),
    };
  }

  async processMessage(payload) {
    console.log("LobbyController processMessage", payload);
    let result = await super.processMessage(
      {
        ...payload,
        lobby: this.lobbies.get(payload.lobbyId),
      },
      [
        validateLobbyControllerAction,
        checkLobbyControllerPermissions,
        (p) => ({ lobby: this.lobbies.get(p.lobbyId) }),
        (p) => this.actionHandlers[p.action]?.(p),
      ]
    );
    console.log("Result after processing:", result);
    if (result.error) {
      console.warn("Validation error:", result.error, payload);
      return this.errorPayload(result.error, payload);
    }
    let validResult = validateLobbyControllerResponse(result);
    console.log("Validating result:", validResult);
    if (validResult.error) {
      console.error("Validation error:", validResult.error, result.payload);
      return this.errorPayload(validResult.error, result.payload);
    }
    return this.steralizePayload(
      result?.type || "lobby",
      result?.action,
      result
    );
  }

  gameConfigs({ gameTypes = [], lobbyId }) {
    console.log("Fetching game configs for types:", gameTypes, lobbyId);
    const configs = this.gameController.getGameConfigs(gameTypes);
    console.log("Game configs:", configs);
    return {
      action: "gameConfigs",
      gameConfigs: configs,
      private: true,
      checker: "conker noodles",
      lobbyId,
    };
  }

  startGame({ lobby, game }) {
    console.log("Starting game:", game.gameId);
    game.lobbyStatus = "started";
    this.gameController.activeGames.set(game.gameId, game);
    game.logAction("Game started.");
    return this.refreshLobby({ lobby });
  }

  gameEnded({ lobby, gameId }) {
    this.relayManager.gameEnded(gameId);
    const game = lobby.getGame(gameId);
    game.lobbyStatus = "ended";
    lobby.removeGame(gameId);
    return this.refreshLobby({ lobby });
  }

  joinLobby({ lobby, playerId }) {
    console.log("Joining lobby:", lobby, playerId);
    if (!lobby.players.has(playerId)) {
      lobby.players.set(playerId, new Player({ playerId, inLobby: true }));
    }
    return this.refreshLobby({ lobby, playerId });
  }

  joinLobbyPlayerToGame({ lobby, game, playerId, newLobbyStatus }) {
    console.log(
      "Joining player to game:",
      lobby,
      game,
      playerId,
      newLobbyStatus
    );
    game.players.set(playerId, { playerId });
    if (newLobbyStatus) game.lobbyStatus = newLobbyStatus;
    return this.refreshLobby({ lobby });
  }

  createGame({ lobby, playerId, gameType, gameId, params }) {
    const game = this.gameController.createGame(
      gameType,
      false,
      lobby.lobbyId,
      gameId
    );

    if (params?.private && params?.allowedPlayers) {
      game.isPrivate = params.private;
      game.allowedPlayers = params.allowedPlayers;
    }

    this.relayManager
      .createRelays([
        {
          type: "game",
          id: game.gameId,
          options: {
            ports: this.gameController.gamePorts,
            controller: this.gameController,
            lobbyId: lobby.lobbyId,
          },
        },
      ])
      .then(([relay]) => {
        game.relayId = relay.id;
        game.wsAddress = relay.wsAddress;
      });

    lobby.addGame(game);
    game.logAction(`${playerId} created game.`);
    return this.refreshLobby({ lobby });
  }

  gameInvite({ lobby, game }) {
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
    };
  }

  async postGameResult({ playerId, lobbyId, params }) {
    const { gameSummary, profile } = params || {};
    const key = `${playerId}-${lobbyId}`;
    const now = Date.now();
    const lastPost = this.notePostGuards.get(key);

    if (lastPost && now - lastPost < 5000) {
      return {
        action: "postGameResultError",
        message: "You're posting too fast. Please wait a moment.",
        lobbyId,
        playerId,
      };
    }

    this.notePostGuards.set(key, now);

    try {
      const nsec = process.env.POGNGAMEHUB;
      const { type, data: sk } = nip19.decode(nsec);
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
      await Promise.any(pool.publish(relays, event));

      return {
        action: "postGameResultConfirmed",
        playerId,
        status: "success",
        message: "Game result posted to POGN Gamehub account on nostr.",
        lobbyId,
      };
    } catch (err) {
      console.log("Error posting game result:", err);
      return {
        type: "error",
        action: "postGameResultFailed",
        message: err.message,
        playerId,
        private: playerId,
        lobbyId,
      };
    }
  }

  refreshLobby({ lobby, playerId }) {
    return {
      action: "refreshLobby",
      lobbyId: lobby.lobbyId,
      lobbyPlayers: lobby.getLobbyPlayers(),
      lobbyGames: lobby.getLobbyGames(),
      private: playerId || null,
    };
  }

  async createLobby({ lobbyId }) {
    const newLobby = new Lobby({ lobbyId });
    const [newLobbyRelay] = await this.relayManager.createRelays([
      { type: "lobby", id: lobbyId, options: { controller: this } },
    ]);
    newLobby.relay = newLobbyRelay;
    newLobby.wsAddress = newLobbyRelay.wsAddress;
    newLobby.relayId = newLobbyRelay.id;
    this.lobbies.set(lobbyId, newLobby);
    return {
      newRelayId: newLobbyRelay.id,
      lobbyId,
      lobbyAddress: newLobbyRelay.wsAddress,
      lobbyPlayers: newLobby.getLobbyPlayers(),
      lobbyGames: newLobby.getLobbyGames(),
    };
  }

  async initGames(gameConfigs = []) {
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

      const game = this.gameController.createGame(
        gameType,
        true,
        lobbyId,
        gameId
      );

      game.isPrivate = isPrivate;
      game.allowedPlayers = allowedPlayers;

      if (!this.lobbies.has(lobbyId)) {
        await this.createLobby({ lobbyId });
      }

      this.lobbies.get(lobbyId).addGame(game);
      const relay = await this.gameController.createGameRelay(
        game.gameId,
        game.lobbyId
      );
      game.wsAddress = relay.wsAddress;
      game.relayId = relay.id;

      for (const playerId of autoJoin) {
        this.joinLobbyPlayerToGame({
          lobby: this.lobbies.get(lobbyId),
          game,
          playerId,
          newLobbyStatus: null,
        });
      }

      if (autoStart) {
        this.startGame({ lobby: this.lobbies.get(lobbyId), game });
      }
    }
  }
}

module.exports = LobbyController;
