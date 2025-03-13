class GamingHubController {
  constructor({
    configs,
    dataValidations,
    dbs,
    permissions,
    moneyServices,
    privacyProtocols,
    casinoController,
    lobbyController,
    gameController,
    relayManager,
  }) {
    this.configs = configs;
    this.dataValidations = dataValidations;
    this.dbs = dbs;
    this.permissions = permissions;
    this.moneyServices = moneyServices;
    this.casinoController = casinoController;
    this.lobbyController = lobbyController;
    this.gameController = gameController;
    this.relayManager = relayManager;
    this.privacy = privacyProtocols;
    this.casinos = new Map();
    this.dbInstances = new Map();
  }

  // ✅ Initialize the Gaming Hub (Multiple Casinos, Lobbies, Games)
  async initializeHub() {
    console.log("Initializing Gaming Hub...");

    const { casinoConfig } = this.configs;

    // ✅ Assign a database instance to this gaming hub
    casinoConfig.casinos.forEach((casinoData) => {
      const casinoDb = this.dbs.createDbConnection(casinoData.databaseName);
      this.dbInstances.set(casinoData.id, casinoDb);
    });

    // ✅ Create multiple casinos, lobbies, and games
    for (const casinoData of casinoConfig.casinos) {
      await this.createCasinoStructure(casinoData);
    }

    console.log(`Gaming Hub initialized with ${this.casinos.size} casinos.`);

    // ✅ Initialize relays
    this.initializeRelays();
  }

  // ✅ Create Casino, its Lobbies, and Games
  async createCasinoStructure(casinoData) {
    console.log(`Creating Casino: ${casinoData.id}...`);

    // ✅ Validate Casino ID
    if (!this.dataValidations.validateCasinoId(casinoData.id)) {
      console.error(`Invalid Casino ID: ${casinoData.id}`);
      return;
    }

    // ✅ Apply Privacy - Encrypt Casino ID
    const encryptedCasinoId = this.privacy.encryptData(casinoData.id);

    // ✅ Create a Casino instance
    const casino = this.casinoController.createCasino(encryptedCasinoId);
    this.casinos.set(casinoData.id, casino);
    console.log(
      `Casino ${casinoData.id} (Encrypted: ${encryptedCasinoId}) created.`
    );

    // ✅ Create multiple lobbies inside the casino
    const lobbies = new Map();
    for (const lobbyData of casinoData.lobbies) {
      if (!this.dataValidations.validateLobbyId(lobbyData.id)) {
        console.error(`Invalid Lobby ID: ${lobbyData.id}`);
        continue;
      }

      // ✅ Apply Privacy - Encrypt Lobby ID
      const encryptedLobbyId = this.privacy.encryptData(lobbyData.id);

      const lobby = this.lobbyController.createLobby(
        encryptedLobbyId,
        casino.id
      );
      lobbies.set(lobbyData.id, lobby);
      console.log(
        `Lobby ${lobbyData.id} (Encrypted: ${encryptedLobbyId}) created in Casino ${casino.id}.`
      );

      // ✅ Create multiple games inside the lobby
      const games = new Map();
      for (const gameData of lobbyData.games) {
        if (!this.dataValidations.validateGameId(gameData.id)) {
          console.error(`Invalid Game ID: ${gameData.id}`);
          continue;
        }

        // ✅ Apply Privacy - Encrypt Game ID
        const encryptedGameId = this.privacy.encryptData(gameData.id);

        const game = this.gameController.createGame(
          lobbyData.id,
          encryptedGameId
        );
        games.set(gameData.id, game);
        console.log(
          `Game ${gameData.id} (Encrypted: ${encryptedGameId}) created in Lobby ${lobbyData.id}.`
        );
      }

      lobby.games = games;
    }

    casino.lobbies = lobbies;
  }

  // ✅ Relay Setup (Auto-Restores from Database)
  initializeRelays() {
    console.log("Initializing Relays...");

    // ✅ Auto-load active relays from the database
    this.relayManager.restoreRelays();

    console.log("Relays Initialized.");
  }

  // ✅ Shutdown Gaming Hub (Closes DB & Cleans Up)
  async shutdownHub() {
    console.log("Shutting down Gaming Hub...");

    for (const [casinoId, dbInstance] of this.dbInstances.entries()) {
      await dbInstance.end();
      console.log(`Database connection closed for Casino ${casinoId}.`);
    }

    this.relayManager.cleanupRelays();
    console.log("Gaming Hub shutdown complete.");
  }
}

module.exports = GamingHubController;
