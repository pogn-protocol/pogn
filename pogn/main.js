const configs = require("./configs/configs");
const dataValidations = require("./validations/dataValidations");
const dbs = require("./dbs/dbs");
const permissions = require("./permissions/permissions");
const MoneyServices = require("./moneyServices/moneyServices");
const CasinoController = require("./ghComponents/casinoController");
const LobbyController = require("./ghComponents/lobbyController");
const GameController = require("./controllers/gameController");
const RelayManager = require("./relayServices/relayManager");
const PrivacyProtocols = require("./Privacy/PrivacyProtocols");
const GamingHubController = require("./controllers/gamingHubController");

console.log("Starting Gaming Hub System...");

// ✅ Create an instance of the Privacy Protocols
const privacyProtocols = new PrivacyProtocols(configs);

// ✅ Create the Gaming Hub Controller with all dependencies
const gamingHub = new GamingHubController({
  configs,
  dataValidations,
  dbs,
  permissions,
  moneyServices: MoneyServices,
  casinoController: CasinoController,
  lobbyController: LobbyController,
  gameController: GameController,
  relayManager: RelayManager,
  privacyProtocols,
});

// ✅ Initialize the gaming hub
gamingHub.initializeHub();

console.log("System is live!");

// ✅ Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down system...");
  await gamingHub.shutdownHub();
  dbs.closeAllConnections();
  process.exit(0);
});
