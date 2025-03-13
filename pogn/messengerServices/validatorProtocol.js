class ValidatorProtocol {
  constructor({ id, messenger, state }) {
    this.id = id;
    this.messenger = messenger;
    this.state = state;
  }

  handleMessage(ws, data) {
    const { type, payload } = data.message;

    switch (type) {
      case "validation_request":
        console.log(`[${this.id}] 📤 Sending validation specs.`);
        const specs = this.getValidationSpecs(payload);
        this.messenger.sendMessage(ws, {
          type: "validation_response",
          payload: specs,
        });
        break;

      case "id_request":
        this.messenger.sendMessage(ws, {
          type: "id_response",
          payload: { receivedId: this.id },
        });
        break;

      default:
        console.warn(`[${this.id}] ❗ Unknown message type: ${type}`);
    }
  }

  getValidationSpecs(payload) {
    return {
      canMove: (action) => action.type === "move",
      canJump: (action) => action.type === "jump",
      receivedFrom: payload.requesterId,
    };
  }
}

module.exports = ValidatorProtocol;
