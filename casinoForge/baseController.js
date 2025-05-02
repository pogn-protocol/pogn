class BaseController {
  constructor({ type, relayManager }) {
    this.relayManager = relayManager || null;
    this.type = type || null;
    this.messages = [];
  }

  async processMessage(payload, steps = []) {
    console.log(`Processing message in Base controller:`, payload);
    let current;
    let breaker = false;
    for (const fn of steps) {
      if (typeof fn !== "function") continue;
      if (breaker) break;

      try {
        const result = await fn(payload);
        console.log("Result after step:", result);
        current = result;
        if (result?.error) {
          console.warn(result.error, current);
          breaker = true;
          return;
        }
      } catch (err) {
        console.error("Error caught in processing step:", err, current);
        breaker = true;
        current = {
          ...current,
          error: err.message || "Error during processing",
        };
      }
    }
    console.log("Final payload after processing:", current);
    return current;
  }

  errorPayload(errorMessage, extra = {}) {
    console.log("Creating error payload", errorMessage, extra);
    return {
      payload: {
        type: "error",
        errorMessage,
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
