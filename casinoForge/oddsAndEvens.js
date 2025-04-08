class OddsAndEvens {
  constructor() {
    this.requiresRoles = true; // This game requires roles
    this.roles = {}; // { playerId: "odd" or "even" }
    this.choices = {}; // Tracks player choices
    this.numbers = {}; // Tracks submitted numbers
    this.gameStatus = "waiting"; // Possible gameStatuss: waiting, in-progress, complete
    this.minPlayers = 2;
    this.maxPlayers = 2;
    this.players = new Map();
  }

  // Assign roles to players
  assignRoles() {
    const playerIds = Array.from(this.players.keys());
    console.log("Assigning roles...", playerIds);
    console.log("playerIds", playerIds);
    if (playerIds.length !== 2) {
      throw new Error("This game requires exactly 2 players.");
    }

    // Randomly assign roles
    // const shuffledPlayers = playerIds.sort(() => Math.random() - 0.5);
    const shuffledPlayers = [...playerIds].sort(() => Math.random() - 0.5);
    console.log("shuffledPlayers", shuffledPlayers);
    this.roles[shuffledPlayers[0]] = "odd";
    this.roles[shuffledPlayers[1]] = "even";

    console.log("Roles assigned:", this.roles);
    return this.roles; // Return roles for reference if needed
  }

  // Process an action from the controller
  processAction(playerId, payload) {
    console.log("gameStatus", this.gameStatus);
    const gameAction = payload.gameAction;
    console.log("game action", gameAction);
    switch (gameAction) {
      //console gameStatus
      case "getRoles":
        // Prevent roles from being reassigned if already assigned
        if (this.roles && Object.keys(this.roles).length === 2) {
          console.log("Roles already assigned:", this.roles);
          return {
            logEntry: `Roles requested by player: ${this.roles[playerId]}`,
            gameAction: "rolesAssigned",
            roles: this.roles,
            gameStatus: this.gameStatus,
            message: "Roles already assigned and recieved.",
          };
        }
        console.log("Getting roles...");
        this.gameStatus = "in-progress";
        console.log("roles", this.roles);
        console.log("Assigning roles to players...", this.players);
        //const roles = this.assignRoles(this.players);
        // const roles = this.assignRoles(Array.from(this.players.keys()));
        const roles = this.assignRoles(); // 💡FIXED HERE: no longer passes anything in
        console.log("roles", roles);
        return {
          logEntry: "Roles assigned.",
          gameAction: "rolesAssigned",
          roles,
          gameStatus: this.gameStatus,
          message: `Recieved assigned roles requested by player: ${playerId}`,
        };
      case "submitNumber":
        return this.submitNumber(playerId, payload.number);
      default:
        return { type: "error", message: `Unknown gameAction: ${gameAction}` };
    }
  }

  // Handle number submission
  submitNumber(playerId, number) {
    if (!Number.isInteger(number)) {
      return {
        type: "error",
        message: "Invalid number. Please submit an integer.",
      };
    }
    this.numbers[playerId] = number;
    if (Object.keys(this.numbers).length === 2) {
      // Calculate the result once both players have submitted their numbers
      return this.calculateWinner();
    }

    return {
      logEntry: `Player ${playerId} submitted number.`,
      gameAction: "waitingForOpponent",
      gameStatus: this.gameStatus,
      playerId,
      message: `Player ${playerId} submitted number`,
      private: `Player ${playerId} submitted number ${number}`,
    };
  }

  // Calculate the winner
  calculateWinner() {
    const [player1, player2] = Object.keys(this.numbers);
    const sum = this.numbers[player1] + this.numbers[player2];
    const isEven = sum % 2 === 0;

    // Determine the winner based on the roles
    const winner = isEven
      ? Object.keys(this.roles).find((id) => this.roles[id] === "even")
      : Object.keys(this.roles).find((id) => this.roles[id] === "odd");

    this.gameStatus = "complete";

    return {
      logEntry: `Game complete. Winner: ${winner}, Sum: ${sum}, Numbers: ${this.numbers}`,
      gameAction: "results",
      gameStatus: this.gameStatus,
      winner,
      loser: winner === player1 ? player2 : player1,
      sum,
      roles: this.roles,
      numbers: this.numbers,
      message: `Game complete. Winner: ${winner}, Sum: ${sum}`,
    };
  }

  // Provide game details for the frontend
  getGameDetails() {
    return {
      roles: this.roles,
      gameStatus: this.gameStatus,
      numbers: this.numbers,
      minPlayers: this.minPlayers,
      maxPlayers: this.maxPlayers,
    };
  }
}

module.exports = OddsAndEvens;
