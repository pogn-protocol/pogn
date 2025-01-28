const Player = require("./player");

class Lobby {
  constructor() {
    this.players = [];
    this.games = [];
  }
  joinLobby(playerId, playerName = "") {
    //check if in lobby
    if (this.players.some((p) => p.playerId === playerId)) {
      return;
    }
    console.log("Adding player", playerId, playerName);
    const player = new Player({
      playerId,
      playerName,
      inLobby: true, // Default to true when adding a player to the lobby
    });
    this.players.push(player);
    console.log("Player added to lobby", player);
  }
  verifyPlayer(playerId) {
    const player = this.players.find((p) => p.playerId === playerId);
    if (!player) {
      console.log("Player not found in lobby", playerId);
      return;
    }
    player.inLobby = true;
    return player;
  }

  existsInLobby(playerId) {
    return this.players.some((p) => p.playerId === playerId);
  }

  removePlayer(player) {
    this.players = this.players.filter((p) => p !== player);
  }

  removeGame(gameId) {
    this.games = this.games.filter((game) => game.gameId !== gameId);
    console.log(`Game ${gameId} removed from the lobby.`);
  }

  deverifyLobbyPlayers() {
    this.players.forEach((p) => (p.inLobby = false));
  }

  removeUnverifiedPlayers() {
    console.log("Removing unverified players...");
    this.games.forEach((game) => {
      const verifiedPlayers = this.players
        .filter((p) => p.inLobby)
        .map((p) => p.playerId);

      // Remove unverified players from the game
      const playersToRemove = Array.from(game.players.keys()).filter(
        (playerId) => !verifiedPlayers.includes(playerId)
      );

      playersToRemove.forEach((playerId) => {
        game.removePlayer(playerId);
        console.log(
          `Removed unverified player ${playerId} from game ${game.gameId}`
        );
      });
    });
  }

  getLobbyPlayers() {
    // console.log("Getting lobby players...");
    // this.removeUnverifiedPlayers();
    console.log("Returning lobby players...");
    return this.players.filter((p) => p.inLobby);
  }

  getLobbyGames() {
    return this.games.map((game) => ({
      gameId: game.gameId,
      gameType: game.gameType,
      status: game.status,
      players: Array.from(game.players.keys()), // Convert players map to array
      gameLog: game.gameLog,
      instance: game.instance,
    }));
  }
  addGame(game) {
    this.games.push(game);
  }
  getGame(gameId) {
    return this.games.find((game) => game.gameId === gameId);
  }

  getGameDetails(gameId) {
    if (!gameId) {
      console.warn("getGame: gameId is required but not provided.");
      return null;
    }

    const game = this.games.find((game) => game.gameId === gameId);

    if (!game) {
      console.warn(`getGame: Game with ID ${gameId} not found.`);
      return null;
    }

    // Return the game in the same format as getLobbyGames
    return {
      gameId: game.gameId,
      gameType: game.gameType,
      status: game.status,
      players: Array.from(game.players.keys()), // Convert players map to array
      gameLog: game.gameLog,
      instance: game.instance,
    };
  }

  joinLobbyPlayerToGame(gameId, playerId) {
    //set game status to joining
    const game = this.getGame(gameId);

    console.log("Joining player", playerId, "to game", gameId);
    if (!game) {
      return { error: true, message: `Game with ID ${gameId} not found.` };
    }
    game.addPlayer(playerId);
    return game;
  }
  startGame(gameId, playerId) {
    const game = this.getGame(gameId);
    console.log("Starting game", gameId, "by player", playerId);
    if (!game) {
      return { error: true, message: `Game with ID ${gameId} not found.` };
    }
    //check if player is in the game
    if (!game.players.has(playerId)) {
      return {
        error: true,
        message: `Player ${playerId} can't start the game because they are not in the game.`,
      };
    }
    if (game.status === "started") {
      return { error: true, message: "Game is already started." };
    }
    if (game.status !== "readyToStart" && game.status !== "canStart") {
      return {
        error: true,
        message: "Game is not ready to start.",
      };
    }
    game.startGame();
    return game;
  }
}

module.exports = Lobby;
