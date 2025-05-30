const Relay = require("./relay");
const PokerGame = require("./pokerGame");
const PokerBot = require("./pokerBot");

class DisplayGameRelay extends Relay {
  constructor({ id, ports, host }) {
    super({ type: "displayGame", id, ports, host });

    this.game = new PokerGame();
    this.botId = "pokerBot";
    this.bot = new PokerBot(this.botId, this.game, this);
    this.websocketMap = new Map();
    this.game.addPlayer(this.botId);
    this.websocketMap.set(this.botId, this.bot.socket);
    this.bot.thinking = false;
  }

  async processMessage(ws, message) {
    console.log(`🔗 DisplayGameRelay Id ${this.id} received message:`, message);
    try {
      const payload = message?.payload || {};
      const { playerId, seatIndex, action } = payload;

      if (action === "sit") {
        this.websocketMap.set(playerId, ws);
      }
      if (action === "leave") {
        this.websocketMap.delete(playerId);
      }

      const result = this.game.processGameMessage(payload);
      console.log("Result from game.processGameMessage:", result);

      const realPlayerCount = [...this.game.players.keys()].filter(
        (id) => id !== this.botId
      ).length;

      if (!this.game.started && realPlayerCount >= 1) {
        this._runTestStartWithBot();
        return;
      }

      if (result) {
        this._broadcastGameState(action, playerId, seatIndex, result);
      }
    } catch (err) {
      console.error("❌ Error in processMessage:", err);
    }
  }

  _broadcastGameState(action, playerId, seatIndex, result = {}) {
    console.log(
      `🔄 Broadcasting action: ${action}, playerId: ${playerId}, seatIndex: ${seatIndex}, \nresult:`,
      result
    );
    const playersAtTable = Array.from(this.game.players.entries()).map(
      ([id, p]) => ({ playerId: id, seatIndex: p.seatIndex })
    );

    if (result.broadcast) {
      this.broadcastResponse({
        relayId: this.id,
        payload: {
          type: "displayGame",
          action,
          playerId,
          seatIndex,
          playersAtTable,
          ...result,
          gameState: result.updates,
        },
      });
    }

    if (result.private) {
      for (const [id, privateData] of Object.entries(result.private)) {
        const socket = this.websocketMap.get(id);

        const response = {
          relayId: this.id,
          payload: {
            type: "displayGame",
            action: "private",
            private: true,
            playerId: id,
            gameState: result.updates,
            ...privateData,
          },
        };

        if (socket) {
          this.sendResponse(socket, response);
        }
      }
    }

    if (
      this.game.started &&
      this.game.street === "showdown" &&
      !this.game.showdownResolved
    ) {
      setTimeout(() => {
        console.log("🔄 Starting new hand after showdown...");
        const result = this.game.processGameMessage({
          action: "startHand",
        });
        this.game.showdownResolved = false;
        this.bot.thinking = false;
        console.log("New hand result:", result);
        this._broadcastGameState("startHand", null, null, result);
        return;
      }, 3000);
    }
  }

  _runTestStartWithBot() {
    this.bot.thinking = true;

    const ids = Array.from(this.game.players.keys());
    console.log("IDS:", ids);

    const testConfig = {
      hands: {
        [ids[0]]: ["Kd", "Kh"],
        [ids[1]]: ["As", "Ah"],
      },
      board: ["Ac", "Kc", "Qh", "Js", "3d"],
    };

    const result = this.game.startNewHand(testConfig);

    this._broadcastGameState("startHand", null, null, result);

    const showdownResult = this.game.resolveShowdown();
    console.log("🧪 Test showdown result:", showdownResult);

    this.broadcastResponse({
      relayId: this.id,
      payload: {
        type: "displayGame",
        action: "showdown",
        gameState: showdownResult.updates,
        showdownWinner: showdownResult.showdownWinner,
        showdownResults: showdownResult.showdownResults,
        revealedHands: showdownResult.revealedHands,
        playersAtTable: Array.from(this.game.players.entries()).map(
          ([id, p]) => ({ playerId: id, seatIndex: p.seatIndex })
        ),
      },
    });

    setTimeout(() => {
      const newHand = this.game.startNewHand();
      this.bot.thinking = false;
      this._broadcastGameState("startHand", null, null, newHand);
    }, 3000);
  }
}

module.exports = DisplayGameRelay;
