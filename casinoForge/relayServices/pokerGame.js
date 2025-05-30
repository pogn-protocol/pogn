const Ranker = require("handranker");

class Player {
  constructor(seatIndex) {
    this.seatIndex = seatIndex;
    this.stack = 1000;
    this.bet = 0;
    this.hand = [];
    this.hasFolded = false;
    this.isDealer = false;
    this.isSB = false;
    this.isBB = false;
  }

  resetForNewHand() {
    this.bet = 0;
    this.hand = [];
    this.hasFolded = false;
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
    this.smallBlind = 10;
    this.bigBlind = 20;
    this.street = "preflop";
    this.communityCards = [];
    this.showdownResolved = false;
    this.seatedButWaiting = new Set();
    this.buttonIndex = 0;
  }

  processGameMessage({ playerId, action, seatIndex, amount, testConfig }) {
    console.log(
      "playerId:",
      playerId,
      "action:",
      action,
      "amount:",
      amount,
      "seatIndex:",
      seatIndex,
      "testConfig:",
      testConfig
    );
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
        const result = this.processAction(playerId, { action, amount });
        return {
          broadcast: true,
          updates: this.getGameDetails(),
          botTurn: this.getCurrentTurn(),
          ...(result || {}),
        };

      default:
        console.warn(`⚠️ Unhandled action: ${action}`);
        return null;
    }
  }

  processAction(playerId, { action, amount }) {
    console.log(`Processing action: ${action} by player ${playerId}`);
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
        break;
    }

    // 👇 STORE return value from _advanceTurn
    console.log(`Advancing turn after ${action} by ${playerId}`);
    const result = this._advanceTurn();
    console.log(`Turn advance result:`, result);
    // ✅ RETURN whatever happened in _advanceTurn (could be showdown or null)
    return result || null;
  }

  startNewHand(testConfig = null) {
    for (const id of this.seatedButWaiting) {
      const player = this.players.get(id);
      if (player) player.resetForNewHand();
    }
    this.seatedButWaiting.clear();

    this.started = true;
    this.deck = this._generateDeck();

    const sorted = Array.from(this.players.entries())
      .filter(([_, p]) => typeof p.seatIndex === "number")
      .sort(([, a], [, b]) => a.seatIndex - b.seatIndex);

    const playerIds = sorted.map(([id]) => id);
    if (playerIds.length === 2) {
      this.buttonIndex = (this.buttonIndex + 1) % 2;
    } else if (playerIds.length > 2) {
      this.buttonIndex = (this.buttonIndex + 1) % playerIds.length;
    }
    this.turnOrder = playerIds;
    this._setInitialTurnIndex();

    for (let i = 0; i < playerIds.length; i++) {
      const id = playerIds[i];
      const player = this.players.get(id);
      player.resetForNewHand();
      player.hand = testConfig?.hands?.[id] || [
        this.deck.pop(),
        this.deck.pop(),
      ];
      player.isDealer = i === this.buttonIndex;
      player.isSB = i === (this.buttonIndex + 1) % playerIds.length;
      player.isBB = i === (this.buttonIndex + 2) % playerIds.length;
    }

    if (testConfig?.board) {
      this.communityCards = [...testConfig.board];
      this.street = "showdown";
    } else {
      this.communityCards = [];
      this.street = "preflop";
    }

    this._postBlinds();

    return {
      broadcast: true,
      updates: this.getGameDetails(),
      private: this.getPrivateHands(),
    };
  }

  _postBlinds() {
    this.pot = 0;
    for (const player of this.players.values()) {
      if (player.isSB) {
        player.stack -= this.smallBlind;
        player.bet = this.smallBlind;
        this.pot += this.smallBlind;
      }
      if (player.isBB) {
        player.stack -= this.bigBlind;
        player.bet = this.bigBlind;
        this.pot += this.bigBlind;
      }
    }
  }

  getPrivateHands() {
    const privateMap = {};
    for (const [id, player] of this.players.entries()) {
      privateMap[id] = { hand: [...player.hand] };
    }
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

  _handleSinglePlayerWin(winnerId) {
    console.log(`🏆 Single player win: ${winnerId} gets pot ${this.pot}`);
    this.players.get(winnerId).stack += this.pot;
    this.pot = 0;
    return {
      broadcast: true,
      updates: this.getGameDetails(),
      showdownWinner: winnerId,
    };
  }

  addPlayer(playerId, seatIndex) {
    if (!this.players.has(playerId)) {
      this.players.set(playerId, new Player(seatIndex));
      if (this.started) {
        this.seatedButWaiting.add(playerId);
      }
    }
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
  }

  _setInitialTurnIndex() {
    const numPlayers = this.turnOrder.length;

    if (numPlayers === 2) {
      // Heads-up: Small blind (button) acts first preflop
      this.currentTurnIndex = this.buttonIndex;
    } else {
      // 3+ players: UTG acts first preflop (3 seats left of button, or next after BB)
      this.currentTurnIndex = (this.buttonIndex + 3) % numPlayers;
    }
  }

  getCurrentTurn() {
    if (this.turnOrder.length === 0) return null;
    return this.turnOrder[this.currentTurnIndex];
  }

  _advanceTurn() {
    const active = this.turnOrder.filter(
      (id) => !this.players.get(id)?.hasFolded
    );
    if (active.length <= 1) {
      // Only one player left, they win
      return this._handleSinglePlayerWin(active[0]);
    }

    // ✅ Calculate next turn before checking street change
    const idx = active.indexOf(this.getCurrentTurn());
    this.currentTurnIndex = this.turnOrder.indexOf(
      active[(idx + 1) % active.length]
    );

    // ✅ If all active players have equal bets, move to next street
    console.log(`🔄 Round complete
: ${this._isRoundComplete()}`);
    if (this._isRoundComplete()) {
      console.log("✅ Round complete, advancing street from ", this.street);
      this._advanceStreet();
      console.log("➡️ New street:", this.street);
      // ⬇️ Check if it's showdown now
      if (this.street === "showdown") {
        console.log("🟢 Entering showdown phase");
        return this.resolveShowdown();
      }
    }

    return null;
  }

  resolveShowdown() {
    console.log("🟡 Resolving showdown...");

    const board = this.communityCards;
    const hands = [];

    for (const [id, player] of this.players.entries()) {
      if (player.hasFolded) {
        console.log(`⏭️ Skipping folded player: ${id}`);
        continue;
      }

      hands.push({
        id,
        cards: player.hand,
      });
    }
    console.log("🃏 Player hands at showdown:", hands);
    const ordered = Ranker.orderHands(hands, board); // 🧠 key call
    console.log("📊 Ordered hands:", ordered);

    // Flatten tie groups and map results
    const results = [];
    for (const group of ordered) {
      for (const res of group) {
        results.push({
          id: res.id,
          description: res.description,
          ranking: res.ranking,
        });
      }
    }
    console.log("🏁 Showdown results:", results);
    const winner = results[0]?.id;

    if (winner) {
      console.log(`🏆 Winner is ${winner}, awarding pot: ${this.pot}`);
      this.players.get(winner).stack += this.pot;
      this.pot = 0;
    } else {
      console.warn("⚠️ No winner determined!");
    }

    return {
      broadcast: true,
      updates: this.getGameDetails(),
      showdownWinner: winner,
      showdownResults: results,
      revealedHands: hands.map(({ id, cards }) => ({
        playerId: id,
        hand: cards,
      })),
    };
  }

  _isRoundComplete() {
    const active = this.turnOrder.filter(
      (id) => !this.players.get(id)?.hasFolded
    );
    const bets = active.map((id) => this.players.get(id).bet);
    const uniqueBets = new Set(bets);
    return uniqueBets.size <= 1;
  }

  _advanceStreet() {
    switch (this.street) {
      case "preflop":
        this.communityCards = [
          this.deck.pop(),
          this.deck.pop(),
          this.deck.pop(),
        ];
        this.street = "flop";
        this._setPostflopTurn();
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

    for (const player of this.players.values()) {
      player.bet = 0;
    }
  }

  _setPostflopTurn() {
    if (this.turnOrder.length === 2) {
      // Heads-up postflop: BB acts first
      const bb = this.turnOrder[1];
      this.currentTurnIndex = this.turnOrder.indexOf(bb);
    } else {
      const active = this.turnOrder.filter(
        (id) => !this.players.get(id)?.hasFolded
      );
      this.currentTurnIndex = this.turnOrder.indexOf(active[0]);
    }
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

    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
  }
}

module.exports = PokerGame;
