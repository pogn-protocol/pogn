const Ranker = require("handranker");
const TurnBasedGame = require("../gameClasses/turnBasedGame");
const PokerPlayer = require("./pokerPlayer");

class PokerGame extends TurnBasedGame {
  constructor(options = {}) {
    super(options);
    this.players = new Map();
    this.turnOrder = [];
    this.currentTurnIndex = 0;

    this.pot = 0;
    this.street = "preflop";
    this.communityCards = [];
    this.showdownResolved = false;
    this.seatedButWaiting = new Set();
    this.buttonIndex = 0;
    this.lastBetAmount = 0;

    this.smallBlind = 10;
    this.bigBlind = 20;
    this.maxPlayers = 9;
    this.minPlayers = 2;
  }

  init() {
    console.log("PokerGame initialized with options:", this.options);
    console.log("PokerGame init — players:", [...this.players.entries()]);

    // Replace any placeholder objects with real PokerPlayer instances
    let index = 0;
    for (const [id, data] of this.players.entries()) {
      if (!(data instanceof PokerPlayer)) {
        const seatIndex = data.seatIndex ?? index++;
        const player = new PokerPlayer({ playerId: id, seatIndex });
        this.players.set(id, player);
      }
    }

    return this.startNewHand();
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

  startNewHand(testConfig = null) {
    console.log("Starting new hand with testConfig:", testConfig);
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
    console.log("gameState", this.getGameDetails());
    console.log("privateHands", this.getPrivateHands());
    return {
      gameState: this.getGameDetails(),
      private: this.getPrivateHands(),
    };
  }

  getPrivateHands() {
    const privateMap = {};
    const isShowdown = this.street === "showdown";

    for (const [viewerId] of this.players.entries()) {
      const handsView = {};
      let myHand = [];

      for (const [id, p] of this.players.entries()) {
        const visible = isShowdown || viewerId === id;
        handsView[id] = visible ? [...p.hand] : ["X", "X"];
        if (viewerId === id) myHand = [...p.hand];
      }

      privateMap[viewerId] = {
        hands: handsView,
        hand: myHand, // 👈 personal hand directly
      };
    }

    return privateMap;
  }

  processAction(playerId, { gameAction, seatIndex, amount, testConfig }) {
    console.log(
      "playerId",
      playerId,
      "gameAction",
      gameAction,
      "seatIndex",
      seatIndex,
      "amount",
      amount,
      "testConfig",
      testConfig
    );
    switch (gameAction) {
      case "sit":
        this.addPlayer(playerId, seatIndex);
        return { gameState: this.getGameDetails() };
      case "leave":
        this.removePlayer(playerId);
        return { gameState: this.getGameDetails() };
      case "startHand":
        return this.startNewHand(testConfig);
      case "bet":
      case "check":
      case "fold":
      case "call":
      case "raise":
      case "allin":
        const result = this.gameAction(playerId, {
          action: gameAction,
          amount,
        });
        return {
          broadcast: true,
          gameState: this.getGameDetails(),
          botTurn: this.getCurrentTurn(),
          ...(result || {}),
        };
      default:
        return null;
    }
  }

  gameAction(playerId, { action, amount }) {
    console.log(
      `🎮 [gameAction] Player ${playerId} attempting ${action} ${amount ?? ""}`
    );

    if (playerId !== this.getCurrentTurn()) {
      console.warn(`⛔ [gameAction] Not ${playerId}'s turn`);
      return;
    }

    const player = this.players.get(playerId);
    if (!player || player.hasFolded || player.isAllIn) {
      console.warn(`⛔ [gameAction] Invalid player or already folded/all-in`);
      return;
    }

    const maxBet = Math.max(...[...this.players.values()].map((p) => p.bet));
    console.log(`💰 [gameAction] Max bet on table: ${maxBet}`);

    switch (action) {
      case "fold":
        player.hasFolded = true;
        console.log(`🙈 [gameAction] ${playerId} folds`);
        break;

      case "check":
        if (player.bet < maxBet) {
          console.warn(
            `⛔ [gameAction] Check denied — player bet ${player.bet} < max ${maxBet}`
          );
          return;
        }
        console.log(`✅ [gameAction] ${playerId} checks`);
        break;

      case "call": {
        const callAmount = maxBet - player.bet;
        const contribution = Math.min(callAmount, player.stack);
        player.stack -= contribution;
        player.bet += contribution;
        this.pot += contribution;
        if (player.stack === 0) player.isAllIn = true;
        console.log(
          `📞 [gameAction] ${playerId} calls ${contribution}, stack: ${player.stack}`
        );
        break;
      }

      case "bet":
        if (amount <= 0 || amount > player.stack) {
          console.warn(`⛔ [gameAction] Invalid bet amount: ${amount}`);
          return;
        }
        this.lastBetAmount = amount;
        player.stack -= amount;
        player.bet += amount;
        this.pot += amount;
        console.log(
          `💸 [gameAction] ${playerId} bets ${amount}, stack: ${player.stack}`
        );
        break;

      case "raise": {
        const raiseTo = amount;
        const raiseAmount = raiseTo - player.bet;
        if (
          raiseAmount < this.lastBetAmount ||
          raiseTo <= maxBet ||
          raiseAmount > player.stack
        ) {
          console.warn(
            `⛔ [gameAction] Invalid raise to ${raiseTo} (raiseAmount ${raiseAmount}, lastBet ${this.lastBetAmount})`
          );
          return;
        }
        player.stack -= raiseAmount;
        player.bet += raiseAmount;
        this.pot += raiseAmount;
        this.lastBetAmount = raiseAmount;
        console.log(
          `🚀 [gameAction] ${playerId} raises to ${raiseTo} (added ${raiseAmount}), stack: ${player.stack}`
        );
        break;
      }

      case "allin":
        this.pot += player.stack;
        player.bet += player.stack;
        console.log(
          `💥 [gameAction] ${playerId} goes ALL IN for ${player.stack}`
        );
        player.stack = 0;
        player.isAllIn = true;
        break;
    }

    const postTurn = this._advanceTurn();
    console.log(
      `🔁 [gameAction] Turn advanced. Next turn: ${this.getCurrentTurn()}`
    );
    return postTurn;
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
    const flat = ordered.flat().map((r) => ({
      id: r.id,
      description: r.description,
      ranking: r.ranking,
    }));
    const winner = flat[0]?.id;
    if (winner) this.players.get(winner).stack += this.pot;
    this.pot = 0;

    return {
      broadcast: true,
      gameState: this.getGameDetails(),
      showdownWinner: winner,
      showdownResults: flat,
      revealedHands: hands.map(({ id, cards }) => ({
        playerId: id,
        hand: cards,
      })),
    };
  }

  _setInitialTurnIndex() {
    const numPlayers = this.turnOrder.length;
    if (numPlayers === 0) {
      this.currentTurnIndex = null;
      return;
    }

    // Heads-up: SB acts first preflop
    if (numPlayers === 2) {
      this.currentTurnIndex = (this.buttonIndex + 1) % numPlayers;
    } else {
      this.currentTurnIndex = (this.buttonIndex + 3) % numPlayers;
    }
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

  getGameDetails() {
    const base = super.getGameDetails();
    console.log("base", base);
    console.log("this.players", this.players);
    const playerData = {};

    for (const [id, p] of this.players.entries()) {
      playerData[id] = {
        seatIndex: p.seatIndex,
        stack: p.stack,
        bet: p.bet,
        // hand: Array.isArray(p.hand) ? [...p.hand] : [],
        hasFolded: p.hasFolded,
        isDealer: p.isDealer,
        isSB: p.isSB,
        isBB: p.isBB,
        isAllIn: p.isAllIn,
      };
    }
    console.log("playerData", playerData);
    console.log("turn", this.turnOrder?.[this.currentTurnIndex] || null);
    console.log("this.turnOrder", this.turnOrder);
    console.log("this.currentTurnIndex", this.currentTurnIndex);
    console.log("this.buttonIndex", this.buttonIndex);
    return {
      ...base,
      players: playerData,
      pot: this.pot,
      street: this.street,
      communityCards: this.communityCards,
      turn: this.turnOrder?.[this.currentTurnIndex] || null,
      currentTurnIndex: this.currentTurnIndex,
      buttonIndex: this.buttonIndex,
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

  addPlayer(id, seatIndex) {
    if (!this.players.has(id)) {
      this.players.set(id, new PokerPlayer({ seatIndex, playerId: id }));
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
      gameState: this.getGameDetails(),
      showdownWinner: id,
    };
  }
}

module.exports = PokerGame;
