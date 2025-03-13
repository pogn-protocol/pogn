const fs = require("fs");
const path = require("path");
const configs = require("../configs/configs");

class StateManager {
  constructor(id) {
    this.id = id;

    // ✅ Use process.cwd() to ensure paths are relative to the project root
    this.externalStatePath = path.resolve(
      process.cwd(),
      configs.stateManager.externalStatePath
    );
    this.internalStatePath = path.resolve(
      process.cwd(),
      `${configs.stateManager.internalStateDir}/${id}.json`
    );

    this.initializeState();
  }

  initializeState() {
    const externalDir = path.dirname(this.externalStatePath);
    const internalDir = path.dirname(this.internalStatePath);
    console.log("externalDir", externalDir);
    console.log("internalDir", internalDir);

    if (!fs.existsSync(externalDir)) {
      fs.mkdirSync(externalDir, { recursive: true });
    }

    if (!fs.existsSync(internalDir)) {
      fs.mkdirSync(internalDir, { recursive: true });
    }

    if (!fs.existsSync(this.externalStatePath)) {
      fs.writeFileSync(
        this.externalStatePath,
        JSON.stringify({ registered: [] }, null, 2)
      );
    }

    if (!fs.existsSync(this.internalStatePath)) {
      fs.writeFileSync(
        this.internalStatePath,
        JSON.stringify({ knownPeers: [] }, null, 2)
      );
    }
    console.log("this.id", this.id);
    this.addToState("external", { id: this.id, timestamp: Date.now() });
    this.addToState("internal", { knownPeers: [] });
  }

  addToState(type, data) {
    const state =
      type === "external" ? this.readExternalState() : this.readInternalState();
    const key = type === "external" ? "registered" : "knownPeers";

    if (
      !state[key].some(
        (entry) => JSON.stringify(entry) === JSON.stringify(data)
      )
    ) {
      state[key].push(data);
      this.writeState(type, state);
    }
  }

  readExternalState() {
    try {
      const data = fs.readFileSync(this.externalStatePath, "utf-8").trim();
      if (data === "") {
        console.warn(
          "External state file is empty. Initializing with default."
        );
        return { registered: [] }; // Fallback for empty files
      }
      return JSON.parse(data);
    } catch (error) {
      console.error("Error reading external state:", error.message);
      return { registered: [] }; // Fallback for parse errors
    }
  }

  readInternalState() {
    try {
      const data = fs.readFileSync(this.internalStatePath, "utf-8").trim();
      if (data === "") {
        console.warn(
          "Internal state file is empty. Initializing with default."
        );
        return { knownPeers: [] }; // Fallback for empty files
      }
      return JSON.parse(data);
    } catch (error) {
      console.error("Error reading internal state:", error.message);
      return { knownPeers: [] }; // Fallback for parse errors
    }
  }

  writeState(type, state) {
    const pathToWrite =
      type === "external" ? this.externalStatePath : this.internalStatePath;
    fs.writeFileSync(pathToWrite, JSON.stringify(state, null, 2));
  }

  clearAllState() {
    console.log(`[${this.id}] 🧹 Clearing local state...`);

    const emptyExternalState = { registered: [] };
    const emptyInternalState = { knownPeers: [] };

    fs.writeFileSync(
      this.externalStatePath,
      JSON.stringify(emptyExternalState, null, 2)
    );
    fs.writeFileSync(
      this.internalStatePath,
      JSON.stringify(emptyInternalState, null, 2)
    );

    console.log(`[${this.id}] ✅ Local state cleared.`);
  }
  clearExternalState() {
    console.log(`[${this.id}] 🧹 Clearing external state...`);

    const emptyExternalState = { registered: [] };

    fs.writeFileSync(
      this.externalStatePath,
      JSON.stringify(emptyExternalState, null, 2)
    );

    console.log(`[${this.id}] ✅ External state cleared.`);
  }
  clearInternalState() {
    console.log(`[${this.id}] 🧹 Clearing internal state...`);

    const emptyInternalState = { knownPeers: [] };

    fs.writeFileSync(
      this.internalStatePath,
      JSON.stringify(emptyInternalState, null, 2)
    );

    console.log(`[${this.id}] ✅ Internal state cleared.`);
  }
}

module.exports = StateManager;
