const RockPaperScissors = require("./rps");

class GameController {
  constructor() {
    this.games = {}; // Game instances by game type
    this.gameClasses = {
      "rock-paper-scissors": RockPaperScissors, // Register supported games here
    };
  }

  processMessage(message) {
    console.log("Processing game message:", message);
    const { action, payload, ws } = message;

    const publicKey = payload?.publicKey;
    const game = payload?.game;

    // Ensure required fields are present
    if (!game || !action) {
      return {
        type: "error",
        payload: { message: "Missing required fields in payload." },
      };
    }

    // Ensure the game instance exists
    let gameInstance = this.games[game];
    if (!gameInstance) {
      const GameClass = this.gameClasses[game];
      if (!GameClass) {
        return {
          type: "error",
          payload: { message: `Game ${game} not supported.` },
        };
      }

      gameInstance = new GameClass();
      gameInstance.players = new Map(); // Map of publicKey → WebSocket
      gameInstance.gameLog = []; // Initialize game log
      this.games[game] = gameInstance;
    }

    switch (action) {
      case "join":
        return this.join(gameInstance, publicKey, ws);

      case "verifyResponse":
        return this.verifyResponse(gameInstance, publicKey, ws);

      case "removePlayer":
        return this.removePlayer(gameInstance, publicKey);

      case "updatePlayers":
        return this.updatePlayers(gameInstance);

      case "startGame":
        return this.startGame(gameInstance);
      case "gameAction":
        return this.gameAction(gameInstance, payload.choice, publicKey);

      default:
        console.warn(`Unhandled game action: ${action}`);
        return {
          type: "error",
          payload: { message: `Unknown action: ${action}` },
        };
    }
  }

  gameAction(gameInstance, choice, publicKey) {
    const players = Array.from(gameInstance.players.entries()).map(
      ([publicKey, player]) => ({
        publicKey,
        ws: player.ws,
      })
    );
    let gameAction = gameInstance.processAction(choice, publicKey);
    return {
      type: "game",
      action: "gameAction",
      payload: gameAction,
      state: gameInstance.state,
      broadcast: true,
      players: players,
    };
  }

  startGame(gameInstance) {
    console.log("Starting game:", gameInstance.constructor.name);

    // Update the game state
    gameInstance.state = "started";

    // Initialize any game-specific logic
    gameInstance.gameLog.push("Game has started.");
    gameInstance.rounds = []; // Initialize rounds if needed

    // Broadcast the updated game state to all players
    const players = Array.from(gameInstance.players.keys());
    console.log("Broadcasting game start to players:", players);

    gameInstance.players.forEach((player, publicKey) => {
      const { ws } = player; // Extract ws from the player object
      if (ws && ws.readyState === 1) {
        console.log(`Sending game start message to ${publicKey}`);
        ws.send(
          JSON.stringify({
            type: "game",
            action: "startGame",
            payload: {
              message: "The game has started!",
              players,
              gameAction: "start",
            },
          })
        );
      } else {
        console.warn(`WebSocket for ${publicKey} is not open.`);
      }
    });

    return {
      type: "game",
      action: "startGame",
      payload: {
        message: "Game started successfully.",
        players,
        state: "started",
      },
    };
  }

  join(gameInstance, publicKey, ws) {
    if (!publicKey) {
      return {
        type: "error",
        payload: { message: "Public key required to join the game." },
      };
    }

    if (gameInstance.players.has(publicKey)) {
      return {
        type: "error",
        payload: { message: "Player already in the game." },
      };
    }

    // Add the new player and mark as unverified
    gameInstance.players.set(publicKey, { ws, verified: false });
    // Mark all players as unverified
    gameInstance.players.forEach((player) => {
      player.verified = false;
    });
    gameInstance.state = "joining"; // Set the game state to joining
    console.log(`Player ${publicKey} added to the game for verification.`);

    setTimeout(() => {
      console.log("Finalizing verification process for the game.");

      // Safely iterate and remove unverified players
      const playerKeys = Array.from(gameInstance.players.keys());
      for (const playerKey of playerKeys) {
        const player = gameInstance.players.get(playerKey);
        if (!player.verified) {
          console.log(`Removing unverified player: ${playerKey}`);
          gameInstance.players.delete(playerKey);
        }
      }

      // Broadcast updated player list
      const players = Array.from(gameInstance.players.keys());
      console.log("Broadcasting updated player list:", players);

      gameInstance.players.forEach((player, playerKey) => {
        if (player.ws && player.ws.readyState === 1) {
          console.log(`Sending updated player list to ${playerKey}`);
          player.ws.send(
            JSON.stringify({
              type: "game",
              action: "updatePlayers",
              payload: { players },
              state: gameInstance.state,
            })
          );
        }
      });
    }, 5000);

    const players = Array.from(gameInstance.players.entries()).map(
      ([publicKey, player]) => ({
        publicKey,
        ws: player.ws,
      })
    );

    return {
      type: "game",
      action: "verifyPlayer",
      payload: {},
      broadcast: true,
      state: gameInstance.state,
      players: players,
    };
  }

  verifyResponse(gameInstance, publicKey, ws) {
    console.log(`Verifying player: ${publicKey}`);

    if (gameInstance.players.has(publicKey)) {
      const player = gameInstance.players.get(publicKey);
      gameInstance.players.set(publicKey, {
        ws: ws,
        verified: true,
      });
      console.log(`Player ${publicKey} successfully verified.`);
    } else {
      console.log(`Player ${publicKey} not found in the game.`);
    }

    return {
      type: "game",
      action: "playerVerified",
      payload: {
        message: `Player ${publicKey} successfully verified.`,
        publicKey,
      },
    };
  }

  removePlayer(gameInstance, publicKey) {
    if (gameInstance.players.has(publicKey)) {
      gameInstance.players.delete(publicKey);
      console.log(`Player removed: ${publicKey}`);

      return this.updatePlayers(gameInstance); // Broadcast updated list
    }

    return {
      type: "error",
      payload: { message: "Player not found in the game." },
    };
  }

  updatePlayers(gameInstance) {
    const players = Array.from(gameInstance.players.keys());
    console.log("Broadcasting updated player list:", players);

    gameInstance.players.forEach((player, publicKey) => {
      if (player.ws && player.ws.readyState === 1) {
        player.ws.send(
          JSON.stringify({
            type: "game",
            action: "updatePlayers",
            payload: { players },
            state: gameInstance.state,
          })
        );
      }
    });

    return {
      type: "game",
      action: "updatePlayers",
      payload: { players },
      state: gameInstance.state,
    };
  }
}

module.exports = GameController;
