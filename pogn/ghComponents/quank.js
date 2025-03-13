const configs = require("../configs/configs");
const permissions = require("../permissions/permissions");
const validations = require("../validations/validations");

const StateManager = require("../states/stateManager");
const RelayManager = require("../relayServices/relayManager");
const MessengerService = require("../messengerServices/messengerService");

// Import specific protocols
const ValidatorProtocol = require("../messengerServices/validatorProtocol");
const RequesterProtocol = require("../messengerServices/requesterProtocol");

class Quank {
  constructor(id, role = "requester") {
    this.id = id || configs.id;
    this.role = role;
    console.log(`[${this.id}] Quank (${this.role}) is starting...`);

    this.state = new StateManager(this.id, configs.stateManager);
    this.relay = new RelayManager(
      this.id,
      (ws) => this.messenger.handleConnection(ws),
      this.state
    );

    this.state.clearInternalState();

    // ✅ Inject role-specific protocol
    this.protocol =
      this.role === "validator"
        ? new ValidatorProtocol({
            id: this.id,
            messenger: this.messenger,
            state: this.state,
          })
        : new RequesterProtocol({
            id: this.id,
            messenger: this.messenger,
            state: this.state,
          });

    this.messenger = new MessengerService({
      id: this.id,
      peers: this.relay.peers,
      configs: configs.messengerService,
      permissions: permissions.messengerService,
      validations: validations.messengerService,
      stateManager: this.state,
      protocol: this.protocol, // ✅ Inject the protocol here
      onBroadcast: this.handleBroadcast.bind(this),
    });

    this.relay.initialize((ws) => this.messenger.handleConnection(ws));
    this.startDiscovery();
  }

  handleIncoming(ws, data) {
    this.protocol.handleMessage(ws, data);
  }

  updateValidationCapabilities(specs) {
    this.validations = { ...this.validations, ...specs };
    console.log(`[${this.id}] 🔑 Updated validation capabilities.`);
  }

  validateAction(action) {
    const validator =
      this.validations[
        `can${action.type.charAt(0).toUpperCase() + action.type.slice(1)}`
      ];
    return validator ? validator(action) : false;
  }

  handleBroadcast(message) {
    console.log(`[${this.id}] Broadcast completed:`, message);
  }

  startDiscovery() {
    console.log(`[${this.id}] Starting peer discovery...`);

    const discoveryInterval = setInterval(() => {
      if (this.relay.peers.size >= 2) {
        clearInterval(discoveryInterval);
        console.log(`[${this.id}] Enough peers discovered.`);
        this.broadcastIdToPeers();
        return;
      }
      this.relay.discoverPeers();
    }, 1000);

    setTimeout(() => {
      clearInterval(discoveryInterval);
      console.log(`[${this.id}] Peer discovery completed.`);
      this.broadcastIdToPeers();
    }, 7000);
  }

  broadcastIdToPeers() {
    const idMessage = {
      type: "id_request",
      payload: { id: this.id },
    };
    this.messenger.broadcast(idMessage);
    console.log(`[${this.id}] Broadcasted ID to connected peers.`);
  }
}

module.exports = Quank;
