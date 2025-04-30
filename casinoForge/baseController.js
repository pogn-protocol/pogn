class BaseController {
  constructor({ type, relayManager }) {
    this.relayManager = relayManager || null;
    this.type = type || null;
    this.messages = [];
  }

  async processMessage(payload, steps = []) {
    console.log(`Processing message in Base controller:`, payload);
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
    console.log("Final payload after processing:", current);
    // return current;
    return this.steralizePayload(
      current.type || this.type,
      current.action,
      current
    );
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

  steralizePayload(type, action, data = {}) {
    console.log("Steralizing payload", type, action, data);
    return {
      payload: {
        type: this.type || type,
        action,
        ...data,
      },
      broadcast: true,
    };
  }
}

module.exports = BaseController;
