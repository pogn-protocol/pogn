const Quank = require("./quank");
const gameConfig = require("./configs/gameConfig");
const gameValidations = require("./validations/gameValidations");

class Game extends Quank {
  constructor() {
    super({ configs: gameConfig, validations: gameValidations });
  }

  handleMessage(ws, data) {
    super.handleMessage(ws, data);
    if (data.message.type === "verify") {
      if (this.validations.validateIncomingMessage(data.message.payload)) {
        console.log(
          `[Game: ${this.id}] Verifying Player ${data.message.payload.playerId}`
        );

        const response = this.validations.createVerificationResponse(this.id);
        if (response) {
          this.sendMessage(data.from, response);
        }
      }
    }
  }
}

// ✅ Start Game using configurations
const gameInstance = new Game();
