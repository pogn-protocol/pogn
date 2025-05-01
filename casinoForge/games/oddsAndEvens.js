const BaseGame = require("../baseGame");

class OddsAndEvens extends BaseGame {
  constructor() {
    super(); // Call the parent constructor
    // super({
    //   baseGameOptions: {
    //     minPlayers: 2,
    //     maxPlayers: 2,
    //     rounds: 5, // Using the rounds property from BaseGame
    //   },
    //   roleList: ["odds", "evens"], // Using roleList from TurnBasedGame
    // });
    this.minPlayers = 2; // Minimum players for the game
    this.maxPlayers = 2; // Maximum players for the game
    //this.rounds = 1; // Total rounds for the game
    this.round = 1; // Current round
    this.roleList = ["odds", "evens"]; // Roles for the game

    this.playerChoices = {}; // Stores each player's choice for the current round
    this.scores = {}; // Track player scores
    this.roundResults = []; // Track results of each round
  }

  init() {
    console.log("[OddsAndEvens] init() called with this.players", this.players);
    this.roles = this.assignRoles(["odds", "evens"]);
    // this.currentTurn = Object.keys(this.roles)[0];
    Object.keys(this.roles).forEach((playerId) => {
      this.scores[playerId] = 0;
    });

    console.log("[OddsAndEvens] Game started with roles:", this.roles);
    console.log("[OddsAndEvens] game details:", this.getOddsAndEvensDetails());
    console.log("rounds", this.rounds);

    return {
      gameAction: "gameStarted",
      roles: this.roles,
      round: this.round,
      scores: this.scores,
      gameStatus: this.gameStatus,
      rounds: this.rounds,
      message: "Game started! Choose a number between 1 and 5.",
    };
  }

  getOddsAndEvensDetails() {
    return {
      ...this.getGameDetails(), // Include game details from BaseGame
      roundResults: this.roundResults,
      scores: this.scores,
    };
  }

  processAction(playerId, payload) {
    const { gameAction, number } = payload;

    console.log("[OddsAndEvens] processAction called with:", payload);
    console.log("[OddsAndEvens] playerId:", playerId);

    if (gameAction !== "chooseNumber") {
      return { type: "error", message: "Unknown action." };
    }

    if (this.gameStatus === "complete") {
      return { message: "Game is over." };
    }

    if (typeof number !== "number" || number < 1 || number > 5) {
      return {
        type: "error",
        message: "Please choose a number between 1 and 5.",
      };
    }

    this.playerChoices[playerId] = number;
    this.logAction({
      logEntry: `Player ${playerId} chose ${number}`,
      playerId,
      action: "chooseNumber",
      value: number,
    });

    const playerIds = Object.keys(this.roles);
    const allPlayersChosen = playerIds.every(
      (id) => this.playerChoices[id] !== undefined
    );

    if (!allPlayersChosen) {
      return {
        playerId,
        gameAction: "numberChosen",
        round: this.round,
        rounds: this.rounds,
        message: `Player ${playerId} chose number.`,
        private: { yourChoice: number },
      };
    }

    // Calculate results
    const player1Id = playerIds[0];
    const player2Id = playerIds[1];
    const sum = this.playerChoices[player1Id] + this.playerChoices[player2Id];
    const isOdd = sum % 2 === 1;

    // Determine winner of this round
    let roundWinnerId = null;
    playerIds.forEach((id) => {
      if (
        (this.roles[id] === "odds" && isOdd) ||
        (this.roles[id] === "evens" && !isOdd)
      ) {
        roundWinnerId = id;
        this.scores[id]++;
      }
    });

    // Save round result
    this.roundResults.push({
      round: this.round,
      choices: { ...this.playerChoices },
      sum,
      isOdd,
      roundWinner: roundWinnerId,
    });

    // Reset choices for next round
    this.playerChoices = {};

    // Check if game is over
    const isLastRound = this.round >= this.rounds;

    if (isLastRound) {
      this.gameStatus = "complete"; // Using consistent status from BaseGame

      // Determine overall winner
      const player1Score = this.scores[player1Id];
      const player2Score = this.scores[player2Id];

      if (player1Score > player2Score) {
        this.winner = player1Id;
      } else if (player2Score > player1Score) {
        this.winner = player2Id;
      } else {
        this.winner = "draw";
      }
    } else {
      // Move to next round using BaseGame's nextRound method
      this.nextRound();
      // Switch turns using TurnBasedGame's switchTurn method
      //this.switchTurn();
    }

    // Create result message
    const lastResult = this.roundResults[this.roundResults.length - 1];
    const roundResultMessage = `Round ${lastResult.round}: ${player1Id} chose ${
      lastResult.choices[player1Id]
    } and ${player2Id} chose ${lastResult.choices[player2Id]}. Sum: ${sum} (${
      isOdd ? "Odd" : "Even"
    })`;

    // Return game state
    return {
      gameAction: "roundCompleted",
      ...this.getOddsAndEvensDetails(), // Include all game details from all parent classes
      lastRoundResult: lastResult,
      winner: this.winner,

      message:
        this.gameStatus === "complete"
          ? `${roundResultMessage} Game over! ${
              this.winner === "draw"
                ? "It's a draw!"
                : `Player ${this.winner} wins!`
            }`
          : `${roundResultMessage} Starting round ${this.round}!`,
    };
  }
}

module.exports = OddsAndEvens;
