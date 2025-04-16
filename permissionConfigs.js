const PERMISSIONS = {
  game: {
    general: {
      allowedPlayers: ["*"],
      allowedActions: ["*"],
      maxGamesPerLobby: 4, // Limit games per lobby
    },
    games: {
      firstGame: {
        allowedPlayers: [
          "be7c4cf8b9db6950491f2de3ece4668a1beb93972082d021256146a2b4ae1348",
          "df08f70cb2f084d2fb787af232bbb18873e7d88919854669e4e691ead9baa4f4",
        ],
        allowedActions: ["*"],
      },
      secondGame: {
        allowedPlayers: ["*"],
        allowedActions: ["gameAction"],
      },
    },
  },
  relay: {
    general: {
      allowedActions: ["*"],
    },
    gameRelay: {},
    lobbyReley: {},
  },

  lobby: {
    general: {
      allowedActions: [
        "login",
        "createGame",
        "joinGame",
        "startGame",
        "refreshLobby",
        "gameEnded",
        "createLobby",
        "createNewGame",
      ],
      maxLobbies: 4, // Max 4 total lobbies
      maxPlayers: 4, // Max 4 players in lobby
      maxGames: 4, // Max 4 games in this lobby
    },
    lobbies: {
      lobby1: {
        lobbyId: "lobby1",
        allowedPlayers: ["*"],
        allowedActions: [
          "login",
          "createGame",
          "createLobby",
          "joinGame",
          "startGame",
          "refreshLobby",
          "gameEnded",
          "createNewGame",
        ],
        maxPlayers: 4, // Max 4 players in lobby
        maxGames: 4, // Max 4 games in this lobby
      },
      lobby2: {
        lobbyId: "lobby2",
        allowedPlayers: [
          "be7c4cf8b9db6950491f2de3ece4668a1beb93972082d021256146a2b4ae1348",
          "df08f70cb2f084d2fb787af232bbb18873e7d88919854669e4e691ead9baa4f4",
        ],
        allowedActions: [
          "login",
          "createGame",
          "joinGame",
          "startGame",
          "refreshLobby",
          "gameEnded",
          "createLobby",
          "createNewGame",
        ],
        maxPlayers: 4, // Max 4 players in lobby
        maxGames: 4,
      },
    },
  },
};

module.exports = PERMISSIONS;
