module.exports = {
  moneyService: {
    canInitiateTransaction: (userRole) => userRole === "player",
    canViewBalance: (userRole) => userRole !== "banned",
  },

  messengerService: {
    canSendMessage: (userRole) => userRole === "admin" || userRole === "player",
    canRecieveMessage: (userRole) => userRole !== "banned",
  },

  relayManager: {
    canAccessRelay: (userRole) => userRole !== "banned",
  },
};
