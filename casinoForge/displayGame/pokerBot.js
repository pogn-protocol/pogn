const PokerPlayer = require("./pokerPlayer");

class PokerBot extends PokerPlayer {
  constructor(botId, displayGameRelay, gameController, gameId) {
    super({ seatIndex: -1, playerId: botId, playerName: "PB-Bot" });
    this.botId = botId;
    this.displayGameRelay = displayGameRelay;
    this.gameController = gameController;
    this.gameId = gameId;
    this.thinking = false;

    this.socket = {
      readyState: 1,
      send: async (data) => {
        const parsed = JSON.parse(data);
        await this.displayGameRelay.processMessage(this.socket, parsed);
      },
    };
  }

  receiveGameMessage(message) {
    console.log(`📩 [PokerBot] receiveGameMessage:`, message);
    const { payload } = message;
    console.log(`📩 [PokerBot] payload:`, payload);

    if (payload.private && payload.playerId === this.botId && payload.hand) {
      this.hand = message.hand;
      console.log(`🃏 [PokerBot] Hand received:`, this.hand);
    }

    const turnId = payload.gameState?.turn || payload.botTurn;

    console.log(`[PokerBot] checking turnId=${turnId} vs botId=${this.botId}`);

    if (turnId === this.botId && !this.thinking) {
      console.log(`⏳ [PokerBot] It's my turn. Thinking...`);
      this.thinking = true;

      setTimeout(() => {
        console.log(`🧠 [PokerBot] Deciding action after thinking...`);
        const botMove = this.decideAction();
        console.log(`✅ [PokerBot] Decided move:`, botMove);

        if (botMove) {
          this.socket.send(
            JSON.stringify({
              type: "displayGame",
              payload: {
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
    try {
      console.log(`🧠 [PokerBot] Deciding action...`, this.gameId);
      const game = this.gameController.activeGames.get(this.gameId);
      console.log("game", game);
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
    } catch (error) {
      console.error(`❌ [PokerBot] Error deciding action:`, error);
      return null;
    }
  }
}

module.exports = PokerBot;
