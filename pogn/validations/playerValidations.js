module.exports = {
  validateOutgoingMessage: (data) => {
    return (
      data && typeof data.playerId === "string" && data.playerId.length > 0
    );
  },

  validateIncomingResponse: (data) => {
    return data && typeof data.gameId === "string" && data.gameId.length > 0;
  },
};
