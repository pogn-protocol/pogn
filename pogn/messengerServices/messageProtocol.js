class MessageProtocol {
  constructor(quank) {
    this.quank = quank; // Reference to the Quank instance
  }

  handleMessage(ws, data, messenger) {
    const { type, payload } = data.message;

    switch (type) {
      case "validation_request":
        if (this.quank.role === "validator") {
          console.log(`[${this.quank.id}] 📤 Sending validation specs.`);
          const specs = this.quank.getValidationSpecs(payload);
          messenger.sendMessage(ws, {
            type: "validation_response",
            payload: specs,
          });
        }
        break;

      case "validation_response":
        if (this.quank.role === "requester") {
          console.log(`[${this.quank.id}] ✅ Received validation specs.`);
          this.quank.updateValidationCapabilities(payload);
        }
        break;

      case "id_request":
        messenger.sendMessage(ws, {
          type: "id_response",
          payload: { receivedId: this.quank.id },
        });
        break;

      case "id_response":
        if (!messenger.knownPeers.has(payload.receivedId)) {
          messenger.knownPeers.add(payload.receivedId);
          messenger.state.addToState("internal", {
            knownPeers: [...messenger.knownPeers],
          });
          console.log(
            `[${this.quank.id}] Added peer ${payload.receivedId} to known peers.`
          );
        }
        break;

      default:
        console.warn(`[${this.quank.id}] ❗ Unknown message type: ${type}`);
    }
  }
}

module.exports = MessageProtocol;
