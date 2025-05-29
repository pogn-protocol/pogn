class PokerGame {
  constructor() {
    this.players = new Map();
    this.turnOrder = [];
    this.currentTurnIndex = 0;
    this.started = false;
    this.pot = 0;
    this.smallBlind = 10;
    this.bigBlind = 20;
  }

  addPlayer(playerId) {
    if (!this.players.has(playerId)) {
      this.players.set(playerId, {
        stack: 1000,
        hasFolded: false,
        bet: 0,
        hand: [],
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

  startNewHand(seatMap) {
    this.started = true;
    this.deck = this._generateDeck();

    // Get players sorted by seatIndex
    const sortedPlayers = Array.from(seatMap.entries())
      .sort((a, b) => a[1] - b[1]) // sort by seatIndex
      .map(([playerId]) => playerId);

    this.turnOrder = sortedPlayers;

    // Rotate dealer
    if (this.turnOrder.length > 1) {
      this.turnOrder.push(this.turnOrder.shift());
    }

    // Reset and deal hands
    for (const player of this.players.values()) {
      player.hasFolded = false;
      player.bet = 0;
      player.hand = [this.deck.pop(), this.deck.pop()];
    }

    // Post blinds
    const smallBlindId = this.turnOrder[0];
    const bigBlindId = this.turnOrder[1 % this.turnOrder.length];

    this.players.get(smallBlindId).stack -= this.smallBlind;
    this.players.get(smallBlindId).bet = this.smallBlind;

    this.players.get(bigBlindId).stack -= this.bigBlind;
    this.players.get(bigBlindId).bet = this.bigBlind;

    this.pot = this.smallBlind + this.bigBlind;
    this.blindInfo = {
      [smallBlindId]: "SB",
      [bigBlindId]: "BB",
    };

    const active = this.turnOrder.filter(
      (id) =>
        !this.players.get(id)?.hasFolded && this.players.get(id)?.stack > 0
    );

    const idx = active.indexOf(bigBlindId);
    this.currentTurnIndex = this.turnOrder.indexOf(
      active[(idx + 1) % active.length]
    );
  }

  getCurrentTurn() {
    return this.turnOrder[this.currentTurnIndex];
  }

  getPrivateHands() {
    const hands = {};
    for (const [id, player] of this.players.entries()) {
      hands[id] = [...player.hand];
    }
    return hands;
  }

  getGameDetails() {
    const gameDetails = {
      started: this.started,
      players: Object.fromEntries(this.players),
      turn: this.getCurrentTurn(),
      pot: this.pot,
      blindInfo: this.blindInfo || {}, // <-- add this line
    };
    console.log("🔄 Game details requested:", gameDetails);
    return gameDetails;
    // return {
    //   players: Object.fromEntries(this.players),
    //   turn: this.getCurrentTurn(),
    //   pot: this.pot,
    //   blindInfo: this.blindInfo || {}, // <-- add this line
    // };
  }

  processMessage({ playerId, action, amount, seatMap }) {
    console.log(
      `➡️ Player ${playerId} performs ${action} with amount ${amount}`
    );

    switch (action) {
      case "startHand":
        this.startNewHand(seatMap);
        return {
          broadcast: true,
          updates: this.getGameDetails(),
          privateHands: this.getPrivateHands(),
        };
      case "endHand":
        this.started = false;
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

  processAction(playerId, { action, amount }) {
    const player = this.players.get(playerId);
    if (!player || player.hasFolded) return;

    switch (action) {
      case "bet":
        if (typeof amount !== "number" || amount <= 0 || amount > player.stack)
          return;
        player.stack -= amount;
        player.bet += amount;
        this.pot += amount;
        break;

      case "fold":
        player.hasFolded = true;
        break;

      case "check":
        // Nothing to deduct or add — valid only if current bet is 0
        break;

      default:
        return; // Invalid action
    }

    this._advanceTurn();
  }

  _advanceTurn() {
    const active = this.turnOrder.filter(
      (id) => !this.players.get(id)?.hasFolded
    );
    const idx = active.indexOf(this.getCurrentTurn());
    this.currentTurnIndex = this.turnOrder.indexOf(
      active[(idx + 1) % active.length]
    );
  }

  suggestBotAction(botId) {
    const bot = this.players.get(botId);
    if (!bot || bot.hasFolded) return null;
    // bet  is 3 x big blind
    const bet = this.bigBlind * 3;
    return bot.stack >= 10
      ? { action: "bet", amount: bet }
      : { action: "check" };
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
}

module.exports = PokerGame;
