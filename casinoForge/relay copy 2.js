const WebSocket = require("ws");

class Relay {
  constructor(lobbyController, gamesController) {
    this.lobbyController = lobbyController;
    this.gamesController = gamesController;
    this.webSocketMap = new Map();

    this.wss = new WebSocket.Server({ port: 8080 }, () => {
      console.log("Relay running on ws://localhost:8080");
    });

    this.setupWebSocketHandlers();
  }

  setupWebSocketHandlers() {
    this.wss.on("connection", (ws) => {
      console.log("New connection established.");
      this.handleConnection(ws);
    });
  }

  handleConnection(ws) {
    ws.on("message", (message) => {
      try {
        if (Buffer.isBuffer(message)) {
          message = message.toString("utf-8");
        }
        const parsedMessage = JSON.parse(message);
        console.log("Message received:", parsedMessage);

        const { type, action, payload } = parsedMessage;

        switch (type) {
          case "lobby":
            this.handleLobbyMessage(ws, action, payload);
            break;
          case "game":
            this.handleGameMessage(ws, action, payload);
            break;
          default:
            console.warn(`Unhandled message type: ${type}`);
            this.sendToPlayer(payload?.playerId, {
              type: "error",
              payload: { message: `Unknown message type: ${type}` },
            });
        }
      } catch (error) {
        console.error(error);
        this.sendToPlayer(null, {
          type: "error",
          payload: { message: "Invalid message format." },
        });
      }
    });

    ws.on("close", () => this.handleDisconnection(ws));
    ws.on("error", (error) => console.error("WebSocket error:", error.message));
  }

  handleLobbyMessage(ws, action, payload) {
    console.log("Processing lobby message:", { action, payload });

    if (payload?.playerId) {
      const existingSocket = this.webSocketMap.get(payload.playerId);
      if (existingSocket && existingSocket !== ws) {
        console.log(
          `Player ${payload.playerId} reconnected. Replacing old WebSocket.`
        );
        existingSocket.send(
          JSON.stringify({
            type: "notification",
            payload: {
              message: "You have been disconnected due to a new connection.",
            },
          })
        );
        existingSocket.close();
        this.webSocketMap.delete(payload.playerId);
      }
      this.webSocketMap.set(payload.playerId, ws);
      console.log(`Player ${payload.playerId} added to WebSocket map.`);
    } else {
      ws.send(
        JSON.stringify({
          type: "error",
          payload: { message: "No playerId in payload" },
        })
      );
      return;
    }

    let response =
      action === "login"
        ? this.lobbyController.test(payload.playerId)
        : this.lobbyController.processMessage(action, payload);

    if (response) {
      this.sendToPlayer(payload.playerId, response);
      if (response.broadcast) {
        this.broadcastResponse(response);
      }
    }
  }

  handleGameMessage(ws, action, payload) {
    console.log("Processing game message:", { action, payload });
    const response = this.gamesController.processMessage({ action, payload });

    if (response) {
      this.sendToPlayer(payload.playerId, response);
      if (response.broadcast) {
        this.broadcastResponse(response, payload.playerId);
      }
    }
  }

  handleDisconnection(ws) {
    console.log("Connection closed.");

    let disconnectedPlayerId = null;
    for (const [playerId, socket] of this.webSocketMap.entries()) {
      if (socket === ws) {
        disconnectedPlayerId = playerId;
        this.webSocketMap.delete(playerId);
        console.log(`Player ${playerId} removed from WebSocket map.`);
        break;
      }
    }

    if (disconnectedPlayerId) {
      this.lobbyController.lobby.removePlayer({
        playerId: disconnectedPlayerId,
      });
      console.log(`Player ${disconnectedPlayerId} removed from the lobby.`);

      this.broadcastResponse({
        type: "lobby",
        action: "refreshLobby",
        payload: {
          lobbyPlayers: this.lobbyController.lobby.getLobbyPlayers(),
          lobbyGames: this.lobbyController.lobby.getLobbyGames(),
        },
      });
    }
  }

  sendToPlayer(playerId, response) {
    const ws = this.webSocketMap.get(playerId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(response));
      console.log(`Message sent to player ${playerId}:`, response);
    } else {
      console.warn(`WebSocket not open for player ${playerId}`);
    }
  }

  broadcastResponse(response, excludeplayerId = null) {
    this.webSocketMap.forEach((ws, playerId) => {
      if (playerId !== excludeplayerId && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(response));
        console.log(`Broadcasting to player ${playerId}:`, response);
      }
    });
  }
}

module.exports = Relay;
