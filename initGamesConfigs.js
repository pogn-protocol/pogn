module.exports = {
  development: (() => {
    const players = [
      "7385ee0c0287285560b3d6059741928dd40474afb6612ced5758663bd09d12eb",
      "df08f70cb2f084d2fb787af232bbb18873e7d88919854669e4e691ead9baa4f4",
    ];

    return [
      {
        gameType: "rock-paper-scissors",
        gameId: "PrivateRPS",
        lobbyId: "lobby1",
        isPrivate: true,
        allowedPlayers: players,
        //autoJoin: false,
        autoStart: false,
      },
      {
        gameType: "rock-paper-scissors",
        gameId: "game2",
        lobbyId: "lobby1",
        autoJoin: players,
        autoStart: true,
      },
      {
        gameType: "odds-and-evens",
        gameId: "game3",
        lobbyId: "lobby1",
        autoJoin: players,
        autoStart: true,
      },
      {
        gameType: "tic-tac-toe",
        gameId: "game4",
        lobbyId: "lobby1",
        autoJoin: players,
        autoStart: true,
      },
    ];
  })(),

  production: (() => {
    const players = [
      "7385ee0c0287285560b3d6059741928dd40474afb6612ced5758663bd09d12eb",
      "df08f70cb2f084d2fb787af232bbb18873e7d88919854669e4e691ead9baa4f4",
    ];
    return [
      {
        gameType: "rock-paper-scissors",
        gameId: "PrivateRPS",
        lobbyId: "lobby1",
        isPrivate: true,
        allowedPlayers: players,
        //autoJoin: false,
        autoStart: false,
      },
      {
        gameType: "rock-paper-scissors",
        gameId: "game2",
        lobbyId: "lobby1",
        autoJoin: players,
        autoStart: true,
      },
      {
        gameType: "odds-and-evens",
        gameId: "game3",
        lobbyId: "lobby1",
        autoJoin: players,
        autoStart: true,
      },
      {
        gameType: "tic-tac-toe",
        gameId: "game4",
        lobbyId: "lobby1",
        autoJoin: players,
        autoStart: true,
      },
    ];
  })(),
};
