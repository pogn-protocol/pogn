class TicTacToe {
  constructor() {
    this.requiresRoles = true;
    this.roles = {}; // { playerId: "X" | "O" }
    this.board = Array(9).fill(null);
    this.players = new Map(); // playerId -> ws (set externally)
    this.roleOrder = ["X", "O"].sort(() => Math.random() - 0.5);
    this.currentTurn = null; // playerId
    this.winner = null;
    this.movesMade = 0;
    this.gameStatus = "waiting";
  }

  assignRoles() {
    console.log("Assigning roles...", this.players);
    const playerIds = Array.from(this.players.keys());
    if (playerIds.length !== 2) {
      throw new Error("TicTacToe requires exactly 2 players.");
    }

    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
    this.roles[shuffled[0]] = this.roleOrder[0];
    this.roles[shuffled[1]] = this.roleOrder[1];
    this.currentTurn = shuffled[0];
    console.log("Roles assigned:", this.roles);
    console.log("Current turn:", this.currentTurn);
    if (this.currentTurn == null) {
      throw new Error("Current turn is not set.");
    }

    this.gameStatus = "in-progress";

    return this.roles;
  }

  processAction(playerId, payload) {
    console.log("Processing action from player:", playerId, payload);
    const { gameAction, index } = payload;

    switch (gameAction) {
      case "getRoles":
        if (Object.keys(this.roles).length === 2) {
          console.log("Roles already assigned:", this.roles);
          console.log("Current turn:", this.currentTurn);
          if (this.currentTurn == null) {
            throw new Error("Current turn is not set.");
          }
          return {
            logEntry: `Roles already assigned: ${this.roles[playerId]}`,
            gameAction: "rolesAssigned",
            roles: this.roles,
            gameStatus: this.gameStatus,
            currentTurn: this.currentTurn,
            message: "Roles already assigned.",
          };
        }
        const roles = this.assignRoles();
        console.log("roles", roles);
        if (!this.roles || Object.keys(this.roles).length !== 2) {
          throw new Error("Roles not assigned correctly.");
        }
        console.log("Current turn:", this.currentTurn);
        if (this.currentTurn == null) {
          throw new Error("Current turn is not set.");
        }
        return {
          logEntry: "Roles assigned.",
          gameAction: "rolesAssigned",
          roles,
          gameStatus: this.gameStatus,
          currentTurn: this.currentTurn,
          message: `Assigned roles, you are ${roles[playerId]}`,
        };

      case "makeMove":
        console.log("Making move for player:", playerId, index);
        return this.makeMove(playerId, index);

      default:
        return { type: "error", message: `Unknown gameAction: ${gameAction}` };
    }
  }

  makeMove(playerId, index) {
    if (this.gameStatus !== "in-progress") {
      return { type: "error", message: "Game not in progress." };
    }
    console.log("Current turn:", this.currentTurn);
    if (this.currentTurn == null) {
      throw new Error("Current turn is not set.");
    }
    if (this.currentTurn !== playerId) {
      return {
        type: "error",
        message: `Not your turn.`,
        currentTurn: this.currentTurn,
      };
    }

    if (!Number.isInteger(index) || index < 0 || index > 8) {
      return { type: "error", message: "Invalid board index." };
    }

    if (this.board[index] !== null) {
      return { type: "error", message: "Cell already taken." };
    }

    const mark = this.roles[playerId];
    this.board[index] = mark;
    this.movesMade++;

    if (this.checkWin(mark)) {
      this.gameStatus = "complete";
      this.winner = playerId;
      return {
        logEntry: `Player ${playerId} (${mark}) wins.`,
        gameAction: "results",
        gameStatus: this.gameStatus,
        winner: playerId,
        board: this.board,
        message: `Game complete. ${mark} wins!`,
      };
    }

    if (this.movesMade >= 9) {
      this.gameStatus = "complete";
      return {
        logEntry: "Draw.",
        gameAction: "results",
        gameStatus: this.gameStatus,
        winner: null,
        board: this.board,
        message: "Game complete. It's a draw.",
      };
    }

    // Switch turn
    const otherPlayer = Object.keys(this.roles).find((id) => id !== playerId);
    this.currentTurn = otherPlayer;

    return {
      logEntry: `Player ${playerId} made a move.`,
      gameAction: "moveMade",
      board: this.board,
      currentTurn: this.currentTurn,
      gameStatus: this.gameStatus,
      message: `Player ${playerId} placed ${mark} at index ${index}.`,
    };
  }

  checkWin(mark) {
    const b = this.board;
    const winCombos = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8], // rows
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8], // cols
      [0, 4, 8],
      [2, 4, 6], // diags
    ];
    return winCombos.some((combo) => combo.every((i) => b[i] === mark));
  }

  getGameDetails() {
    return {
      board: this.board,
      roles: this.roles,
      currentTurn: this.currentTurn,
      gameStatus: this.gameStatus,
    };
  }
}

module.exports = TicTacToe;
