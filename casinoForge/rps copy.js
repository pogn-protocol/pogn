class RockPaperScissors {
  constructor() {
    this.choices = {}; // { playerId: "rock"/"paper"/"scissors" }
    this.players = new Map();
    this.state = "waiting";
    this.minPlayers = 2;
    this.maxPlayers = 2;
  }

  getGameDetails() {
    return {
      gameStatus: this.state,
      minPlayers: this.minPlayers,
      maxPlayers: this.maxPlayers,
    };
  }

  makeChoice(playerId, choice) {
    const valid = ["rock", "paper", "scissors"];
    if (!valid.includes(choice)) {
      return {
        gameType: "rock-paper-scissors",
        gameAction: "error",
        message: "Invalid choice.",
      };
    }

    this.choices[playerId] = choice;

    if (!this.players.has(playerId)) {
      this.players.set(playerId, { playerId });
    }

    if (Object.keys(this.choices).length === 2) {
      return this.determineWinner();
    }

    return {
      gameType: "rock-paper-scissors",
      gameAction: "waiting",
      message: "Waiting for opponent...",
    };
  }

  determineWinner() {
    const rules = { rock: "scissors", paper: "rock", scissors: "paper" };
    const [p1, p2] = Object.keys(this.choices);
    const c1 = this.choices[p1];
    const c2 = this.choices[p2];

    this.state = "complete";

    if (c1 === c2) {
      return {
        gameType: "rock-paper-scissors",
        gameAction: "draw",
        choices: this.choices,
      };
    }

    const winner = rules[c1] === c2 ? p1 : p2;
    const loser = winner === p1 ? p2 : p1;

    return {
      gameStatus: this.state,
      gameType: "rock-paper-scissors",
      gameAction: "results",
      winner,
      loser,
      choices: { [p1]: c1, [p2]: c2 },
    };
  }

  processAction(playerId, payload) {
    const { gameAction } = payload;
    if (!gameAction) {
      return {
        gameType: "rock-paper-scissors",
        gameAction: "error",
        message: "Missing gameAction.",
      };
    }

    return this.makeChoice(playerId, gameAction);
  }
}

module.exports = RockPaperScissors;
