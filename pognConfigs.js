const ENV = process.env.NODE_ENV || "development";

const CONFIGS = {
  development: {
    SHARED_PORT_MODE: false,
    PORT: 3000,
    WS_URL: "ws://localhost",
    LOBBY_IDS: ["lobby1", "lobby2"],
    GAME_PORTS: [9000, 9001, 9002, 9003],
    LOBBY_PORTS: [8080, 8081],
  },
  production: {
    HOST: "pogn-a5fe730540b4.herokuapp.com",
    SHARED_PORT_MODE: true,
    PORT: parseInt(process.env.PORT),
    WS_URL: `wss://pogn-a5fe730540b4.herokuapp.com`,
    LOBBY_IDS: ["lobby1", "lobby2"],
    GAME_PORTS: [parseInt(process.env.PORT)],
    LOBBY_PORTS: [parseInt(process.env.PORT)],
  },
};

module.exports = CONFIGS[ENV];
