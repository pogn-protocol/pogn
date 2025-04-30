class BaseController {
  constructor({ type, relayManager }) {
    this.relayManager = relayManager || null;
    this.type = type || null;
    this.messages = [];
  }

  async processMessage(payload, steps = []) {
    console.log(`Processing message in Base controller:`, payload);
    let current = { ...payload };
    let breaker = false;
    for (const fn of steps) {
      if (typeof fn !== "function") continue;
      if (breaker) break;

      try {
        const result = await fn(current);
        console.log("Result after step:", result);
        // 🛑 If the result has `.error`, stop and return error payload
        if (result?.error) {
          console.warn(result.error, current);
          breaker = true;
          //return this.errorPayload(result.error, current);
          current = { ...current, ...result };
        }

        // ✅ Merge any context provided
        if (result && typeof result === "object") {
          current = { ...current, ...result };
        }
      } catch (err) {
        // return this.errorPayload(
        //   err.message || "Error during processing",
        //   current
        // );
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
    // return this.steralizePayload(
    //   current.type || this.type,
    //   current.action,
    //   current
    // );
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
