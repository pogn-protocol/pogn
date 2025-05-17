const Relay = require("./relay");
const PokerGame = require("./pokerGame");

class DisplayGameRelay extends Relay {
  constructor({ id, ports, host }) {
    super({ type: "displayGame", id, ports, host });
    this.playerMap = new Map();
    this.seatMap = new Map();
    this.game = new PokerGame();
    this.botId = "pokerBot";

    // 👇 Inject bot once after first real player joins
    if (!this.seatMap.has(this.botId)) {
      const openSeat = [...Array(this.ports.length).keys()].find(
        (i) => ![...this.seatMap.values()].includes(i)
      );
      if (openSeat !== undefined) {
        this.seatMap.set(this.botId, openSeat);
        this.playerMap.set(this.botId, null); // no actual socket
        this.game.addPlayer(this.botId);
      }
    }
  }

  async processMessage(ws, message) {
    const { playerId, seatIndex } = message?.payload || {};

    if (message?.payload?.action === "sit" && typeof seatIndex === "number") {
      this.playerMap.set(playerId, ws);
      this.seatMap.set(playerId, seatIndex);
      this.game.addPlayer(playerId);

      // ✅ Broadcast the updated seat map and game state
      const playersAtTable = Array.from(this.seatMap.entries()).map(
        ([id, index]) => ({ playerId: id, seatIndex: index })
      );

      this.broadcastResponse({
        relayId: this.id,
        payload: {
          type: "displayGame",
          action: "sit",
          playerId,
          seatIndex,
          playersAtTable,
          gameState: this.game.getGameDetails(),
        },
      });

      // 🔥 FIX: Only auto-start if there are at least 2 *real* (non-bot) players
      const realPlayerCount = [...this.playerMap.keys()].filter(
        (id) => id !== this.botId
      ).length;

      if (!this.game.started && realPlayerCount >= 2) {
        const startMsg = { action: "startHand" };
        return this.processMessage(null, { payload: startMsg });
      }

      return;
    }

    if (message?.payload?.action === "leave") {
      this.playerMap.delete(playerId);
      this.seatMap.delete(playerId);
      this.game.removePlayer(playerId);
    }

    // 🎯 Forward game actions to PokerGame
    const result = this.game.processMessage(message.payload);
    if (!result) return;

    const { updates, broadcast, privateHands, botTurn } = result;

    // 🔁 Broadcast shared state
    if (broadcast) {
      const enriched = {
        ...message,
        payload: {
          ...message.payload,
          playersAtTable: Array.from(this.seatMap.entries()).map(
            ([id, index]) => ({ playerId: id, seatIndex: index })
          ),
          gameState: updates,
        },
      };
      this.broadcastResponse(enriched);
    }

    // 🔐 Private hole cards
    if (privateHands) {
      for (const [id, hand] of Object.entries(privateHands)) {
        const ws = this.playerMap.get(id);
        if (!ws) continue;
        this.sendResponse(ws, {
          relayId: this.id,
          payload: {
            type: "displayGame",
            action: "privateHand",
            private: true,
            hand,
            playerId: id,
          },
        });
      }
    }

    // 🤖 Bot logic
    if (botTurn === this.botId) {
      setTimeout(() => this.handleBotAction(), 3000);
    }
  }

  handleBotAction() {
    const botAction = this.game.suggestBotAction(this.botId);
    if (!botAction) return;

    const msg = {
      relayId: "displayGame",
      payload: {
        type: "displayGame",
        action: botAction.action,
        amount: botAction.amount,
        playerId: this.botId,
      },
    };

    this.processMessage(this.playerMap.get(this.botId), msg);
  }
}

module.exports = DisplayGameRelay;
