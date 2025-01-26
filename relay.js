const WebSocket = require("ws");
const gamesController = require("./gamesController"); // Use the singleton instance
const LobbyController = require("./LobbyController");

const lobbyController = new LobbyController(gamesController);

const wss = new WebSocket.Server({ port: 8080 }, () => {
  console.log("Relay running on ws://localhost:8080");
});

// WebSocket Map: playerId -> WebSocket
const webSocketMap = new Map();

// Utility: Send a response to a specific player by playerId
const sendToPlayer = (playerId, response) => {
  const ws = webSocketMap.get(playerId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(response));
    console.log(`Message sent to player ${playerId}:`, response);
  } else {
    console.warn(`WebSocket not open for player ${playerId}`);
  }
};

// Utility: Broadcast a response to all players, optionally excluding the sender
const broadcastResponse = (response, excludeplayerId = null) => {
  webSocketMap.forEach((ws, playerId) => {
    if (playerId !== excludeplayerId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(response));
      console.log(`Broadcasting to player ${playerId}:`, response);
    }
  });
};

wss.on("connection", (ws) => {
  console.log("New connection established.");

  ws.on("message", (message) => {
    try {
      if (Buffer.isBuffer(message)) {
        message = message.toString("utf-8");
      }
      const parsedMessage = JSON.parse(message);
      console.log("Message received:", parsedMessage);

      const { type, action, payload } = parsedMessage;

      // Handle lobby and game actions
      switch (type) {
        case "lobby": {
          console.log("Processing lobby message:", { action, payload });

          if (type === "lobby" && action === "login" && payload?.playerId) {
            const playerId = payload.playerId;
            webSocketMap.set(playerId, ws); // Register WebSocket with playerId
            console.log(`Player ${playerId} logged in and registered.`);
            const refreshResponse = lobbyController.joinLobby(playerId);
            if (refreshResponse) {
              console.log("Broadcasting lobby refresh...");
              broadcastResponse(refreshResponse);
            }
            setTimeout(() => {
              broadcastResponse(lobbyController.updatePlayers());
            }, 5000);
          }
          console.log("Processing lobby message:", { action, payload });
          const response = lobbyController.processMessage(action, payload);

          if (response) {
            console.log("Lobby response:", response);
            sendToPlayer(payload.playerId, response);

            if (response.broadcast) {
              broadcastResponse(response);
            }
          }
          break;
        }

        case "game": {
          console.log("Processing game message:", { action, payload });
          const response = gamesController.processMessage({
            action,
            payload,
          });

          // if (type === "game" && action === "join" && payload?.playerId) {
          //   const playerId = payload.playerId;
          //   console.log(`Player ${playerId} joined game.`);
          //   const refreshResponse = gamesController.joinGame(
          //     payload.gameId,
          //     playerId
          //   );
          //   if (refreshResponse?.broadcast) {
          //     broadcastResponse(refreshResponse);
          //   }
          //   setTimeout(() => {
          //     broadcastResponse(gamesController.updatePlayers());
          //   }, 5000);
          // }

          if (response) {
            console.log("Game response:", response);
            sendToPlayer(payload.playerId, response);

            if (response.broadcast) {
              broadcastResponse(response, payload.playerId);
            }
          }
          break;
        }

        default:
          console.warn(`Unhandled message type: ${type}`);
          sendToPlayer(payload?.playerId, {
            type: "error",
            payload: { message: `Unknown message type: ${type}` },
          });
          break;
      }
    } catch (error) {
      console.error(error);
      sendToPlayer(null, {
        type: "error",
        payload: { message: "Invalid message format." },
      });
    }
  });

  ws.on("close", () => {
    console.log("Connection closed.");
    // Remove the WebSocket from the map if it disconnects
    webSocketMap.forEach((socket, playerId) => {
      if (socket === ws) {
        webSocketMap.delete(playerId);
        console.log(`Player ${playerId} removed from WebSocket map.`);
      }
    });
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error.message);
  });

  // setInterval(() => {
  //   const refreshResponse = lobby.processMessage({ action: "refreshLobby" });
  //   if (refreshResponse?.broadcast) {
  //     broadcastResponse(refreshResponse);
  //   }
  // }, 5000);
});
