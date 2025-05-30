const Ranker = require("handranker");

class Player {
  constructor(seatIndex) {
    this.seatIndex = seatIndex;
    this.stack = 1000;
    this.bet = 0;
    this.hand = [];
    this.hasFolded = false;
    this.isAllIn = false;
    this.isDealer = false;
    this.isSB = false;
    this.isBB = false;
  }

  resetForNewHand() {
    this.bet = 0;
    this.hand = [];
    this.hasFolded = false;
    this.isAllIn = false;
    this.isDealer = false;
    this.isSB = false;
    this.isBB = false;
  }
}

class PokerGame {
  constructor() {
    this.players = new Map();
    this.turnOrder = [];
    this.currentTurnIndex = 0;
    this.started = false;
    this.pot = 0;
    this.street = "preflop";
    this.communityCards = [];
    this.showdownResolved = false;
    this.seatedButWaiting = new Set();
    this.buttonIndex = 0;
    this.lastBetAmount = 0;
  }

  processGameMessage({ playerId, action, seatIndex, amount, testConfig }) {
    switch (action) {
      case "sit":
        this.addPlayer(playerId, seatIndex);
        return { updates: this.getGameDetails() };
      case "leave":
        this.removePlayer(playerId);
        return { updates: this.getGameDetails() };
      case "startHand":
        return this.startNewHand(testConfig);
      case "bet":
      case "check":
      case "fold":
      case "call":
      case "raise":
      case "allin":
        const result = this.processAction(playerId, { action, amount });
        return {
          broadcast: true,
          updates: this.getGameDetails(),
          botTurn: this.getCurrentTurn(),
          ...(result || {}),
        };
      default:
        return null;
    }
  }

  processAction(playerId, { action, amount }) {
    if (playerId !== this.getCurrentTurn()) return;
    const player = this.players.get(playerId);
    if (!player || player.hasFolded || player.isAllIn) return;

    const maxBet = Math.max(...[...this.players.values()].map((p) => p.bet));

    switch (action) {
      case "fold":
        player.hasFolded = true;
        break;
      case "check":
        if (player.bet < maxBet) return;
        break;
      case "call":
        const callAmount = maxBet - player.bet;
        if (callAmount > player.stack) {
          this.pot += player.stack;
          player.bet += player.stack;
          player.stack = 0;
          player.isAllIn = true;
        } else {
          player.stack -= callAmount;
          player.bet += callAmount;
          this.pot += callAmount;
        }
        break;
      case "bet":
        if (amount <= 0 || amount > player.stack) return;
        this.lastBetAmount = amount;
        player.stack -= amount;
        player.bet += amount;
        this.pot += amount;
        break;
      case "raise":
        const raiseTo = amount;
        const raiseAmount = raiseTo - player.bet;
        if (raiseAmount < this.lastBetAmount || raiseTo <= maxBet) return;
        if (raiseAmount > player.stack) return;
        player.stack -= raiseAmount;
        player.bet += raiseAmount;
        this.pot += raiseAmount;
        this.lastBetAmount = raiseAmount;
        break;
      case "allin":
        player.bet += player.stack;
        this.pot += player.stack;
        player.stack = 0;
        player.isAllIn = true;
        break;
    }

    return this._advanceTurn();
  }

  _advanceTurn() {
    const active = this.turnOrder.filter(
      (id) => !this.players.get(id)?.hasFolded && !this.players.get(id)?.isAllIn
    );

    if (active.length <= 1) return this._handleSinglePlayerWin(active[0]);

    const idx = active.indexOf(this.getCurrentTurn());
    this.currentTurnIndex = this.turnOrder.indexOf(
      active[(idx + 1) % active.length]
    );

    if (this._isRoundComplete()) {
      this._advanceStreet();
      if (this.street === "showdown") {
        return this.resolveShowdown();
      }
    }

    return null;
  }

  _isRoundComplete() {
    const active = this.turnOrder.filter((id) => {
      const p = this.players.get(id);
      return !p.hasFolded && !p.isAllIn;
    });

    const bets = active.map((id) => this.players.get(id).bet);
    return new Set(bets).size <= 1;
  }

  _advanceStreet() {
    this.lastBetAmount = 0;
    for (const player of this.players.values()) player.bet = 0;

    switch (this.street) {
      case "preflop":
        this.communityCards = [
          this.deck.pop(),
          this.deck.pop(),
          this.deck.pop(),
        ];
        this.street = "flop";
        break;
      case "flop":
        this.communityCards.push(this.deck.pop());
        this.street = "turn";
        break;
      case "turn":
        this.communityCards.push(this.deck.pop());
        this.street = "river";
        break;
      case "river":
        this.street = "showdown";
        break;
    }
  }

