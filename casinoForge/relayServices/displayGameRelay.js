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
      //test
      this.botThinking = true;
      this._broadcastGameState("sit", playerId, seatIndex, {
        broadcast: true,
        updates: this.game.getGameDetails(),
      });

      const realPlayerCount = [...this.seatMap.keys()].filter(
        (id) => id !== this.botId
      ).length;
      // if (!this.game.started && realPlayerCount >= 2) {
      //   const result = this.game.processMessage({
      //     action: "startHand",
      //     seatMap: this.seatMap,
      //   });
      //   this._broadcastGameState("startHand", null, null, result);
      // }

      if (!this.game.started && realPlayerCount >= 1) {
        const ids = Array.from(this.seatMap.keys());
        console.log("IDS:", ids);
        const testHands = {
          pokerBot: ["Kd", "Kh"],
          player1: ["As", "Ah"],
          player2: ["7c", "2d"],
        };

        const testBoard = ["Ac", "Kc", "Qh", "Js", "3d"];

        const startResult = this.game.processMessage({
          action: "startHand",
          seatMap: this.seatMap,
          // testConfig: {
          //   hands: testHands,
          //   board: testBoard,
          // },
        });
        console.log("🧪 Test startHand result:", startResult);
        const botId = this.botId;
        const playerId = ids.filter((id) => id !== botId)[0];

        // Set the actual hands in the game state
        this.game.players.get(botId).hand = ["Kd", "Kh"];
        this.game.players.get(playerId).hand = ["As", "Ah"];

        // Set the private hands in the result that gets sent to clients
        startResult.privateHands[botId] = ["Kd", "Kh"];
        startResult.privateHands[playerId] = ["As", "Ah"];

        console.log("🧪 Overwritten hands:", {
          [botId]: this.game.players.get(botId).hand,
          [playerId]: this.game.players.get(playerId).hand,
        });
        console.log("game", this.game);
        console.log("startResult", startResult);
        // this.game.injectTestHand({
        //   hands: {
        //     pokerBot: ["Kd", "Kh"],
        //     player1: ["As", "Ah"],

        //     player2: ["7c", "2d"],
        //   },
        //   board: ["Ac", "Kc", "Qh", "Js", "3d"],
        // });
        this._broadcastGameState("startHand", null, null, startResult);
        this.game.communityCards = testBoard;
        this.game.street = "showdown"; // Set to river for testing

        const showdownResult = this.game.resolveShowdown();
        // this._broadcastGameState("showdown", null, null, showdownResult);
        console.log("🧪 Test showdown result:", showdownResult);
        this.broadcastResponse({
          relayId: this.id,
          payload: {
            fuck: "test",
            type: "displayGame",
            action: "showdown",
            playerId: null,
            seatIndex: null,
            gameState: showdownResult.updates,
            showdownWinner: showdownResult.showdownWinner,
            showdownResults: showdownResult.showdownResults,
            revealedHands: showdownResult.revealedHands,
            playersAtTable: Array.from(this.seatMap.entries()).map(
              ([id, index]) => ({ playerId: id, seatIndex: index })
            ),
          },
        });

        setTimeout(() => {
          const result = this.game.processMessage({
            action: "startHand",
            seatMap: this.seatMap,
          });
          this.botThinking = false;
          this._broadcastGameState("startHand", null, null, result);
        }, 3000);
      }

      return;
    }

    if (action === "leave") {
      this.playerMap.delete(playerId);
      this.seatMap.delete(playerId);
      this.game.removePlayer(playerId);
      return;
    }
    message.payload.seatMap = this.seatMap;
    const result = this.game.processMessage(message.payload);
    console.log(
      `➡️ Player ${playerId} performed action: ${action}, result:`,
      result
    );
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
          ...result,
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

    // 👇 Auto-resolve showdown if street is 'showdown' and hasn't been handled
    if (
      this.game.started &&
      this.game.street === "showdown" &&
      !this.game.showdownResolved // <-- You'll need to track this
    ) {
      setTimeout(() => {
        console.log("🔄 Starting new hand after showdown...");
        const result = this.game.processMessage({
          action: "startHand",
          seatMap: this.seatMap,
        });
        this.game.showdownResolved = false; // 🔄 Reset flag
        this.botThinking = false;
        console.log("New hand result:", result);
        this._broadcastGameState("startHand", null, null, result);
        return;
      }, 3000);
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
