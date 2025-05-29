const Relay = require("./relay");
const PokerGame = require("./pokerGame");

class DisplayGameRelay extends Relay {
  constructor({ id, ports, host }) {
    super({ type: "displayGame", id, ports, host });
    this.playerMap = new Map();
    this.seatMap = new Map();
    this.game = new PokerGame();
    this.botId = "pokerBot";

    this.game.addPlayer(this.botId);
    this.playerMap.set(this.botId, null);
    this.seatMap.set(this.botId, 0);
    this.botThinking = false;
  }

  async processMessage(ws, message) {
    const { playerId, seatIndex, action } = message?.payload || {};

    if (action === "sit" && typeof seatIndex === "number") {
      this.playerMap.set(playerId, ws);
      this.seatMap.set(playerId, seatIndex);
      this.game.addPlayer(playerId);

      this._broadcastGameState("sit", playerId, seatIndex, {
        broadcast: true,
        updates: this.game.getGameDetails(),
      });

      const realPlayerCount = [...this.seatMap.keys()].filter(
        (id) => id !== this.botId
      ).length;
      if (!this.game.started && realPlayerCount >= 2) {
        const result = this.game.processMessage({
          action: "startHand",
          seatMap: this.seatMap,
        });
        this._broadcastGameState("startHand", null, null, result);
      }
      return;
    }

    if (action === "leave") {
      this.playerMap.delete(playerId);
      this.seatMap.delete(playerId);
      this.game.removePlayer(playerId);
      return;
    }

    const result = this.game.processMessage(message.payload);
    if (!result) return;
    this._broadcastGameState(action, playerId, seatIndex, result);
  }

  _broadcastGameState(action, playerId, seatIndex, result = {}) {
    console.log(
      `🔄 Broadcasting action: ${action}, playerId: ${playerId}, seatIndex: ${seatIndex}, 
      result:`,
      result
    );
    const playersAtTable = Array.from(this.seatMap.entries()).map(
      ([id, index]) => ({ playerId: id, seatIndex: index })
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
          gameState: result.updates,
        },
      });
    }

    if (result.privateHands) {
      for (const [id, hand] of Object.entries(result.privateHands)) {
        const socket = this.playerMap.get(id);
        if (!socket) continue;

        const visibleHands = {};
        for (const [otherId, otherHand] of Object.entries(
          result.privateHands
        )) {
          visibleHands[otherId] = otherId === id ? otherHand : [null, null];
        }

        this.sendResponse(socket, {
          relayId: this.id,
          payload: {
            type: "displayGame",
            action: "privateHand",
            private: true,
            hands: visibleHands,
            playerId: id,
            gameState: result.updates,
          },
        });
      }
    }
    console.log(`currentTurn: ${this.game.getCurrentTurn()}`);
    console.log(`botId: ${this.botId}`);
    if (
      this.game.started &&
      this.game.getCurrentTurn() === this.botId &&
      !this.botThinking
    ) {
      this.botThinking = true;
      console.log(`🤖 Bot ${this.botId} is taking action...`);
      setTimeout(() => this._handleBotAction(), 3000);
    } else {
      console.log(`Not bot's turn: ${result.botTurn}`);
    }
  }

  _handleBotAction() {
    const botAction = this.game.suggestBotAction(this.botId);
    if (!botAction) {
      this.botThinking = false;
      return;
    }

    const result = this.game.processMessage({
      type: "displayGame",
      playerId: this.botId,
      action: botAction.action,
      amount: botAction.amount,
    });
    console.log(
      `🤖 Bot ${this.botId} action: ${botAction.action}, amount: ${botAction.amount}, result`,
      result
    );
    if (result) {
      this._broadcastGameState(
        botAction.action,
        this.botId,
        this.seatMap.get(this.botId),
        result
      );
    }

    this.botThinking = false; // ✅ moved here AFTER broadcasting
  }
}

module.exports = DisplayGameRelay;
