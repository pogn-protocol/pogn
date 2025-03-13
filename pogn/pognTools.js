const configs = require("./configs/configs");
const permissions = require("./permissions/permissions");
const validations = require("./validations/validations");

const StateManager = require("./states/stateManager");
const RelayManager = require("./relayServices/relayManager");
const MessengerService = require("./messengerServices/messengerService");

class Toolbox {
  constructor() {
    // Centralized Access Points
    this.configs = configs;
    this.permissions = permissions;
    this.validations = validations;
  }
}

// Singleton Instance (Global-like but Controlled)
const toolbox = new Toolbox();
module.exports = toolbox;
