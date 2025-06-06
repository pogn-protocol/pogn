const dotenv = require("dotenv");
dotenv.config();

const ENV = process.env.ENV || "development";
console.log(`🚀 Starting POGN in ${ENV} mode...`);
const PERMISSIONS = require("./permissionConfigs");
const INITGAMES_CONFIG = require("./initGamesConfigs");
const INITGAMES = INITGAMES_CONFIG[ENV] || [];
const CONFIGS = {
  development: {
    HOST: "localhost",
    SHARED_PORT_MODE: true,
    PORT: 8080,
    WS_URL: "ws://localhost",
    LOBBY_IDS: ["lobby1", "lobby2"],
    GAME_PORTS: [8080, 9001, 9002, 9003],
    LOBBY_PORTS: [8080, 8081],
    PERMISSIONS,
    INITGAMES,
  },
  production: {
    HOST: "pogn-a5fe730540b4.herokuapp.com",
    SHARED_PORT_MODE: true,
    PORT: parseInt(process.env.PORT),
    WS_URL: `wss://pogn-a5fe730540b4.herokuapp.com`,
    LOBBY_IDS: ["lobby1", "lobby2"],
    GAME_PORTS: [parseInt(process.env.PORT)],
    LOBBY_PORTS: [parseInt(process.env.PORT)],
    PERMISSIONS,
    INITGAMES,
  },
};

console.log(" POGN Configs...", CONFIGS[ENV]);

module.exports = CONFIGS[ENV];
