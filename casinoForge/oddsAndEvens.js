class OddsAndEvens {
  constructor() {
    this.requiresRoles = true; // This game requires roles
    this.roles = {}; // { playerId: "odd" or "even" }
    this.choices = {}; // Tracks player choices
    this.numbers = {}; // Tracks submitted numbers
    this.state = "waiting"; // Possible states: waiting, in-progress, complete
    this.minPlayers = 2;
    this.maxPlayers = 2;
    this.players = new Map();
  }

  // Assign roles to players
  assignRoles(playerIds) {
    console.log("Assigning roles...", playerIds);
    console.log("playerIds", playerIds);
    if (playerIds.length !== 2) {
      throw new Error("This game requires exactly 2 players.");
    }

    // Randomly assign roles
    const shuffledPlayers = playerIds.sort(() => Math.random() - 0.5);
    this.roles[shuffledPlayers[0]] = "odd";
    this.roles[shuffledPlayers[1]] = "even";

    console.log("Roles assigned:", this.roles);
    return this.roles; // Return roles for reference if needed
  }

  // Process an action from the controller
  processAction(playerId, payload) {
    console.log("state", this.state);
    const gameAction = payload.gameAction;
    console.log("game action", gameAction);
    switch (gameAction) {
      //console state
      case "getRoles":
        // Prevent roles from being reassigned if already assigned
        if (this.state !== "waiting") {
          console.log("Roles already assigned:", this.roles);
          return {
            logEntry: `Roles requested by player: ${this.roles[playerId]}`,
            action: "gameAction",
            payload: {
              action: "rolesAssigned",
              roles: this.roles,
              state: this.state,
              message: "Roles already assigned and recieved.",
            },
          };
        }

        if (this.state === "waiting") {
          console.log("Assigning roles...");
          this.state = "in-progress";
          console.log("roles", this.roles);
          // Ensure roles are only assigned once
          if (!this.roles || Object.keys(this.roles).length === 0) {
            console.log("Assigning roles to This.players...", this.players);
            const roles = this.assignRoles(this.players);
            this.state = "in-progress";
            return {
              logEntry: "Roles assigned.",
              action: "gameAction",
              payload: {
                action: "rolesAssigned",
                roles,
                state: this.state,
                message: `Recieved assigned roles requested by player: ${playerId}`,
              },
              broadcast: true, // Broadcast roles to all players
            };
          } else {
            console.log("Roles already assigned:", this.roles);
            return {
              type: "error",
              message: "Unable to assign roles due to unexpected state.",
            };
          }
        }

      case "submitNumber":
        return this.submitNumber(playerId, payload.number);

      default:
        return { type: "error", message: `Unknown action: ${gameAction}` };
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
      payload: {
        action: "waitingForOpponent",
        playerId,
        message: `Player ${playerId} submitted number`,
      },
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

    this.state = "complete";

    return {
      logEntry: `Game complete. Winner: ${winner}, Sum: ${sum}, Numbers: ${this.numbers}`,
      payload: {
        action: "results",
        winner,
        loser: winner === player1 ? player2 : player1,
        sum,
        roles: this.roles,
        numbers: this.numbers,
        message: `Game complete. Winner: ${winner}, Sum: ${sum}`,
      },
      broadcast: true,
    };
  }

  // Provide game details for the frontend
  getGameDetails() {
    return {
      roles: this.roles,
      state: this.state,
      numbers: this.numbers,
      minPlayers: this.minPlayers,
      maxPlayers: this.maxPlayers,
    };
  }
}

module.exports = OddsAndEvens;
