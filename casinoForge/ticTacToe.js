const TurnBasedGame = require("./turnBasedGame");

class TicTacToe extends TurnBasedGame {
  constructor() {
    console.log("[TicTacToe] constructor called");
    super(["X", "O"]);
    this.board = Array(9).fill(null);
    console.log("[TicTacToe] Initial board:", this.board);
  }

  processAction(playerId, payload) {
    console.log("[TicTacToe] processAction START", { playerId, payload });
    const { gameAction, index } = payload;
    console.log("[TicTacToe] gameAction:", gameAction);

    switch (gameAction) {
      case "getRoles": {
        console.log("[TicTacToe] getRoles triggered");

        // If roles are already assigned
        if (Object.keys(this.roles).length === 2) {
          console.log("[TicTacToe] Roles already assigned:", this.roles);

          if (!this.currentTurn) {
            throw new Error(
              "[TicTacToe] currentTurn is null or undefined after roles were assigned."
            );
          }

          const baseResponse = this.getRolesResponse(playerId);
          const response = {
            ...baseResponse,
            currentTurn: this.currentTurn, // Inject it here
          };

          console.log(
            "[TicTacToe] Returning response with currentTurn:",
            response
          );
          return response;
        }

        // Assign roles if not already assigned
        const roles = this.assignRoles();

        if (!this.currentTurn) {
          throw new Error(
            "[TicTacToe] currentTurn is null or undefined after assigning roles."
          );
        }

        console.log("[TicTacToe] Assigned roles:", roles);
        console.log("[TicTacToe] Current turn:", this.currentTurn);

        const baseResponse = this.getRolesResponse(playerId);
        const response = {
          ...baseResponse,
          roles, // Return full roles
          currentTurn: this.currentTurn, // Inject again
        };

        console.log("[TicTacToe] Returning fresh assigned response:", response);
        return response;
      }

      case "makeMove": {
        console.log("[TicTacToe] makeMove triggered for index:", index);
        const error = this.validateTurn(playerId);
        if (error) {
          console.warn("[TicTacToe] Turn validation failed:", error);
          return error;
        }

        if (
          !Number.isInteger(index) ||
          index < 0 ||
          index >= 9 ||
          this.board[index] !== null
        ) {
          console.warn("[TicTacToe] Invalid move:", index, this.board[index]);
          return { type: "error", message: "Invalid move." };
        }

        const mark = this.roles[playerId];
        console.log(`[TicTacToe] Player ${playerId} is ${mark}`);
        this.board[index] = mark;
        this.movesMade++;
        console.log("[TicTacToe] Board after move:", this.board);
        console.log("[TicTacToe] Moves made:", this.movesMade);

        if (this.checkWin(mark)) {
          this.gameStatus = "complete";
          this.winner = playerId;
          const response = {
            gameAction: "results",
            winner: playerId,
            board: this.board,
            message: `${mark} wins!`,
            gameStatus: this.gameStatus,
          };
          console.log("[TicTacToe] WIN:", response);
          this.logAction?.(response);
          return response;
        }

        if (this.movesMade === 9) {
          this.gameStatus = "complete";
          const response = {
            gameAction: "results",
            winner: null,
            board: this.board,
            message: "It's a draw.",
            gameStatus: this.gameStatus,
          };
          console.log("[TicTacToe] DRAW:", response);
          this.logAction?.(response);
          return response;
        }

        this.switchTurn();
        console.log("[TicTacToe] Next turn:", this.currentTurn);

        const response = {
          gameAction: "moveMade",
          board: this.board,
          ...this.getTurnState(),
          message: `Player ${playerId} placed ${mark} at index ${index}.`,
        };
        console.log("[TicTacToe] Move completed:", response);
        this.logAction?.(response);
        return response;
      }

      default:
        const response = {
          type: "error",
          message: `Unknown gameAction: ${gameAction}`,
        };
        console.warn("[TicTacToe] Unknown action:", response);
        this.logAction?.(response);
        return response;
    }
  }

  checkWin(mark) {
    console.log("[TicTacToe] checkWin called for mark:", mark);
    const b = this.board;
    const winCombos = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    const result = winCombos.some((combo) => combo.every((i) => b[i] === mark));
    console.log(`[TicTacToe] Win check result for ${mark}:`, result);
    return result;
  }

  getGameDetails() {
    const details = {
      ...super.getGameDetails(),
      board: this.board,
    };
    console.log("[TicTacToe] getGameDetails:", details);
    return details;
  }
}

module.exports = TicTacToe;
