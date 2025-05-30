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
    this.seatedButWaiting = new Set();
    this.buttonPosition = 0;
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
    // Activate any players who joined mid-hand
    for (const id of this.seatedButWaiting) {
      if (!this.players.has(id)) continue;
      this.players.get(id).hasFolded = false;
    }
    this.seatedButWaiting.clear(); // 👈 they're now part of the new hand

    console.log("🟢 Starting new hand with seatMap:", seatMap);
    console.log("Test config:", testConfig);
    this.started = true;
    this.deck = this._generateDeck();

    const sortedPlayers = Array.from(seatMap.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([playerId]) => playerId);

    this.turnOrder = sortedPlayers;

    if (this.turnOrder.length === 2) {
      // Heads-up: button alternates each hand
      this.buttonPosition = (this.buttonPosition + 1) % 2;
    } else if (this.turnOrder.length > 2) {
      // Multi-way: advance button position
      this.buttonPosition = (this.buttonPosition + 1) % this.turnOrder.length;
    }

    for (const id of this.turnOrder) {
      const player = this.players.get(id);
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
    this.pot = 0;
    this.blindInfo = {};
    this._postBlinds();
    this._setInitialTurnIndex();
    this.seatedButWaiting.clear();
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
  _postBlinds() {
    const numPlayers = this.turnOrder.length;

    if (numPlayers === 2) {
      // Heads-up: Button posts small blind, other player posts big blind
      const smallBlindId = this.turnOrder[this.buttonPosition];
      const bigBlindId = this.turnOrder[(this.buttonPosition + 1) % 2];

      this.players.get(smallBlindId).stack -= this.smallBlind;
      this.players.get(smallBlindId).bet = this.smallBlind;

      this.players.get(bigBlindId).stack -= this.bigBlind;
      this.players.get(bigBlindId).bet = this.bigBlind;

      this.blindInfo = {
        [smallBlindId]: "SB",
        [bigBlindId]: "BB",
      };
    } else {
      // 3+ players: Small blind is 1 left of button, big blind is 2 left of button
      const smallBlindId =
        this.turnOrder[(this.buttonPosition + 1) % numPlayers];
      const bigBlindId = this.turnOrder[(this.buttonPosition + 2) % numPlayers];

      this.players.get(smallBlindId).stack -= this.smallBlind;
      this.players.get(smallBlindId).bet = this.smallBlind;

      this.players.get(bigBlindId).stack -= this.bigBlind;
      this.players.get(bigBlindId).bet = this.bigBlind;

      this.blindInfo = {
        [smallBlindId]: "SB",
        [bigBlindId]: "BB",
      };
    }

    this.pot = this.smallBlind + this.bigBlind;
  }

  addPlayer(playerId) {
    if (!this.players.has(playerId)) {
      this.players.set(playerId, {
        stack: 1000,
        hasFolded: false,
        bet: 0,
        hand: [],
      });

      if (this.started) {
        this.seatedButWaiting.add(playerId); // 👈 wait until next hand
      } else {
        this._recalculateTurnOrder();
      }
    }
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
    this._recalculateTurnOrder();
  }

  _recalculateTurnOrder() {
    this.turnOrder = Array.from(this.players.keys());
  }

  // _setInitialTurnIndex(smallBlindId, bigBlindId) {
  //   if (this.turnOrder.length === 2) {
  //     // Heads-up: SB (dealer) acts first preflop
  //     this.currentTurnIndex = this.turnOrder.indexOf(smallBlindId);
  //   } else {
  //     const active = this.turnOrder.filter(
  //       (id) =>
  //         !this.players.get(id)?.hasFolded && this.players.get(id)?.stack > 0
  //     );
  //     const idx = active.indexOf(bigBlindId);
  //     this.currentTurnIndex = this.turnOrder.indexOf(
  //       active[(idx + 1) % active.length]
  //     );
  //   }
  // }

  // REPLACE THE ENTIRE METHOD:
  _setInitialTurnIndex() {
    const numPlayers = this.turnOrder.length;

    if (numPlayers === 2) {
      // Heads-up: Small blind (button) acts first preflop
      this.currentTurnIndex = this.buttonPosition;
    } else {
      // 3+ players: UTG acts first preflop (3 seats left of button, or next after BB)
      this.currentTurnIndex = (this.buttonPosition + 3) % numPlayers;
    }
  }

  getCurrentTurn() {
    if (this.turnOrder.length === 0) return null;
    return this.turnOrder[this.currentTurnIndex];
  }

  getPrivateHands() {
    const hands = {};
    // Only return hands for players actually in this hand
    for (const playerId of this.turnOrder) {
      const player = this.players.get(playerId);
      if (player) {
        hands[playerId] = [...player.hand];
      }
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
    const bet = this.bigBlind * 2;
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
