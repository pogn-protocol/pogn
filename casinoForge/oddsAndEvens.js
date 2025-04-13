const BaseGame = require("./baseGame");

class OddsAndEvens extends BaseGame {
  constructor() {
    super(2, 2);
    this.requiresRoles = true;
    this.roles = {}; // { playerId: "odd" or "even" }
    this.numbers = {}; // { playerId: number }
    this.gameStatus = "waiting";
  }

  processAction(playerId, payload) {
    const { gameAction } = payload;
    console.log("[OddsAndEvens] processAction:", { playerId, gameAction });

    switch (gameAction) {
      case "getRoles":
        return this.handleRoleRequest(playerId);

      case "submitNumber":
        return this.submitNumber(playerId, payload.number);

      default:
        return { type: "error", message: `Unknown gameAction: ${gameAction}` };
    }
  }

  handleRoleRequest(playerId) {
    if (Object.keys(this.roles).length === 2) {
      console.log("[OddsAndEvens] Roles already assigned:", this.roles);
      return {
        gameAction: "rolesAssigned",
        roles: this.roles,
        gameStatus: this.gameStatus,
        message: `Roles already assigned. You are ${this.roles[playerId]}`,
        private: `You are ${this.roles[playerId]}`,
      };
    }

    const playerIds = Array.from(this.players.keys());
    if (playerIds.length !== 2) {
      return {
        type: "error",
        message: "Cannot assign roles until exactly 2 players are present.",
      };
    }

    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
    this.roles[shuffled[0]] = "odd";
    this.roles[shuffled[1]] = "even";
    this.gameStatus = "in-progress";

    console.log("[OddsAndEvens] Assigned roles:", this.roles);
    return {
      gameAction: "rolesAssigned",
      roles: this.roles,
      gameStatus: this.gameStatus,
      message: `Roles assigned. You are ${this.roles[playerId]}`,
      private: `You are ${this.roles[playerId]}`,
    };
  }

  submitNumber(playerId, number) {
    if (!Number.isInteger(number)) {
      return {
        type: "error",
        message: "Invalid number. Please submit an integer.",
      };
    }

    this.numbers[playerId] = number;
    console.log(`[OddsAndEvens] ${playerId} submitted: ${number}`);

    if (Object.keys(this.numbers).length === 2) {
      return this.calculateWinner();
    }

    return {
      gameAction: "waitingForOpponent",
      gameStatus: this.gameStatus,
      message: "Waiting for opponent to submit their number.",
      private: `You submitted ${number}. Waiting for opponent.`,
    };
  }

  calculateWinner() {
    const [p1, p2] = Object.keys(this.numbers);
    const sum = this.numbers[p1] + this.numbers[p2];
    const isEven = sum % 2 === 0;

    const winner = isEven
      ? Object.keys(this.roles).find((id) => this.roles[id] === "even")
      : Object.keys(this.roles).find((id) => this.roles[id] === "odd");

    const loser = [p1, p2].find((id) => id !== winner);

    this.gameStatus = "complete";

    const result = {
      gameAction: "results",
      gameStatus: this.gameStatus,
      winner,
      loser,
      sum,
      roles: this.roles,
      numbers: this.numbers,
      message: `Game complete. Winner: ${winner} with ${
        isEven ? "even" : "odd"
      } sum.`,
    };

    this.logAction(result);
    return result;
  }

  getGameDetails() {
    return {
      ...super.getGameDetails(),
      roles: this.roles,
      numbers: this.numbers,
    };
  }
}

module.exports = OddsAndEvens;
