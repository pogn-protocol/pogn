class LobbyController {
  constructor() {
    this.players = new Map(); // Map of public keys to player info, including their WebSocket
  }

  processMessage(message) {
    const { action, payload, ws } = message;

    switch (action) {
      case "login":
        return this.handleLogin(payload.publicKey, ws);

      case "verifyPlayers":
        return this.handleVerifyPlayers();

      case "verifyResponse":
        return this.handleVerifyResponse(payload.publicKey, ws);

      case "removePlayer":
        return this.handleRemovePlayer(payload.publicKey);

      case "updatePlayers":
        return this.handleUpdatePlayers();

      default:
        console.warn(`Unhandled lobby action: ${action}`);
        return {
          type: "error",
          payload: { message: `Unknown action: ${action}` },
        };
    }
  }

  handleLogin(publicKey, ws) {
    if (!publicKey) {
      return {
        type: "error",
        payload: { message: "Public key required to join the lobby" },
      };
    }

    if (this.players.has(publicKey)) {
      return {
        type: "error",
        payload: { message: "Player already in the lobby" },
      };
    }

    // Add the new player with unverified status
    this.players.set(publicKey, { ws, verified: false });
    //set all players to unverified
    this.players.forEach((player) => {
      player.verified = false;
    });
    console.log(`Player ${publicKey} added to the lobby.`);

    console.log("Verification process started.");

    // Schedule verification finalization
    setTimeout(() => {
      console.log("Finalizing verification process.");

      const playersToRemove = [];
      this.players.forEach((player, key) => {
        if (!player.verified) {
          console.log(`Removing unverified player: ${key}`);
          playersToRemove.push(key); // Collect keys for later removal
        }
      });

      // Remove unverified players
      playersToRemove.forEach((key) => this.players.delete(key));

      // Broadcast updated player list
      const players = Array.from(this.players.keys());
      console.log("Broadcasting updated player list:", players);

      this.players.forEach((player) => {
        if (player.ws && player.ws.readyState === 1) {
          player.ws.send(
            JSON.stringify({
              type: "lobby",
              action: "updatePlayers",
              payload: { players },
            })
          );
        }
      });
    }, 5000);

    return {
      type: "lobby",
      action: "verifyPlayer",
      payload: {},
      broadcast: true,
    };
  }

  handleVerifyResponse(publicKey, ws) {
    console.log(`Verifying player: ${publicKey}`);

    if (this.players.has(publicKey)) {
      const player = this.players.get(publicKey);
      // Update the player's WebSocket and set them as verified
      this.players.set(publicKey, { ws: ws, verified: true });
      console.log(`Player ${publicKey} has been verified.`);
    } else {
      console.log(`Player ${publicKey} does not exist in the lobby.`);
    }

    return {
      type: "lobby",
      action: "playerVerified",
      payload: {
        message: `Player ${publicKey} successfully verified.`,
        publicKey,
      },
    };
  }

  handleRemovePlayer(publicKey) {
    if (this.players.has(publicKey)) {
      this.players.delete(publicKey);
      console.log(`Player removed: ${publicKey}`);

      return this.getPlayerListMessage(true); // Broadcast updated list
    }

    return {
      type: "error",
      payload: { message: "Player not found" },
    };
  }

  handleUpdatePlayers() {
    return this.getPlayerListMessage(true);
  }
}

module.exports = LobbyController;
