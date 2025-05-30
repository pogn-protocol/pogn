class PokerBot {
  constructor(botId, game, relay) {
    this.botId = botId;
    this.game = game;
    this.relay = relay;
    this.thinking = false;
    this.socket = {
      send: (data) => {
        const parsed = JSON.parse(data);
        this.relay.processMessage(this.socket, parsed); // ← this is key
      },
    };
  }

  receiveGameMessage(message) {
    console.log(`📩 PokerBot.receiveGameMessage called with message:`, message);

    if (message.private && message.playerId === this.botId && message.hands) {
      this.hand = message.hands;
      console.log(`🃏 Bot received hand:`, this.hand);
    }

    // 💡 Add this:
    const turnId = message.botTurn || null;
    if (turnId === this.botId && !this.thinking) {
      this.thinking = true;
      setTimeout(() => {
        const botMove = this.decideAction();
        if (botMove) {
          this.socket.send(
            JSON.stringify({
              payload: {
                type: "displayGame",
                playerId: this.botId,
                action: botMove.action,
                amount: botMove.amount,
              },
            })
          );
        }
        this.thinking = false;
      }, 3000);
    }
  }

  decideAction() {
    console.log(`🤔 PokerBot.decideAction called`);
    const player = this.game.players.get(this.botId);
    if (!player || player.hasFolded) {
      console.log(`🚫 Bot has folded or is not found`);
      return null;
    }

    const isPreflop = this.game.street === "preflop";
    const potSize = this.game.pot;
    const stack = player.stack;

    console.log(
      `📊 Bot state: street=${this.game.street}, potSize=${potSize}, stack=${stack}`
    );

    if (isPreflop && stack >= this.game.bigBlind * 2) {
      console.log(`✅ Bot deciding to bet`);
      return { action: "bet", amount: this.game.bigBlind * 2 };
    }

    console.log(`🟰 Bot deciding to check`);
    return { action: "check" };
  }
}

module.exports = PokerBot;
