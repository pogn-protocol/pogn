//import lobby class
const Lobby = require("./lobby");

class LobbyController {
  constructor() {
    this.lobby = new Lobby();
  }

  processMessage(action, payload) {
    console.log("Processing lobby action:", action, payload);

    switch (action) {
      case "login":
        return this.joinLobby(payload.playerId);

      case "verifyResponse":
        return this.handleVerifyResponse(payload.playerId);

      default:
        console.warn(`Unhandled lobby action: ${action}`);
        return {
          type: "error",
          payload: { message: `Unknown action: ${action}` },
        };
    }
  }

  joinLobby(playerId) {
    if (!playerId) {
      return {
        type: "error",
        payload: { message: "Public key required to join the lobby" },
      };
    }

    this.lobby.addPlayer(playerId, { inLobby: false });
    console.log(`Player ${playerId} added or updated in the lobby.`);

    console.log("Sterilizing lobby players...");
    this.lobby.sterilizeLobby();
    console.log("players", this.lobby);
    return {
      type: "lobby",
      action: "verifyPlayer",
      payload: {},
      //broadcasts to everyone via relay.js code
    };
  }

  updatePlayers() {
    console.log("Updating players...", this.lobby.getVerifiedLobbyPlayers());
    return {
      type: "lobby",
      action: "updatePlayers",
      payload: {
        players: this.lobby.getVerifiedLobbyPlayers(),
      },
      broadcast: true,
    };
  }

  handleVerifyResponse(playerId) {
    console.log(`Verifying player: ${playerId}`);

    if (this.lobby.verifyPlayer(playerId)) {
      console.log(`Player ${playerId} is verified.`);
    } else {
      console.log(`Player ${playerId} does not exist in the lobby.`);
    }

    return {
      type: "lobby",
      action: "playerVerified",
      payload: {
        message: `Player ${playerId} successfully verified.`,
        playerId,
        players: this.lobby.getVerifiedLobbyPlayers(),
      },
      broadcast: false,
    };
  }
}

module.exports = LobbyController;
