module.exports = {
  validateIncomingMessage: (data) => {
    return (
      data && typeof data.playerId === "string" && data.playerId.length > 0
    );
  },

  createVerificationResponse: (gameId) => {
    const response = {
      type: "verification_response",
      payload: { gameId },
    };
    return response.payload.gameId ? response : null;
  },
};
