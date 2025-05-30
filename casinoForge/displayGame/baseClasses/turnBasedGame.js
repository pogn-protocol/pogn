const BaseGame = require("./baseGame"); // Import the BaseGame class

class TurnBasedGame extends BaseGame {
  constructor(options = {}) {
    console.log("[TurnBasedGame] Constructor called with options:", options);
    super(options.baseGameOptions);
    this.roleList = options.roleList || [];
    this.currentTurn = null;
    this.winner = null;
    this.movesMade = 0;

    this.turn = 1; // ✅ NEW
  }

  switchTurn() {
    if (this.gameStatus === "complete") {
      console.log("[TurnBasedGame] Game is complete, cannot switch turn.");
      return;
    }

    console.log("[TurnBasedGame] Switching turn from:", this.currentTurn);
    const ids = Object.keys(this.roles);
    const idx = ids.indexOf(this.currentTurn);
    const next = ids[(idx + 1) % ids.length];

    console.log("[TurnBasedGame] ids:", ids);
    console.log("[TurnBasedGame] Current index:", idx);
    console.log("[TurnBasedGame] Next index:", next);
    console.log("[TurnBasedGame] Current round:", this.round);
    console.log("[TurnBasedGame] Rounds:", this.rounds);

    if (next === ids[0]) {
      console.log(
        "[TurnBasedGame] Next turn wraps to first player, advancing round via BaseGame"
      );
      this.nextRound(); // ✅ Use base class logic
      if (this.gameStatus === "complete") {
        console.log("[TurnBasedGame] Game is now complete after nextRound()");
        return;
      }
    }

    this.currentTurn = next;
    this.turn += 1;
    console.log("[TurnBasedGame] Turn incremented to:", this.turn);
    console.log("[TurnBasedGame] Next turn:", this.currentTurn);
  }

  getTurnState() {
    return {
      currentTurn: this.currentTurn,
      gameStatus: this.gameStatus,
      turn: this.turn, // ✅ INCLUDE turn number
    };
  }

  getGameDetails() {
    console.log("[TurnBasedGame] getGameDetails called.");
    let superDetails = super.getGameDetails();
    console.log("[TurnBasedGame] Super game details:", superDetails);
    let turnBasedDetails = {
      currentTurn: this.currentTurn,
      //gameStatus: this.gameStatus,
      turn: this.turn, // ✅ Include turn number
    };
    console.log("[TurnBasedGame] Turn-based game details:", turnBasedDetails);
    return {
      ...superDetails,
      ...turnBasedDetails,
    };
  }
}

module.exports = TurnBasedGame;
