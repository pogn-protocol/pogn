module.exports = {
  moneyService: {
    validateTransaction: (amount) => typeof amount === "number" && amount > 0,
  },

  messengerService: {
    validateMessage: (message) => message && message.type && message.payload,
  },

  relayManager: {
    validatePeerId: (id) => typeof id === "string" && id.length > 0,
  },
};
