class RockPaperScissors {
  constructor(requiredPlayers = 2) {
    this.choices = {}; // Tracks player choices: { publicKey: "rock/paper/scissors" }
    this.winningRules = {
      rock: "scissors",
      paper: "rock",
      scissors: "paper",
    };
    this.state = "waiting"; // Game states: waiting, in-progress, complete
    this.players = [];
    this.requiredPlayers = requiredPlayers;
  }

  // Add a player choice
  makeChoice(publicKey, choice) {
    if (this.state !== "started") {
      return { gameAction: "error", message: "Game is not in progress." };
    }

    if (!["rock", "paper", "scissors"].includes(choice)) {
      return { gameAction: "error", message: "Invalid choice." };
    }

    this.choices[publicKey] = choice;

    // Check if all players have made their choice
    if (this.isReady()) {
      this.state = "complete";
    }

    return {
      gameAction: "choiceMade",
      message: "choice recorded.",
      state: this.state,
    };
  }

  // Determine if both players are ready
  isReady() {
    return Object.keys(this.choices).length === this.requiredPlayers;
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

    return {
      gameAction: "winner",
      message: `${winner} wins!`,
      winner,
      loser: winner === player1 ? player2 : player1,
      choices: { [player1]: choice1, [player2]: choice2 },
    };
  }

  // Reset the game state
  resetGame() {
    this.choices = {};
    this.state = "finished";
    return { gameAction: "reset", message: "Game has been reset." };
  }

  // Process an action from the client
  processAction(gameAction, publicKey) {
    if (gameAction === "start") {
      this.state = "started";
      return { gameAction: "start", message: "Game has started." };
    }
    const choiceResult = this.makeChoice(publicKey, gameAction);

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
      message: "Waiting for other players.",
      state: this.state,
    };
  }
}

module.exports = RockPaperScissors;
