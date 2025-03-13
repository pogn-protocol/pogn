const Quank = require("./quank");
const playerConfig = require("./configs/playerConfig");
const playerValidations = require("./validations/playerValidations");

class Player extends Quank {
  constructor() {
    super({ configs: playerConfig, validations: playerValidations });
  }

  verify(target) {
    const message = {
      type: "verify",
      payload: { playerId: this.id },
    };

    if (this.validations.validateOutgoingMessage(message.payload)) {
      this.sendMessage(target.id, message);
    } else {
      console.log(`[${this.id}] Invalid player ID format.`);
    }
  }

  handleMessage(ws, data) {
    super.handleMessage(ws, data);
    if (data.message.type === "verification_response") {
      if (this.validations.validateIncomingResponse(data.message.payload)) {
        console.log(`[Player: ${this.id}] Verified by ${data.from}`);
      }
    }
  }
}

// ✅ Start Player using configurations
const playerInstance = new Player();
playerInstance.connectToPeer(playerConfig.peerUrl);
setTimeout(() => playerInstance.verify({ id: playerConfig.targetId }), 2000);
