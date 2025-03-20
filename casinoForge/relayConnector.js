const WebSocket = require("ws");
const uuidv4 = require("uuid").v4;

class RelayConnector {
  constructor(
    senderId,
    recieverId,
    targetUrl,
    onMessage,
    onOpen = null,
    maxTries = 5,
    duration = 5000
  ) {
    this.senderId = senderId;
    this.recieverId = recieverId;
    this.targetUrl = targetUrl;
    this.onMessage = onMessage;
    this.onOpen = onOpen;
    this.maxTries = maxTries;
    this.duration = duration;
    this.tries = 0;
    this.relaySocket = null;
    console.log(`🚀 Initializing RelayConnector (Target: ${targetUrl})`);
    if (targetUrl) {
      console.log(`🔗 Connecting to relay at ${targetUrl}`);
      this.autoConnect();
    }
  }

  /** 🔄 Automatically attempt connection with retries */
  autoConnect() {
    console.log(`🔄 Auto-connecting to ${this.targetUrl}...`);
    const interval = setInterval(() => {
      if (this.relaySocket && this.relaySocket.readyState === WebSocket.OPEN) {
        console.log(`✅ Successfully connected to relay at ${this.targetUrl}`);

        this.handleRelayConnected(this.relaySocket);

        clearInterval(interval);
      } else if (this.tries < this.maxTries) {
        console.log(
          `🔄 Attempting to connect to ${this.targetUrl} (Attempt ${
            this.tries + 1
          }/${this.maxTries})`
        );
        this.connect();
        this.tries++;
      } else {
        console.warn(
          `⚠️ Failed to connect to ${this.targetUrl} after ${this.maxTries} attempts.`
        );
        clearInterval(interval);
      }
    }, this.duration);
  }

  /** 🔗 Connect to another relay as a WebSocket client */
  connect() {
    console.log(`🔗 Connecting to ${this.targetUrl}...`);
    this.relaySocket = new WebSocket(this.targetUrl);

    this.relaySocket.on("open", () => {
      console.log(`✅ Connected to relay at ${this.targetUrl}`);
      this.handleRelayConnected(this.relaySocket);
    });

    this.relaySocket.on("message", (message) => {
      this.handleRelayMessage(message);
    });

    this.relaySocket.on("close", () => {
      console.warn(`⚠️ Connection to ${this.targetUrl} closed.`);
    });

    this.relaySocket.on("error", (error) => {
      console.error(
        `❌ Error connecting to relay at ${this.targetUrl}:`,
        error
      );
    });
  }

  /** ✅ Handle relay connection */
  handleRelayConnected(socket) {
    console.log(`✅ Relay-to-relay connection established.`);
    socket.send(
      JSON.stringify({
        type: "game",
        action: "test",
        payload: {
          id: this.senderId,
          message: "Hello from relay connector",
        },
      })
    );
  }

  /** 📨 Handle messages from the connected relay */
  handleRelayMessage(message) {
    try {
      const parsedMessage = JSON.parse(message);
      console.log(
        `📡 RelayConnector received message from another relay:`,
        parsedMessage
      );

      if (this.onMessage) {
        this.onMessage(parsedMessage);
      }
    } catch (error) {
      console.error("❌ Error processing relay message:", error);
    }
  }

  /** 📤 Send a message to the connected relay */
  sendMessage(message) {
    if (this.relaySocket && this.relaySocket.readyState === WebSocket.OPEN) {
      console.log(
        `relayConnector ${this.senderId} sending message:`,
        message,
        `to ${this.recieverId}`
      );
      console.log(message.id);
      //make sure message.id = this.id
      if (message?.id !== this.senderId) {
        console.warn(
          `Relay: ${message.id} does not match senderId: ${this.senderId}`
        );
      }
      message.id = this.senderId;

      this.relaySocket.send(JSON.stringify(message));
    } else {
      console.warn(
        `Relay: WebSocket not open. Cannot send message. ${message}`
      );
    }
  }
}

module.exports = RelayConnector;
