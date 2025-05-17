class PokerGame {
  constructor() {
    this.players = new Map(); // playerId -> { stack, hand, etc. }
    this.turnOrder = [];
    this.currentTurnIndex = 0;
    this.started = false;
  }

  _generateDeck() {
    const suits = ["s", "h", "d", "c"];
    const values = [
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "T",
      "J",
      "Q",
      "K",
      "A",
    ];
    const deck = [];

    for (const suit of suits) {
      for (const value of values) {
        deck.push(value + suit);
      }
    }

    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
  }

  addPlayer(playerId) {
    if (!this.players.has(playerId)) {
      this.players.set(playerId, {
        stack: 1000,
        hasFolded: false,
      });
      this._recalculateTurnOrder();
    }
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
    this._recalculateTurnOrder();
  }

  _recalculateTurnOrder() {
    this.turnOrder = Array.from(this.players.keys());
  }

  getPlayerCount() {
    return this.players.size;
  }

  startNewHand() {
    this.started = true;
    this.currentTurnIndex = 0;

    const deck = this._generateDeck();
    this.deck = deck;

    for (const player of this.players.values()) {
      player.hasFolded = false;
      player.hand = [deck.pop(), deck.pop()]; // Deal 2 cards
    }
  }

  endHand() {
    this.started = false;
  }

  getCurrentTurn() {
    return this.turnOrder[this.currentTurnIndex];
  }

  processMessage({ action, playerId, amount }) {
    switch (action) {
      case "startHand":
        this.startNewHand();
        return {
          broadcast: true,
          updates: this.getGameDetails(),
          privateHands: this.getPrivateHands(),
        };

      case "endHand":
        this.endHand();
        return { broadcast: true, updates: this.getGameDetails() };

      case "bet":
      case "check":
      case "fold":
        this.processAction(playerId, { action, amount });
        return {
          broadcast: true,
          updates: this.getGameDetails(),
          botTurn: this.getCurrentTurn(),
        };

      default:
        return null;
    }
  }

  getPrivateHands() {
    const hands = {};
    for (const [id, player] of this.players.entries()) {
      hands[id] = player.hand;
    }
    return hands;
  }

  _advanceTurn() {
    const activePlayers = this.turnOrder.filter(
      (id) => !this.players.get(id)?.hasFolded
    );
    const currentId = this.getCurrentTurn();
    const idx = activePlayers.indexOf(currentId);
    const nextIdx = (idx + 1) % activePlayers.length;
    this.currentTurnIndex = this.turnOrder.indexOf(activePlayers[nextIdx]);
  }

  suggestBotAction(botId) {
    const bot = this.players.get(botId);
    if (!bot || bot.hasFolded) return null;

    if (bot.stack >= 10) {
      return { action: "bet", amount: 10 };
    }

    return { action: "check" };
  }

  getGameDetails() {
    return {
      players: Object.fromEntries(this.players),
      turn: this.getCurrentTurn(),
    };
  }
}

module.exports = PokerGame;
