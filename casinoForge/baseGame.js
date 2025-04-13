class BaseGame {
  constructor(minPlayers = 1, maxPlayers = 1) {
    this.players = new Map();
    this.roles = {}; // playerId -> role
    this.minPlayers = minPlayers;
    this.maxPlayers = maxPlayers;
    this.gameStatus = "waiting";
    this.gameLog = [];
  }

  assignRolesShuffled(roleList) {
    const playerIds = Array.from(this.players.keys());
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
    shuffled.forEach((id, i) => {
      this.roles[id] = roleList[i];
    });
    this.gameStatus = "in-progress";
    console.log("[assignRolesShuffled] Assigned roles:", this.roles);
    return this.roles;
  }

  logAction(action) {
    console.log("[BaseGame] logAction called with:", action);
    if (action?.logEntry) {
      console.log("[GameLog]", action.logEntry);
    }
    this.gameLog.push(action);
  }

  getRolesResponse(playerId) {
    const response = {
      gameAction: "rolesAssigned",
      roles: this.roles,
      gameStatus: this.gameStatus,
      private: `You are ${this.roles[playerId]}`,
    };
    console.log("[BaseGame] getRolesResponse:", response);
    this.logAction?.(response);
    return response;
  }

  getGameDetails() {
    console.log("[BaseGame] getGameDetails called.");
    return {
      roles: this.roles,
      gameStatus: this.gameStatus,
    };
  }
}

module.exports = BaseGame;
