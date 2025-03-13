class MessengerService {
  constructor({
    id,
    peers,
    configs,
    permissions,
    validations,
    stateManager,
    protocol, // ✅ Injecting the MessageProtocol
    onBroadcast,
  }) {
    this.id = id;
    this.peers = peers;
    this.configs = configs;
    this.permissions = permissions;
    this.validations = validations;
    this.state = stateManager;

    this.knownPeers = new Set();
    this.protocol = protocol; // ✅ Use the provided protocol
    this.onBroadcast = onBroadcast;
  }

  handleConnection(ws) {
    ws.on("message", (message) => {
      const data = JSON.parse(message);
      if (this.protocol && typeof this.protocol.handleMessage === "function") {
        this.protocol.handleMessage(ws, data, this); // ✅ Delegate to protocol
      } else {
        console.warn(`[${this.id}] No valid protocol handler provided.`);
      }
    });
  }

  sendMessage(peer, message) {
    if (peer.readyState === peer.OPEN) {
      peer.send(JSON.stringify({ from: this.id, message }));
      console.log(`[${this.id}] Sent message:`, message);
    }
  }

  broadcast(message) {
    if (this.peers.size === 0) {
      console.warn(`[${this.id}] No peers available to broadcast.`);
    }

    this.peers.forEach((ws) => {
      if (ws.readyState === ws.OPEN) {
        this.sendMessage(ws, message);
      }
    });

    if (this.onBroadcast) {
      this.onBroadcast(message, this); // ✅ Optional custom broadcast hook
    }
  }
}

module.exports = MessengerService;
