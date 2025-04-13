const BaseGame = require("./baseGame");

class TurnBasedGame extends BaseGame {
  constructor(roleList) {
    if (!Array.isArray(roleList) || roleList.length < 2) {
      throw new Error(
        "TurnBasedGame requires a role list with at least 2 roles."
      );
    }
    super(roleList.length, roleList.length);
    this.roleList = roleList;
    this.currentTurn = null;
    this.winner = null;
    this.movesMade = 0;
  }

  assignRoles() {
    const assigned = this.assignRolesShuffled(this.roleList);
    this.currentTurn = Object.keys(assigned)[0];
    console.log("[TurnBasedGame] Roles assigned:", assigned);
    return assigned;
  }

  validateTurn(playerId) {
    if (this.currentTurn !== playerId) {
      return {
        type: "error",
        private: "Not your turn.",
        currentTurn: this.currentTurn,
      };
    }
    return null;
  }

  switchTurn() {
    const ids = Object.keys(this.roles);
    this.currentTurn = ids.find((id) => id !== this.currentTurn);
  }

  getTurnState() {
    return {
      currentTurn: this.currentTurn,
      gameStatus: this.gameStatus,
    };
  }

  getGameDetails() {
    return {
      ...super.getGameDetails(),
      currentTurn: this.currentTurn,
      winner: this.winner,
    };
  }
}

module.exports = TurnBasedGame;
