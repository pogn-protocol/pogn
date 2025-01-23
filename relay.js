const WebSocket = require("ws");
const GameController = require("./gameController");
const LobbyController = require("./lobbyController");

const wss = new WebSocket.Server({ port: 8080 }, () => {
  console.log("Relay running on ws://localhost:8080");
});

const lobby = new LobbyController();
const gameController = new GameController();

// Utility: Send a response to a single client
const sendResponse = (client, response) => {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(response));
  }
};

// Utility: Broadcast a response to all clients, optionally excluding the sender
const broadcastResponse = (response, sender = null) => {
  wss.clients.forEach((client) => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(response));
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

      switch (type) {
        case "lobby": {
          const response = lobby.processMessage({ action, payload, ws });

          if (response) {
            console.log("Lobby response:", response);
            sendResponse(ws, response);

            if (response.broadcast) {
              broadcastResponse(response, ws);
            }
          }
          break;
        }

        case "game": {
          const response = gameController.processMessage({
            action,
            payload,
            ws,
          });
          console.log("Game response:", response);

          if (response) {
            console.log("Sending game response:", response);
            sendResponse(ws, response);

            if (response.broadcast) {
              console.log("Broadcasting game response...");
              response.players.forEach((player, publicKey) => {
                if (
                  player.ws &&
                  player.ws.readyState === 1 &&
                  player.ws !== ws
                ) {
                  console.log(
                    `Broadcasting game response to player ${publicKey}`
                  );
                  player.ws.send(JSON.stringify(response));
                }
              });
            }
          }
          break;
        }

        default:
          console.warn(`Unhandled message type: ${type}`);
          sendResponse(ws, {
            type: "error",
            payload: { message: `Unknown message type: ${type}` },
          });
          break;
      }
    } catch (error) {
      console.error("Error processing message:", error.message);
      sendResponse(ws, {
        type: "error",
        payload: { message: "Invalid message format or processing error" },
      });
    }
  });

  ws.on("close", () => {
    console.log("Connection closed.");
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error.message);
  });
});
