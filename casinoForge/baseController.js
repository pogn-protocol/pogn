class BaseController {
  constructor({ type, relayManager }) {
    this.relayManager = relayManager || null;
    this.type = type || null;
    this.messages = [];
  }

  async processMessage(payload, steps = []) {
    console.log(`Processing message in Base controller:`, payload);
    let current = { ...payload }; // start from payload

    for (let i = 0; i < steps.length; i++) {
      const fn = steps[i];
      if (typeof fn !== "function") continue;

      try {
        const result = await fn(current);
        console.log("Result after step:", result);

        if (result?.error) {
          console.warn(result.error, result);
          return this.errorPayload(result.error, payload);
        }

        // last step replaces current
        current = i === steps.length - 1 ? result : { ...current, ...result };

        console.log("Current payload:", current);
      } catch (err) {
        console.error("Error caught in processing step:", err);
        return this.errorPayload("Server side error");
      }
    }

    console.log("Final payload after processing:", current);
    return current;
  }

  // async processMessage(payload, steps = []) {
  //   console.log(`Processing message in Base controller:`, payload);
  //   let current;
  //   let breaker = false;
  //   for (const fn of steps) {
  //     if (typeof fn !== "function") continue;
  //     if (breaker) break;

  //     try {
  //       const result = await fn(payload);
  //       console.log("Result after step:", result);
  //       //return if last step
  //       if (steps.indexOf(fn) === steps.length - 1) {
  //         console.log("Last step, returning result:", result);
  //         return result;
  //       }
  //       current = {
  //         ...current,
  //         ...result,
  //       };
  //       console.log("Current payload:", current);
  //       if (result?.error) {
  //         console.warn(result.error, current);
  //         current = this.errorPayload(result.error, payload);
  //         breaker = true;
  //         return;
  //       }
  //     } catch (err) {
  //       console.error("Error caught in processing step:", err, current);
  //       breaker = true;
  //       // current = {
  //       // //  ...current,
  //       //   error: err.message || "Error during processing",
  //       // };
  //       current = this.errorPayload(
  //         // payload
  //         "Server side error"
  //       );
  //     }
  //   }
  //   console.log("Final payload after processing:", current);
  //   return current;
  // }

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
