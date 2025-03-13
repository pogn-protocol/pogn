class RequesterProtocol {
  constructor({ id, messenger, state }) {
    this.id = id;
    this.messenger = messenger;
    this.state = state;
    this.knownPeers = new Set();
    this.validations = {};
  }

  handleMessage(ws, data) {
    const { type, payload } = data.message;

    switch (type) {
      case "validation_response":
        console.log(`[${this.id}] ✅ Received validation specs.`);
        this.updateValidationCapabilities(payload);
        break;

      case "id_request":
        this.messenger.sendMessage(ws, {
          type: "id_response",
          payload: { receivedId: this.id },
        });
        break;

      case "id_response":
        if (!this.knownPeers.has(payload.receivedId)) {
          this.knownPeers.add(payload.receivedId);
          this.state.addToState("internal", {
            knownPeers: [...this.knownPeers],
          });
          console.log(
            `[${this.id}] Added peer ${payload.receivedId} to known peers.`
          );
        }
        break;

      default:
        console.warn(`[${this.id}] ❗ Unknown message type: ${type}`);
    }
  }

  requestValidations() {
    console.log(`[${this.id}] 📥 Requesting validation specs.`);
    this.messenger.broadcast({
      type: "validation_request",
      payload: { requesterId: this.id },
    });
  }

  updateValidationCapabilities(specs) {
    this.validations = { ...this.validations, ...specs };
    console.log(`[${this.id}] 🔑 Updated validation capabilities.`);
  }
}

module.exports = RequesterProtocol;
