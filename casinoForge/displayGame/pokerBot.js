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
    const { payload, uuid } = message;
    console.log(`📩 [PokerBot] payload:`, payload);

    if (payload.private && payload.playerId === this.botId && payload.hand) {
      this.hand = message.hand;
      console.log(`🃏 [PokerBot] Hand received:`, this.hand);
    }

    const turnId = payload.gameState?.turn;

    // Reset lastTurnUuid if turn changed away from bot
    if (turnId !== this.botId) {
      this.lastTurnUuid = null;
      return;
    }

    console.log(`[PokerBot] checking turnId=${turnId} vs botId=${this.botId}`);
    console.log(
      `[PokerBot] lastTurnUuid=${this.lastTurnUuid}, thinking=${this.thinking}`
    );

    // Only act once per unique turn broadcast (UUID-based)
    if (turnId === this.botId && uuid !== this.lastTurnUuid && !this.thinking) {
      this.lastTurnUuid = uuid;

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

  // receiveGameMessage(message) {
  //   console.log(`📩 [PokerBot] receiveGameMessage:`, message);
  //   const { payload } = message;
  //   console.log(`📩 [PokerBot] payload:`, payload);

  //   if (payload.private && payload.playerId === this.botId && payload.hand) {
  //     this.hand = message.hand;
  //     console.log(`🃏 [PokerBot] Hand received:`, this.hand);
  //   }

  //   const turnId = payload.gameState?.turn;
  //   if (turnId !== this.botId) {
  //     this.lastTurnSeen = null; // ⬅️ reset if not our turn
  //     return;
  //   }
  //   console.log(`[PokerBot] checking turnId=${turnId} vs botId=${this.botId}`);
  //   console.log(
  //     `[PokerBot] lastTurnSeen=${this.lastTurnSeen}, thinking=${this.thinking}`
  //   );
  //   if (
  //     turnId === this.botId &&
  //     turnId !== this.lastTurnSeen &&
  //     !this.thinking
  //   ) {
  //     this.lastTurnSeen = turnId;

  //     console.log(`⏳ [PokerBot] It's my turn. Thinking...`);
  //     this.thinking = true;

  //     setTimeout(() => {
  //       console.log(`🧠 [PokerBot] Deciding action after thinking...`);
  //       const botMove = this.decideAction();
  //       console.log(`✅ [PokerBot] Decided move:`, botMove);

  //       if (botMove) {
  //         this.socket.send(
  //           JSON.stringify({
  //             type: "displayGame",
  //             payload: {
  //               action: "gameAction",
  //               playerId: this.botId,
  //               gameId: this.gameId,
  //               gameAction: botMove.action,
  //               gameActionParams: { amount: botMove.amount },
  //             },
  //           })
  //         );
  //       } else {
  //         console.log(`🛑 [PokerBot] No valid action (maybe folded?)`);
  //       }
  //       this.thinking = false;
  //     }, 3000);
  //   }
  // }

  decideAction() {
    try {
      console.log(`🧠 [PokerBot] Deciding action...`, this.gameId);
      const game = this.gameController.activeGames.get(this.gameId);
      console.log("game", game);

      const instance = game?.instance;
      const player = instance?.players.get(this.botId);
      if (!player || player.hasFolded) {
        console.log(`🚫 [PokerBot] Cannot act: Player not found or folded`);
        return null;
      }

      const isPreflop = instance.street === "preflop";
      const potSize = instance.pot;
      const stack = player.stack;
      const playerBet = player.bet;
      const maxBet = Math.max(
        ...[...instance.players.values()].map((p) => p.bet)
      );
      const amountToCall = maxBet - playerBet;

      console.log(
        `📊 [PokerBot] Game state: street=${instance.street}, stack=${stack}, pot=${potSize}, playerBet=${playerBet}, maxBet=${maxBet}, amountToCall=${amountToCall}`
      );

      // 🟢 Preflop open
      if (isPreflop && maxBet === 0 && stack >= instance.bigBlind * 2) {
        return { action: "bet", amount: instance.bigBlind * 2 };
      }

      // 🟢 Call if needed and affordable
      if (amountToCall > 0 && amountToCall <= stack) {
        return { action: "call" };
      }

      // ✅ No bet yet, postflop or otherwise: check
      if (amountToCall === 0) {
        return { action: "check" };
      }

      // 🚨 Can't afford to call, fold
      return { action: "fold" };
    } catch (error) {
      console.error(`❌ [PokerBot] Error deciding action:`, error);
      return null;
    }
  }
}

module.exports = PokerBot;
