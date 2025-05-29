const Ranker = require("handranker");

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
        console.log(
          `🔄 Player ${playerId} action: ${action}, amount: ${amount}`
        );
        const result = this.processAction(playerId, { action, amount });
        console.log(
          `🔄 Result after processing action: ${JSON.stringify(result)}`
        );
        return {
          broadcast: true,
          updates: this.getGameDetails(),
          botTurn: this.getCurrentTurn(),
          ...(result || {}), // ✅ add showdownWinner/results if present
        };
      default:
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

  startNewHand(seatMap, testConfig = null) {
    console.log("🟢 Starting new hand with seatMap:", seatMap);
    console.log("Test config:", testConfig);
    this.started = true;
    this.deck = this._generateDeck();

    const sortedPlayers = Array.from(seatMap.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([playerId]) => playerId);

    this.turnOrder = sortedPlayers;

    if (this.turnOrder.length === 2) {
    } else if (this.turnOrder.length > 2) {
      this.turnOrder.push(this.turnOrder.shift());
    }

    for (const [id, player] of this.players.entries()) {
      player.hasFolded = false;
      player.bet = 0;
      player.hand = testConfig?.hands?.[id] || [
        this.deck.pop(),
        this.deck.pop(),
      ];
    }

    if (testConfig?.board) {
      console.log("Injecting test board:", testConfig.board);
      this.communityCards = [...testConfig.board];
      this.street = "showdown";
    } else {
      this.communityCards = [];
      this.street = "preflop";
    }

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

    // this.street = "preflop";
    // this.communityCards = [];

    this._setInitialTurnIndex(smallBlindId, bigBlindId);
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

  _setInitialTurnIndex(smallBlindId, bigBlindId) {
    if (this.turnOrder.length === 2) {
      // Heads-up: SB (dealer) acts first preflop
      this.currentTurnIndex = this.turnOrder.indexOf(smallBlindId);
    } else {
      const active = this.turnOrder.filter(
        (id) =>
          !this.players.get(id)?.hasFolded && this.players.get(id)?.stack > 0
      );
      const idx = active.indexOf(bigBlindId);
      this.currentTurnIndex = this.turnOrder.indexOf(
        active[(idx + 1) % active.length]
      );
    }
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
    return {
      started: this.started,
      players: Object.fromEntries(this.players),
      turn: this.getCurrentTurn(),
      pot: this.pot,
      blindInfo: this.blindInfo || {},
      street: this.street,
      communityCards: this.communityCards,
    };
  }

  _advanceTurn() {
    const active = this.turnOrder.filter(
      (id) => !this.players.get(id)?.hasFolded
    );

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
    console;
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

  // _advanceTurn() {
  //   const active = this.turnOrder.filter(
  //     (id) => !this.players.get(id)?.hasFolded
  //   );

  //   // If showdown, resolve the hand and stop turn progression
  //   if (this.street === "showdown") {
  //     return this.resolveShowdown();
  //   }

  //   // this._setInitialTurnIndex(
  //   //   this.turnOrder[0],
  //   //   this.turnOrder[1 % this.turnOrder.length]
  //   // );

  //   if (this._isRoundComplete()) {
  //     this._advanceStreet();

  //     // ⬇️ NEW: immediately check if we're now in showdown
  //     if (this.street === "showdown") {
  //       return this.resolveShowdown();
  //     }
  //   }

  //   return null;
  // }

  // resolveShowdown() {
  //   console.log("🟡 Resolving showdown...");

  //   const results = [];

  //   for (const [id, player] of this.players.entries()) {
  //     if (player.hasFolded) {
  //       console.log(`⏭️ Skipping folded player: ${id}`);
  //       continue;
  //     }

  //     const allCards = [...player.hand, ...this.communityCards];
  //     console.log(`🔍 Evaluating player ${id} with cards:`, allCards);

  //     try {
  //       const handResult = Ranker.getHand(allCards);
  //       console.log(
  //         `✅ Player ${id} hand:`,
  //         handResult.description,
  //         `(rank ${handResult.ranking})`
  //       );

  //       results.push({
  //         id,
  //         description: handResult.description,
  //         strength: handResult.ranking,
  //       });
  //     } catch (err) {
  //       console.error(`❌ Ranker error for ${id}:`, err);
  //     }
  //   }

  //   results.sort((a, b) => b.strength - a.strength); // Strongest hand first
  //   const winner = results[0]?.id;

  //   if (winner) {
  //     console.log(`🏆 Winner is ${winner}, awarding pot: ${this.pot}`);
  //     this.players.get(winner).stack += this.pot;
  //     this.pot = 0;
  //   } else {
  //     console.warn("⚠️ No winner determined!");
  //   }

  //   console.log("📊 Final showdown results:", results);

  //   return {
  //     broadcast: true,
  //     updates: this.getGameDetails(),
  //     showdownWinner: winner,
  //     showdownResults: results,
  //   };
  // }

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

  suggestBotAction(botId) {
    const bot = this.players.get(botId);
    if (!bot || bot.hasFolded) return null;
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

    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
  }
}

module.exports = PokerGame;
