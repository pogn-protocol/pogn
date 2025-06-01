const TurnBasedGame = require("./baseClasses/turnBasedGame");

class CardGame extends TurnBasedGame {
  constructor(options = {}) {
    super(options);
    this.deck = [];
    this.discardPile = [];
    this.communityCards = [];
    this.deckType = options.deckType || "standard"; // 'standard', 'uno', 'custom'
    this.shuffleOnDeal = options.shuffleOnDeal !== false; // default true
  }

  // Standard 52-card deck generation
  _generateStandardDeck() {
    const suits = ["s", "h", "d", "c"]; // spades, hearts, diamonds, clubs
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

    return deck;
  }

  // Customizable deck generation - can be overridden by subclasses
  _generateDeck() {
    switch (this.deckType) {
      case "standard":
        return this._generateStandardDeck();
      case "custom":
        return this._generateCustomDeck();
      default:
        return this._generateStandardDeck();
    }
  }

  // Override this in subclasses for custom decks
  _generateCustomDeck() {
    return this._generateStandardDeck();
  }

  // Fisher-Yates shuffle algorithm
  shuffleDeck(deck = this.deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Initialize and shuffle deck
  prepareDeck() {
    this.deck = this._generateDeck();
    if (this.shuffleOnDeal) {
      this.deck = this.shuffleDeck(this.deck);
    }
    this.discardPile = [];
    return this.deck;
  }

  // Deal cards to players
  dealCards(numCards, playerIds = null) {
    const targetPlayers = playerIds || Array.from(this.players.keys());
    const hands = {};

    for (const playerId of targetPlayers) {
      hands[playerId] = [];
      for (let i = 0; i < numCards; i++) {
        if (this.deck.length > 0) {
          hands[playerId].push(this.deck.pop());
        }
      }
    }

    return hands;
  }

  // Deal a single card
  dealCard() {
    return this.deck.length > 0 ? this.deck.pop() : null;
  }

  // Deal community cards (useful for poker, blackjack dealer card, etc.)
  dealCommunityCards(numCards) {
    const cards = [];
    for (let i = 0; i < numCards; i++) {
      if (this.deck.length > 0) {
        cards.push(this.deck.pop());
      }
    }
    this.communityCards.push(...cards);
    return cards;
  }

  // Discard cards
  discardCards(cards) {
    if (Array.isArray(cards)) {
      this.discardPile.push(...cards);
    } else {
      this.discardPile.push(cards);
    }
  }

  // Reshuffle discard pile back into deck
  reshuffleDiscardPile() {
    this.deck.push(...this.discardPile);
    this.discardPile = [];
    if (this.shuffleOnDeal) {
      this.deck = this.shuffleDeck(this.deck);
    }
  }

  // Get remaining cards in deck
  getRemainingCards() {
    return this.deck.length;
  }

  // Reset for new hand/round
  resetCards() {
    this.communityCards = [];
    this.discardPile = [];
    this.prepareDeck();
  }

  // Card utility methods
  parseCard(cardString) {
    if (typeof cardString !== "string" || cardString.length < 2) {
      return null;
    }

    const value = cardString.slice(0, -1);
    const suit = cardString.slice(-1);

    return { value, suit, card: cardString };
  }

  getCardValue(cardString, aceHigh = true) {
    const parsed = this.parseCard(cardString);
    if (!parsed) return 0;

    const { value } = parsed;

    switch (value) {
      case "A":
        return aceHigh ? 14 : 1;
      case "K":
        return 13;
      case "Q":
        return 12;
      case "J":
        return 11;
      case "T":
        return 10;
      default:
        return parseInt(value) || 0;
    }
  }

  getCardSuit(cardString) {
    const parsed = this.parseCard(cardString);
    return parsed ? parsed.suit : null;
  }

  // Sort cards by value
  sortCards(cards, aceHigh = true) {
    return [...cards].sort((a, b) => {
      return this.getCardValue(a, aceHigh) - this.getCardValue(b, aceHigh);
    });
  }

  // Group cards by suit
  groupBySuit(cards) {
    const groups = { s: [], h: [], d: [], c: [] };
    cards.forEach((card) => {
      const suit = this.getCardSuit(card);
      if (groups[suit]) {
        groups[suit].push(card);
      }
    });
    return groups;
  }

  // Group cards by value
  groupByValue(cards) {
    const groups = {};
    cards.forEach((card) => {
      const value = this.parseCard(card)?.value;
      if (value) {
        if (!groups[value]) groups[value] = [];
        groups[value].push(card);
      }
    });
    return groups;
  }

  // Get game details with card-specific information
  getGameDetails() {
    const baseDetails = super.getGameDetails();

    return {
      ...baseDetails,
      communityCards: [...this.communityCards],
      deckSize: this.deck.length,
      discardPileSize: this.discardPile.length,
    };
  }
}

module.exports = CardGame;
