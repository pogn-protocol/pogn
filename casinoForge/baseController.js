// baseController.js
class BaseController {
  constructor({ relayManager } = {}) {
    this.relayManager = relayManager;
    this.messageHandlers = {}; // Override in subclass
  }

  async processMessage(
    message,
    checkPermissions,
    enrichContext = () => ({}),
    validateResponse = null
  ) {
    try {
      const { action, payload } = message; // Extract action and payload

      if (typeof checkPermissions === "function") {
        const permission = checkPermissions(message);
        if (!permission.allowed) {
          console.warn("⛔ Permission denied:", permission.reason);
          return this.errorPayload(
            "permissionDenied",
            permission.reason,
            payload
          );
        }
      }

      const handler = this.messageHandlers[action];
      if (!handler) {
        console.warn(`⚠️ Unknown action: ${action}`);
        return this.errorPayload(
          "unknownAction",
          `Unknown action: ${action}`,
          payload
        );
      }

      const context = enrichContext(payload);
      let result;

      try {
        console.log("🔍 Enriching payload with context:", context);
        console.log("payload:", payload);
        const enrichedPayload = { ...payload, ...context };
        result = await handler(enrichedPayload);

        if (validateResponse && typeof validateResponse === "function") {
          validateResponse(result);
        }
      } catch (err) {
        console.error("❌ Error inside handler:", err);
        result = this.errorPayload(
          "handlerError",
          err.message || "Unknown error",
          payload
        );
      }

      return result;
    } catch (err) {
      console.error("❌ Controller Error:", err);
      return this.errorPayload(
        "internalError",
        "Failed to process message",
        message.payload
      );
    }
  }

  errorPayload(action, message, extra = {}) {
    return {
      payload: {
        type: "error",
        action,
        message,
        ...extra,
      },
    };
  }

  broadcastPayload(type, action, data = {}) {
    return {
      payload: {
        type,
        action,
        ...data,
      },
      broadcast: true,
    };
  }
}

module.exports = BaseController;
