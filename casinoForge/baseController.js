class BaseController {
  constructor({ relayManager } = {}) {
    this.relayManager = relayManager;
  }

  async processMessage(payload, steps = []) {
    let current = { ...payload };

    for (const fn of steps) {
      if (typeof fn !== "function") continue;

      try {
        const result = await fn(current);

        // 🛑 If the result has `.error`, stop and return error payload
        if (result?.error) {
          return this.errorPayload("hookError", result.error, current);
        }

        // ✅ Merge any context provided
        if (result && typeof result === "object") {
          current = { ...current, ...result };
        }
      } catch (err) {
        return this.errorPayload(
          "hookException",
          err.message || "Error during processing",
          current
        );
      }
    }

    return current;
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
