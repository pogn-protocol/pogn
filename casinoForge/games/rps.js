const BaseGame = require("../gameClasses/baseGame");

class RockPaperScissors extends BaseGame {
  constructor() {
    super({ baseGameOptions: { minPlayers: 2, maxPlayers: 2 } });
    this.choices = {};
    this.scores = {};
    this.roundResults = [];
    this.winner = null;
    this.maxPlayers = 2;
    this.minPlayers = 2;
    this.rounds = 1;
  }

  init() {
    console.log("[RockPaperScissors] init() called");

    // 🧠 Initialize score tracking
    for (const id of this.players.keys()) {
      this.scores[id] = 0;
    }

    return {
      gameAction: "gameStarted",
      message: "Game started! Choose rock, paper, or scissors.",
      ...this.getGameDetails?.(),
    };
  }

  processAction(playerId, payload) {
    console.log("payload", payload);
    const { gameAction } = payload;
    const valid = ["rock", "paper", "scissors"];

    if (!valid.includes(gameAction)) {
      return {
        type: "error",
        message: "Invalid choice. Must be rock, paper, or scissors.",
      };
    }

    this.choices[playerId] = gameAction;

    this.logAction?.({
      logEntry: `Player ${playerId} chose ${gameAction}`,
      playerId,
      action: "choose",
      value: gameAction,
    });

    const waitingForSecond = Object.keys(this.choices).length < 2;

    if (waitingForSecond) {
      return {
        gameAction: "playerChose",
        private: {
          yourChoice: gameAction,
        },
        ...this.getGameDetails?.(),
      };
    }

    const [p1, p2] = Object.keys(this.choices);
    const c1 = this.choices[p1];
    const c2 = this.choices[p2];
    const rules = { rock: "scissors", paper: "rock", scissors: "paper" };

    let roundWinner = null;
    let draw = false;

    if (c1 === c2) {
      draw = true;
    } else {
      roundWinner = rules[c1] === c2 ? p1 : p2;
      this.scores[roundWinner] = (this.scores[roundWinner] || 0) + 1;
    }

    this.roundResults.push({
      round: this.round,
      choices: { ...this.choices },
      roundWinner,
      draw,
    });

    this.choices = {};

    let message = draw
      ? `Round ${this.round} is a draw. Both chose ${c1}.`
      : `Round ${this.round} winner: Player ${roundWinner}.`;

    if (
      typeof this.rounds === "number" &&
      this.rounds > 0 &&
      this.round >= this.rounds
    ) {
      this.gameStatus = "complete";
      const [score1, score2] = [this.scores[p1] || 0, this.scores[p2] || 0];
      this.winner = score1 > score2 ? p1 : score2 > score1 ? p2 : "draw";

      message += ` Game over! ${
        this.winner === "draw" ? "It's a draw!" : `Player ${this.winner} wins!`
      }`;
    } else {
      this.nextRound?.();
      message += ` Starting round ${this.round}!`;
    }

    return {
      gameAction: "roundCompleted",
      lastRoundResult: this.roundResults.at(-1),
      scores: this.scores,
      winner: this.winner,
      message,
      ...this.getGameDetails?.(),
    };
  }
}

module.exports = RockPaperScissors;