  resolveShowdown() {
    const board = this.communityCards;
    const hands = [...this.players.entries()]
      .filter(([_, p]) => !p.hasFolded)
      .map(([id, p]) => ({ id, cards: p.hand }));
    const ordered = Ranker.orderHands(hands, board);
    const flat = ordered
      .flat()
      .map((r) => ({
        id: r.id,
        description: r.description,
        ranking: r.ranking,
      }));
    const winner = flat[0]?.id;
    if (winner) this.players.get(winner).stack += this.pot;
    this.pot = 0;

    return {
      broadcast: true,
      updates: this.getGameDetails(),
      showdownWinner: winner,
      showdownResults: flat,
      revealedHands: hands.map(({ id, cards }) => ({
        playerId: id,
        hand: cards,
      })),
    };
  }

  startNewHand(testConfig = null) {
    for (const id of this.seatedButWaiting) {
      this.players.get(id)?.resetForNewHand();
    }
    this.seatedButWaiting.clear();
    this.started = true;
    this.deck = this._generateDeck();

    const sorted = [...this.players.entries()]
      .filter(([_, p]) => typeof p.seatIndex === "number")
      .sort(([, a], [, b]) => a.seatIndex - b.seatIndex);
    const playerIds = sorted.map(([id]) => id);
    this.buttonIndex = (this.buttonIndex + 1) % playerIds.length;
    this.turnOrder = playerIds;
    this._setInitialTurnIndex();

    playerIds.forEach((id, i) => {
      const player = this.players.get(id);
      player.resetForNewHand();
      player.hand = testConfig?.hands?.[id] || [
        this.deck.pop(),
        this.deck.pop(),
      ];
      player.isDealer = i === this.buttonIndex;
      player.isSB = i === (this.buttonIndex + 1) % playerIds.length;
      player.isBB = i === (this.buttonIndex + 2) % playerIds.length;
    });

    this.communityCards = testConfig?.board || [];
    this.street = this.communityCards.length ? "showdown" : "preflop";
    this._postBlinds();

    return {
      broadcast: true,
      updates: this.getGameDetails(),
      private: this.getPrivateHands(),
    };
  }

  _setInitialTurnIndex() {
    const numPlayers = this.turnOrder.length;
    this.currentTurnIndex =
      numPlayers === 2 ? this.buttonIndex : (this.buttonIndex + 3) % numPlayers;
  }

  getCurrentTurn() {
    return this.turnOrder[this.currentTurnIndex];
  }

  _postBlinds() {
    this.pot = 0;
    for (const player of this.players.values()) {
      if (player.isSB) {
        const amount = Math.min(this.smallBlind, player.stack);
        player.stack -= amount;
        player.bet = amount;
        this.pot += amount;
      }
      if (player.isBB) {
        const amount = Math.min(this.bigBlind, player.stack);
        player.stack -= amount;
        player.bet = amount;
        this.pot += amount;
      }
    }
    this.lastBetAmount = this.bigBlind;
  }

  getPrivateHands() {
    const privateMap = {};
    for (const [id, p] of this.players.entries())
      privateMap[id] = { hand: [...p.hand] };
    return privateMap;
  }

  getGameDetails() {
    const playerData = {};
    for (const [id, p] of this.players.entries()) {
      playerData[id] = {
        seatIndex: p.seatIndex,
        stack: p.stack,
        bet: p.bet,
        hand: [...p.hand],
        hasFolded: p.hasFolded,
        isDealer: p.isDealer,
        isSB: p.isSB,
        isBB: p.isBB,
        isAllIn: p.isAllIn,
      };
    }
    return {
      started: this.started,
      players: playerData,
      pot: this.pot,
      street: this.street,
      communityCards: this.communityCards,
    };
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
    for (const suit of suits)
      for (const value of values) deck.push(value + suit);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  addPlayer(id, seatIndex) {
    if (!this.players.has(id)) {
      this.players.set(id, new Player(seatIndex));
      if (this.started) this.seatedButWaiting.add(id);
    }
  }

  removePlayer(id) {
    this.players.delete(id);
  }

  _handleSinglePlayerWin(id) {
    if (id) this.players.get(id).stack += this.pot;
    this.pot = 0;
    return {
      broadcast: true,
      updates: this.getGameDetails(),
      showdownWinner: id,
    };
  }
}

module.exports = PokerGame;
