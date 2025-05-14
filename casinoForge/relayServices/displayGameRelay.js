const Relay = require("./relay");

class DisplayGameRelay extends Relay {
  constructor({ id, ports, host }) {
    super({ type: "displayGame", id, ports, host });
    this.gameHasStarted = false;
  }

  async processMessage(ws, message) {
    const { action, playerId, seatIndex } = message?.payload || {};

    if (action === "startHand") {
      console.log(`🎬 DisplayGameRelay: Game started`);
      this.gameHasStarted = true;
      return;
    }

    if (action === "endHand") {
      console.log(`🛑 DisplayGameRelay: Game ended`);
      this.gameHasStarted = false;
      return;
    }

    if (action === "sit" && typeof seatIndex === "number") {
      this.playerMap.set(playerId, ws);
      this.seatMap.set(playerId, seatIndex);
    }

    if (action === "leave") {
      this.playerMap.delete(playerId);
      this.seatMap.delete(playerId);
    }

    const playersAtTable = Array.from(this.seatMap.entries()).map(
      ([id, index]) => ({ playerId: id, seatIndex: index })
    );

    const enriched = {
      ...message,
      payload: {
        ...message.payload,
        playersAtTable,
      },
    };

    this.broadcastResponse(enriched);
  }
}

module.exports = DisplayGameRelay;
