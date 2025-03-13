module.exports = {
  validateOutgoing: (message) => {
    return message && typeof message.type === "string" && message.payload;
  },

  validateIncoming: (message) => {
    return message && message.from && message.message;
  },

  createIdRequest: (id) => ({
    type: "id_request",
    payload: { id },
  }),

  createIdResponse: (receivedId) => ({
    type: "id_response",
    payload: { receivedId, confirmation: "acknowledged" },
  }),
};
