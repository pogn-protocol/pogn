const TurnBasedGame = require("../turnBasedGame");

class TicTacToe extends TurnBasedGame {
  constructor() {
    super(["X", "O"]); // Call the parent constructor with roles
    this.board = Array(9).fill(null); // 3x3 board
    this.players = new Map(); // filled in by firmware
    this.currentTurn = null;
    this.winner = null;
    this.movesMade = 0;
  }

  init() {
    console.log("[TicTacToe] init() called");

    const roles = ["X", "O"];

    if (typeof this.assignRoles === "function") {
      console.log("[TicTacToe] assignRoles called.");
      this.assignRoles(roles);

      const xPlayerId = Object.keys(this.roles).find(
        (id) => this.roles[id] === "X"
      );

      this.currentTurn = xPlayerId;

      console.log(
        "[TicTacToe] currentTurn (X always starts):",
        this.currentTurn
      );
      console.log("[TicTacToe] game details:", this.getGameDetails());

      return {
        gameAction: "gameStarted",
        playerId: this.currentTurn,
        board: [...this.board],
        currentTurn: this.currentTurn,
        ...this.getGameDetails(),
      };
    }

    return {};
  }

  checkWinner() {
    const b = this.board;
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8], // rows
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8], // cols
      [0, 4, 8],
      [2, 4, 6], // diagonals
    ];
    for (let [a, bIdx, c] of lines) {
      if (b[a] && b[a] === b[bIdx] && b[a] === b[c]) return b[a];
    }
    return null;
  }

  processAction(playerId, payload) {
    const { gameAction, index } = payload;

    console.log("[TicTacToe] processAction called with:", payload);
    console.log("[TicTacToe] index:", index);
    console.log("[TicTacToe] currentTurn:", this.currentTurn);
    console.log("[TicTacToe] players:", this.players);
    console.log("[TicTacToe] roles:", this.roles);
    console.log("[TicTacToe] board:", this.board);
    console.log("[TicTacToe] movesMade:", this.movesMade);
    console.log("[TicTacToe] winner:", this.winner);
    console.log("[TicTacToe] rolesAssigned:", this.rolesAssigned);
    console.log("[TicTacToe] playerId:", playerId);

    if (gameAction !== "makeMove")
      return { type: "error", message: "Unknown action." };

    if (this.winner) return { message: "Game is over." };
    if (this.currentTurn !== playerId) return { message: "Not your turn." };

    const mark = this.roles[playerId];
    if (this.board[index]) return { message: "Cell already taken." };

    this.board[index] = mark;
    this.movesMade += 1;

    const winnerMark = this.checkWinner();
    let gameComplete = false;

    if (winnerMark) {
      const winnerId = Object.keys(this.roles).find(
        (id) => this.roles[id] === winnerMark
      );
      this.winner = winnerId;
      gameComplete = true;
    } else if (this.movesMade >= 9) {
      this.winner = "draw";
      gameComplete = true;
    } else {
      console.log("[TicTacToe] Switching turn.");
      this.switchTurn?.();
    }

    console.log("[TicTacToe] after switching turn:", this.currentTurn);

    return {
      playerId,
      gameAction: "moveMade",
      board: [...this.board],
      currentTurn: this.currentTurn,
      winner: this.winner,
      gameStatus: gameComplete ? "complete" : undefined, // ✅ emit status when done
      message: this.winner
        ? this.winner === "draw"
          ? "It's a draw!"
          : `Player ${this.winner} wins!`
        : `Player ${playerId} made a move.`,
    };
  }
}

module.exports = TicTacToe;
