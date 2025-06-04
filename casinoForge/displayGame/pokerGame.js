const Ranker = require("handranker");
const CardGame = require("./cardGame");
const PokerPlayer = require("./pokerPlayer");

class PokerGame extends CardGame {
  constructor(options = {}) {
    super(options);
    this.players = new Map();
    this.turnOrder = [];
    this.currentTurnIndex = 0;
    this.pot = 0;
    this.street = "preflop";
    this.showdownResolved = false;
    this.seatedButWaiting = new Set();
    this.lastBetAmount = 0;
    this.dealerId = null;
    this.smallBlind = options.smallBlind || 10;
    this.bigBlind = options.bigBlind || 20;
    this.maxPlayers = options.maxPlayers || 9;
    this.minPlayers = options.minPlayers || 2;
  }

  init() {
    console.log("PokerGame initialized with options:", this.options);
    console.log("PokerGame init — players:", [...this.players.entries()]);

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

  addPlayer(id, seatIndex) {
    console.log(`🪑 Adding player ${id} to seat ${seatIndex}`);

    if (!this.players.has(id)) {
      const player = new PokerPlayer({ seatIndex, playerId: id });
      this.players.set(id, player);

      // If game is active, mark them as waiting for next hand
      if (this.started && this.street !== "showdown") {
        console.log(`⏳ Player ${id} will join next hand (game in progress)`);
        this.seatedButWaiting.add(id);
      } else {
        console.log(`✅ Player ${id} joins immediately (no active hand)`);
      }
    } else {
      console.log(`⚠️ Player ${id} already exists, updating seat index`);
      this.players.get(id).seatIndex = seatIndex;
    }
  }

  startNewHand(testConfig = null) {
    console.log("Starting new hand with testConfig:", testConfig);

    this.started = true;

    // Use inherited deck preparation from CardGame
    this.prepareDeck();

    console.log(`📝 Players waiting to join: ${[...this.seatedButWaiting]}`);

    // Include newly seated players
    for (const id of this.seatedButWaiting) {
      const player = this.players.get(id);
      if (player) {
        player.resetForNewHand();
      }
    }

    // Reset all players for new hand
    for (const player of this.players.values()) {
      player.resetForNewHand();
    }

    // Filter and sort players by seatIndex
    const activePlayers = [...this.players.entries()]
      .filter(([_, p]) => typeof p.seatIndex === "number")
      .sort(([, a], [, b]) => a.seatIndex - b.seatIndex);

    this.turnOrder = activePlayers.map(([id]) => id);
    this.seatedButWaiting.clear();

    // Rotate dealer by seatIndex
    const sortedSeats = activePlayers.map(([_, p]) => p.seatIndex);
    sortedSeats.sort((a, b) => a - b);

    let lastButtonSeat = this.dealerId
      ? this.players.get(this.dealerId)?.seatIndex
      : null;
    let buttonSeat;

    if (lastButtonSeat != null && sortedSeats.includes(lastButtonSeat)) {
      const idx = sortedSeats.indexOf(lastButtonSeat);
      buttonSeat = sortedSeats[(idx + 1) % sortedSeats.length];
    } else {
      buttonSeat = sortedSeats[0];
    }

    const dealerEntry = activePlayers.find(
      ([_, p]) => p.seatIndex === buttonSeat
    );
    this.dealerId = dealerEntry[0];

    // HEADS-UP FIX: SB = dealer, BB = other player
    let sbSeat, bbSeat;
    if (sortedSeats.length === 2) {
      sbSeat = buttonSeat;
      bbSeat = sortedSeats.find((s) => s !== sbSeat);
    } else {
      const seatAfter = (seat) => {
        const idx = sortedSeats.indexOf(seat);
        return sortedSeats[(idx + 1) % sortedSeats.length];
      };
      sbSeat = seatAfter(buttonSeat);
      bbSeat = seatAfter(sbSeat);
    }

    // Deal cards using inherited method from CardGame
    const hands = this.dealCards(2, this.turnOrder);

    // Assign roles and hands
    for (const [id, player] of this.players.entries()) {
      player.resetForNewHand();
      player.hand = testConfig?.hands?.[id] || hands[id] || [];
      player.isDealer = player.seatIndex === buttonSeat;
      player.isSB = player.seatIndex === sbSeat;
      player.isBB = player.seatIndex === bbSeat;
    }

    // Handle test configuration for community cards
    if (testConfig?.board) {
      this.communityCards = [...testConfig.board];
    } else {
      this.communityCards = [];
    }

    this.street = this.communityCards.length ? "showdown" : "preflop";

    this._postBlinds();
    this._setInitialTurnIndex();

    console.log("gameState", this.getGameDetails());
    console.log("privateHands", this.getPrivateHands());

    return {
      gameState: this.getGameDetails(),
      private: this.getPrivateHands(),
    };
  }

  getPrivateHands(observers = []) {
    const privateMap = {};
    const isShowdown = this.street === "showdown";

    const allViewers = [...this.players.keys(), ...observers];

    for (const viewerId of allViewers) {
      const handsView = {};
      let myHand = [];

      for (const [id, p] of this.players.entries()) {
        const visible = isShowdown || viewerId === id;
        handsView[id] = visible ? [...p?.hand] : ["X", "X"];
        if (viewerId === id) myHand = [...p.hand];
      }

      privateMap[viewerId] = {
        hands: handsView,
        hand: myHand,
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

    player.hasActedThisRound = true;
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
      this._setInitialTurnIndex();
    }

    return null;
  }

  _isRoundComplete() {
    const active = this.turnOrder.filter((id) => {
      const p = this.players.get(id);
      return !p.hasFolded && !p.isAllIn;
    });

    const bets = active.map((id) => this.players.get(id).bet);
    const allBetsMatch = new Set(bets).size <= 1;
    const allHaveActed = active.every(
      (id) => this.players.get(id).hasActedThisRound
    );

    console.log(`🧮 [_isRoundComplete] bets:`, bets);
    console.log(`✅ Bets match? ${allBetsMatch}, All acted? ${allHaveActed}`);

    return allBetsMatch && allHaveActed;
  }

  _advanceStreet() {
    this.lastBetAmount = 0;
    for (const player of this.players.values()) {
      player.bet = 0;
      player.hasActedThisRound = false;
    }

    switch (this.street) {
      case "preflop":
        this.dealCommunityCards(3); // Deal the flop
        this.street = "flop";
        break;
      case "flop":
        this.dealCommunityCards(1); // Deal the turn
        this.street = "turn";
        break;
      case "turn":
        this.dealCommunityCards(1); // Deal the river
        this.street = "river";
        break;
      case "river":
        this.street = "showdown";
        break;
    }
    this._setInitialTurnIndex();
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
      revealedHands: [...this.players.entries()]
        .filter(([_, p]) => Array.isArray(p.hand) && p.hand.length > 0)
        .map(([id, p]) => ({
          playerId: id,
          hand: p.hand,
        })),
    };
  }

  _setInitialTurnIndex() {
    const numPlayers = this.turnOrder.length;
    if (numPlayers === 0) {
      this.currentTurnIndex = null;
      return;
    }

    const activePlayers = this.turnOrder.filter((id) => {
      const p = this.players.get(id);
      return p && !p.hasFolded && !p.isAllIn;
    });

    if (activePlayers.length === 0) {
      this.currentTurnIndex = null;
      return;
    }

    // HEADS-UP SPECIAL CASE
    if (numPlayers === 2) {
      const sb = this.turnOrder.find((id) => this.players.get(id)?.isSB);
      const bb = this.turnOrder.find((id) => this.players.get(id)?.isBB);
      const firstToAct = this.street === "preflop" ? sb : bb; // SB acts first preflop in HU
      this.currentTurnIndex = this.turnOrder.indexOf(firstToAct);
      return;
    }

    // MULTI-PLAYER (3+)
    if (this.street === "preflop") {
      // Preflop: first to act is first active player left of BB
      const bbIndex = this.turnOrder.findIndex(
        (id) => this.players.get(id)?.isBB
      );

      for (let i = 1; i < numPlayers; i++) {
        const candidateIndex = (bbIndex + i) % numPlayers;
        const candidateId = this.turnOrder[candidateIndex];
        const p = this.players.get(candidateId);
        if (p && !p.hasFolded && !p.isAllIn) {
          this.currentTurnIndex = candidateIndex;
          return;
        }
      }
    } else {
      // Post-flop: first to act is SB (or first active player after SB if SB folded)
      const sbIndex = this.turnOrder.findIndex(
        (id) => this.players.get(id)?.isSB
      );

      // Start from SB and find first active player
      for (let i = 0; i < numPlayers; i++) {
        const candidateIndex = (sbIndex + i) % numPlayers;
        const candidateId = this.turnOrder[candidateIndex];
        const p = this.players.get(candidateId);
        if (p && !p.hasFolded && !p.isAllIn) {
          this.currentTurnIndex = candidateIndex;
          return;
        }
      }
    }

    // Fallback to first active player
    this.currentTurnIndex = this.turnOrder.indexOf(activePlayers[0]);
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
    console.log(
      "this.buttonIndex",
      this.players.get(this.dealerId)?.seatIndex ?? null
    );

    return {
      ...base,
      players: playerData,
      pot: this.pot,
      street: this.street,
      turn: this.turnOrder?.[this.currentTurnIndex] || null,
      currentTurnIndex: this.currentTurnIndex,
      buttonIndex: this.players.get(this.dealerId)?.seatIndex ?? null,
    };
  }

  removePlayer(id) {
    const player = this.players.get(id);
    if (!player) return;

    console.log(`🚪 Removing player ${id} from game`);

    // 🫳 Fold the hand if still active
    if (!player.hasFolded && !player.isAllIn) {
      player.hasFolded = true;
      console.log(`🙈 Player ${id} auto-folded on removal`);
    }

    // 💸 Move any outstanding bet into the pot
    if (player.bet > 0) {
      this.pot += player.bet;
      player.bet = 0;
      console.log(`💰 Added ${player.bet} chips from ${id} to pot`);
    }

    // ❌ Remove from players and turn order
    this.players.delete(id);
    this.turnOrder = this.turnOrder.filter((pid) => pid !== id);

    // 🧠 Recalculate turn index if needed
    if (this.currentTurnIndex >= this.turnOrder.length) {
      this.currentTurnIndex = 0;
    }

    console.log(`🧹 Player ${id} removed. Pot: ${this.pot}`);
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
