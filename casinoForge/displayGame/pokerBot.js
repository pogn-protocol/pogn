const PokerPlayer = require("./pokerPlayer");

class PokerBot extends PokerPlayer {
  constructor(botId, controller, gameId) {
    super({ seatIndex: -1, playerId: botId, playerName: "PB-Bot" });
    this.botId = botId;
    this.controller = controller;
    this.gameId = gameId;
    this.thinking = false;

    // 🔌 Fake WebSocket for routing through the relay
    this.socket = {
      send: (data) => {
        const parsed = JSON.parse(data);
        console.log(`📤 [PokerBot] Sending action:`, parsed.payload);
        this.controller.processMessage(parsed.payload);
      },
    };
  }

  receiveGameMessage(message) {
    console.log(`📩 [PokerBot] receiveGameMessage:`, message);

    // 🃏 Save hand if received
    if (message.private && message.playerId === this.botId && message.hand) {
      this.hand = message.hand;
      console.log(`🃏 [PokerBot] Hand received:`, this.hand);
    }

    const turnId = message.currentTurn || message.botTurn;
    if (turnId === this.botId && !this.thinking) {
      console.log(`⏳ [PokerBot] It's my turn. Thinking...`);
      this.thinking = true;

      setTimeout(() => {
        const botMove = this.decideAction();
        if (botMove) {
          console.log(`✅ [PokerBot] Decided move:`, botMove);
          this.socket.send(
            JSON.stringify({
              payload: {
                type: "displayGame",
                action: "gameAction",
                playerId: this.botId,
                gameId: this.gameId,
                gameAction: botMove.action,
                gameActionParams: { amount: botMove.amount },
              },
            })
          );
        } else {
          console.log(`🛑 [PokerBot] No valid action (maybe folded?)`);
        }
        this.thinking = false;
      }, 3000);
    }
  }

  decideAction() {
    console.log(`🧠 [PokerBot] Deciding action...`);
    const game = this.controller.activeGames.get(this.gameId);
    const player = game?.instance?.players.get(this.botId);
    if (!player || player.hasFolded) {
      console.log(`🚫 [PokerBot] Cannot act: Player not found or folded`);
      return null;
    }

    const isPreflop = game.instance?.street === "preflop";
    const potSize = game.instance?.pot;
    const stack = player.stack;

    console.log(
      `📊 [PokerBot] Game state: preflop=${isPreflop}, stack=${stack}, pot=${potSize}`
    );

    if (isPreflop && stack >= game.instance.bigBlind * 2) {
      return { action: "bet", amount: game.instance.bigBlind * 2 };
    }

    return { action: "check" };
  }
}

module.exports = PokerBot;
