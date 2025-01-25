class RockPaperScissors {
  constructor() {
    this.choices = {}; // Tracks player choices: { playerId: "rock/paper/scissors" }
    this.winningRules = {
      rock: "scissors",
      paper: "rock",
      scissors: "paper",
    };
    this.state = "waiting"; // Game states: waiting, in-progress, complete
    this.minPlayers = 2;
    this.maxPlayers = 2;
  }

  // Add a player choice
  makeChoice(playerId, choice) {
    if (!["rock", "paper", "scissors"].includes(choice)) {
      console.log("Invalid choice.");
      return { gameAction: "error", message: "Invalid choice." };
    }

    this.choices[playerId] = choice;

    // Check if all players have made their choice
    if (this.isReady()) {
      this.state = "complete";
    }

    return {
      gameAction: "choiceMade",
      logEntry: `playerId chose ${choice}`,
      state: this.state,
    };
  }

  // Determine if both players are ready
  isReady() {
    return Object.keys(this.choices).length === 2;
  }

  // Determine the winner of the game
  determineWinner() {
    if (!this.isReady()) {
      return {
        gameAction: "error",
        message: "Not enough choice to determine a winner.",
      };
    }

    const [player1, player2] = Object.keys(this.choices);
    const choice1 = this.choices[player1];
    const choice2 = this.choices[player2];

    if (choice1 === choice2) {
      return { gameAction: "draw", message: "It's a draw!" };
    }

    const winner = this.winningRules[choice1] === choice2 ? player1 : player2;
    console.log("winner:", winner, "choice1:", choice1, "choice2:", choice2);
    return {
      gameAction: "winner",
      payload: {
        logEntry: `${winner} wins!`,
        winner,
        loser: winner === player1 ? player2 : player1,
        choices: { [player1]: choice1, [player2]: choice2 },
        state: this.state,
      },
    };
  }

  // Reset the game state
  resetGame() {
    this.choices = {};
    this.state = "finished";
    return {
      gameAction: "reset",
      logEntry: "Game has been reset.",
      state: this.state,
    };
  }

  // Process an action from the client
  processAction(gameAction, playerId) {
    const choiceResult = this.makeChoice(playerId, gameAction);
    console.log("choiceResult:", choiceResult);
    if (choiceResult.gameAction === "error") {
      return choiceResult;
    }

    if (this.state === "complete") {
      // Determine and return the winner
      const result = this.determineWinner();
      this.resetGame(); // Reset for the next round
      return result;
    }

    return {
      gameAction: "waiting",
      logEntry: "Waiting for other players.",
      state: this.state,
    };
  }
}

module.exports = RockPaperScissors;
