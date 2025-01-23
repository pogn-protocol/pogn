class GameController {
  constructor() {
    this.players = new Map(); // Map of public keys to player info
    this.games = {}; // Stores instances of different games by game type
    this.gameClasses = {}; // Keeps a registry of game logic classes
    this.ws = null; // WebSocket instance
  }

  // Set WebSocket instance
  setWebSocket(ws) {
    this.ws = ws;
  }

  // Send a message via WebSocket
  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected.");
    }
  }

  // Main entry point for all JSON messages
  processMessage(message) {
    console.log("Processing message:", message);
    switch (message.type) {
      case "login":
        return this.handleLogin(message.payload.publicKey);

      case "join":
        return this.handleJoin(message.payload.publicKey, message.payload.game);

      case "startGame":
        return this.startGame(message.payload.game);

      case "gameAction":
        return this.forwardToGame(message.payload);

      case "updatePlayers":
        // Directly return the message as-is
        return { ...message, handled: true };

      default:
        console.warn(`Unhandled message type: ${message.type}`);
        return {
          type: "error",
          message: "Unknown or unsupported message type",
        };
    }
  }

  // Handle player login
  handleLogin(publicKey) {
    console.log(`handleLogin: ${publicKey}`);
    if (!publicKey) {
      return { type: "error", message: "Public key required to login" };
    }

    // Add the player if not already logged in
    if (!this.players.has(publicKey)) {
      this.players.set(publicKey, { loggedIn: true });
    }

    // Return the updated player list
    return {
      type: "game",
      payload: {
        action: "updatePlayers",
        players: Array.from(this.players.keys()),
      },
    };
  }

  // Handle player joining a game
  handleJoin(publicKey, gameType) {
    if (!publicKey || !gameType) {
      return { type: "error", message: "Missing publicKey or gameType" };
    }

    let gameInstance = this.games[gameType];
    if (!gameInstance) {
      const GameClass = this.gameClasses[gameType];
      if (!GameClass) {
        return {
          type: "error",
          message: `Game type ${gameType} not supported.`,
        };
      }

      // Create a new game instance
      gameInstance = new GameClass();
      this.games[gameType] = gameInstance;
    }

    // Add the player to the game instance
    return gameInstance.addPlayer(publicKey);
  }

  // Forward a game-specific action to the appropriate game instance
  forwardToGame(payload) {
    const { game, action, publicKey, ...actionPayload } = payload;

    if (!this.games[game]) {
      return { type: "error", message: `Game ${game} not found` };
    }

    const gameInstance = this.games[game];
    if (typeof gameInstance[action] === "function") {
      return gameInstance[action](publicKey, actionPayload);
    }

    return { type: "error", message: `Unknown action type: ${action}` };
  }

  // Start a new game
  startGame(gameType) {
    if (!this.games[gameType]) {
      return { type: "error", message: `Game ${gameType} not found` };
    }

    const game = this.games[gameType];
    return game.start();
  }
}

export default GameController;
