const RockPaperScissors = require("./rps");

class GameController {
  constructor() {
    this.games = {}; // Store active games

    this.gameClasses = {
      "rock-paper-scissors": RockPaperScissors, // Register supported games here
    };
  }

  newGame(gameType) {
    // Check if the game type is supported
    if (!this.gameClasses[gameType]) {
      console.error(`Unsupported game type: ${gameType}`);
      return null;
    }

    let newGame = {
      gameType,
      gameId: uuidv4(),
      players: new Map(),
      gameLog: [],
      state: "created", // Game states: created, joining, started, ended
    };

    this.games[newGame.gameId] = newGame; // Store the game
    return newGame;
  }

  createGame(gameType, publicKey) {
    if (!this.gameClasses[gameType]) {
      console.error(`Unsupported game type: ${gameType}`);
      return null;
    }
    console.log("Creating game:", gameType);
    const newGame = this.newGame(gameType);
    newGame.gameLog.push(`${publicKey} created the game.`);
    return {
      type: "game",
      action: "gameCreated",
      payload: {
        newGame,
      },
    };
  }

  startGame(game, senderPublicKey) {
    console.log("Starting game:", game);

    game.state = "started";
    game.gameLog.push(senderPublicKey + " started the game.");

    // Broadcast the updated game state to all other players
    const players = Array.from(game.players.keys());
    console.log("Broadcasting game start to players:", players);

    game.players.forEach((player, publicKey) => {
      if (publicKey === senderPublicKey) {
        return;
      }
      const { ws } = player; // Extract ws from the player object
      if (ws && ws.readyState === 1) {
        console.log(`Sending game start message to ${publicKey}`);
        ws.send(
          JSON.stringify({
            type: "game",
            action: "startGame",
            payload: {
              ...game,
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
        ...game,
        gameAction: "start",
      },
    };
  }

  processMessage(message) {
    console.log("Processing game message:", message);
    if (!payload || !payload.publicKey || !payload.gameId) {
      return {
        type: "error",
        payload: { message: "Invalid payload structure." },
      };
    }
    const { action, payload, ws } = message;

    const publicKey = payload?.publicKey;

    // Get the game instance from the payload game.id
    const game = this.games[payload?.gameId];

    // Ensure required fields are present
    if (!action) {
      return {
        type: "error",
        payload: { message: "Missing required fields in payload." },
      };
    }

    //get game instance

    switch (action) {
      case "create":
        return this.createGame(payload.gameType, publicKey);
      case "join":
        return this.join(game, publicKey, ws);

      case "verifyResponse":
        return this.verifyResponse(game, publicKey, ws);

      case "removePlayer":
        return this.removePlayer(game, publicKey);

      case "updatePlayers":
        return this.updatePlayers(game);

      case "startGame":
        return this.startGame(game, publicKey);
      case "gameAction":
        return this.gameAction(game, payload.gameAction, publicKey);

      default:
        console.warn(`Unhandled game action: ${action}`);
        return {
          type: "error",
          payload: { message: `Unknown action: ${action}` },
        };
    }
  }

  gameAction(game, gameAction, publicKey) {
    const players = Array.from(game.players.entries()).map(
      ([publicKey, player]) => ({
        publicKey,
        ws: player.ws,
      })
    );
    //create gameInstance from gameType

    let gameInstance = new this.gameClasses[game.gameType]();

    let { gameAction, logEntry } = gameInstance.processAction(
      gameAction,
      publicKey
    );

    game.gameLog.push(logEntry);
    return {
      type: "game",
      action: "gameAction",
      payload: { gameAction, ...game },
      broadcast: true,
    };
  }

  join(game, publicKey, ws) {
    if (!publicKey) {
      return {
        type: "error",
        message: "Missing publicKey in payload.",
      };
    }

    if (game.players.has(publicKey)) {
      return {
        type: "error",
        message: publicKey + " is already in the game.",
      };
    }

    // Add the new player and mark as unverified
    game.players.set(publicKey, { ws, verified: false });
    // Mark all players as unverified
    game.players.forEach((player) => {
      player.verified = false;
    });
    game.state = "joining"; // Set the game state to joining
    console.log(`Player ${publicKey} added to the game for verification.`);

    setTimeout(() => {
      console.log("Finalizing verification process for the game.");

      // Safely iterate and remove unverified players
      const playerKeys = Array.from(game.players.keys());
      for (const playerKey of playerKeys) {
        const player = game.players.get(playerKey);
        if (!player.verified) {
          console.log(`Removing unverified player: ${playerKey}`);
          game.players.delete(playerKey);
        }
      }

      // Broadcast updated player list
      const players = Array.from(game.players.keys());
      console.log("Broadcasting updated player list:", players);

      game.players.forEach((player, playerKey) => {
        if (player.ws && player.ws.readyState === 1) {
          console.log(`Sending updated player list to ${playerKey}`);
          player.ws.send(
            JSON.stringify({
              type: "game",
              action: "updatePlayers",
              payload: { ...game },
              state: game.state,
            })
          );
        }
      });
    }, 5000);

    const players = Array.from(game.players.entries()).map(
      ([publicKey, player]) => ({
        publicKey,
        ws: player.ws,
      })
    );

    return {
      type: "game",
      action: "verifyPlayer",
      payload: { ...game },
      broadcast: true,
      players: players,
    };
  }

  verifyResponse(game, publicKey, ws) {
    console.log(`Verifying player: ${publicKey}`);

    if (game.players.has(publicKey)) {
      game.players.set(publicKey, {
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
        ...game,
      },
    };
  }

  removePlayer(game, publicKey) {
    if (game.players.has(publicKey)) {
      game.players.delete(publicKey);
      console.log(`Player removed: ${publicKey}`);

      return this.updatePlayers(game); // Broadcast updated list
    }

    return {
      type: "error",
      payload: { message: "Player not found in the game." },
    };
  }

  updatePlayers(game) {
    const players = Array.from(game.players.keys());
    console.log("Broadcasting updated player list:", players);

    game.players.forEach((player, publicKey) => {
      if (player.ws && player.ws.readyState === 1) {
        player.ws.send(
          JSON.stringify({
            type: "game",
            action: "updatePlayers",
            payload: { ...game },
          })
        );
      }
    });

    return {
      type: "game",
      action: "updatePlayers",
      payload: { ...game },
    };
  }
}

module.exports = GameController;
