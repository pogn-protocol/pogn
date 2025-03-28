import React, { useEffect, useRef, useState } from "react";
import RockPaperScissors from "./RockPaperScissors";
import OddsAndEvens from "./oddsAndEvens";
import {
  JsonView,
  allExpanded,
  darkStyles,
  defaultStyles,
} from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";

const GameConsole = ({
  sendGameMessage,
  message = {},
  playerId = "",
  gamesToInit,
  lobbyUrl,
  gameConnections,
  setAddRelayConnections,
  setGamesToInit,
  gameMessages,
}) => {
  const [gameStates, setGameStates] = useState(new Map());
  useEffect(() => {
    if (!message || Object.keys(message).length === 0) {
      console.log("No message received.");
      return;
    }
    console.log("Processing Game message:", message);
    const { payload } = message;
    if (!payload) {
      console.warn("No payload in message:", message);
      return;
    }
    const { type, action } = payload;
    if (type !== "game") {
      console.warn("Message sent to game not of type game:", type);
      return;
    }
    if (!action) {
      console.warn("No action in payload:", payload);
      return;
    }
    const gameId = payload?.gameId;

    if (!gameId) {
      console.warn("No gameId in payload:", payload);
      return;
    }
    switch (action) {
      case "gameAction":
      case "results":
        updateGameState(gameId, payload); // ✅ Centralized update
        console.log(`🛠️ Updated GameState for ${gameId}:`, payload);
        break;

      case "gameEnded":
        setGameStates((prevStates) => {
          const updatedMap = new Map(prevStates);
          updatedMap.delete(gameId);
          return updatedMap;
        });
        console.log("🛑 Game Ended:", gameId);
        break;

      default:
        console.warn(`Unhandled action: ${action}`);
    }
  }, [message]);

  useEffect(() => {
    if (gamesToInit.length > 0) {
      console.log("🚀 Initializing new games:", gamesToInit);
      setAddRelayConnections(
        gamesToInit.map((game) => ({
          id: game.gameId,
          url: game.wsAddress,
          type: "game",
        }))
      );
    }
  }, [gamesToInit, setAddRelayConnections]);

  useEffect(() => {
    if (gamesToInit.length === 0) {
      console.log("No games to initialize.");
      return;
    }
    if (gameConnections.size > 0) {
      const allReady = gamesToInit.every((game) => {
        const connection = gameConnections.get(game.gameId);
        return connection && connection.readyState === 1;
      });

      if (allReady) {
        console.log("✅ All game connections are ready, initializing games.");
        initNewGames(gamesToInit);
        setGamesToInit((prevGames) =>
          prevGames.filter((game) => !gamesToInit.includes(game))
        );
      } else {
        console.log("⏳ Waiting for all game connections to be ready.");
      }
    }
  }, [gameConnections, gamesToInit]);

  const initNewGames = (games) => {
    console.log("Initializing games", games);
    console.log("gameConnections", gameConnections);
    games.forEach((game) => {
      const gameId = game.gameId;
      const connection = gameConnections.get(gameId);
      if (connection && connection.readyState === 1) {
        console.log("Game to Init:", game);
        updateGameState(gameId, game); // ✅ Centralized update
        console.log(`🗺️ Game ${gameId} stored in gameMap.`);
      } else {
        console.warn(`❌ Connection not ready for game ID: ${gameId}`);
      }
    });
  };

  const updateGameState = (gameId, newState) => {
    setGameStates((prevStates) => {
      const updatedMap = new Map(prevStates);
      const currentGameState = updatedMap.get(gameId) || {};
      updatedMap.set(gameId, {
        ...currentGameState,
        ...newState,
      });
      console.log(updatedMap);
      return updatedMap;
    });
  };

  const renderGameComponent = (gameId, gameState, gameUrl) => {
    console.log(
      "Rendering game component:",
      gameState,
      "for game ID:",
      gameId,
      "at URL:",
      gameUrl
    );
    switch (gameState.gameType) {
      case "rock-paper-scissors":
        return (
          <RockPaperScissors
            sendGameMessage={(msg) => sendGameMessage(gameId, { ...msg })}
            playerId={playerId}
            gameState={gameState}
            gameId={gameId}
          />
        );
      case "odds-and-evens":
        console.log("Rendering Odds and Evens component...", gameState);
        return (
          <OddsAndEvens
            sendGameMessage={(msg) => sendGameMessage(gameId, { ...msg })}
            playerId={playerId}
            gameState={gameState}
            gameId={gameId}
          />
        );
      default:
        return <p>Game type not supported.</p>;
    }
  };

  return (
    <div>
      <div
        style={{
          marginBottom: "20px",
          padding: "10px",
          border: "1px solid #ccc",
        }}
      >
        <h1 className="mb-4">Game Console</h1>
        {console.log("Game States:", gameStates)}
        {Array.from(gameStates.entries())
          .filter(([, gameState]) => gameState.lobbyStatus === "started")
          .map(([gameId, gameState]) => {
            const wsAddress = gameState.wsAddress;
            const connectionState = gameConnections.get(gameId)?.readyState;
            console.log(gameConnections);
            console.log("Connection state:", connectionState);
            const connectionColor =
              connectionState === 1
                ? "green"
                : connectionState === 3
                ? "red"
                : "yellow";
            console.log("Connection color:", connectionColor);

            const connectionTitle =
              connectionState === 1
                ? "Connected"
                : connectionState === 0
                ? "Connecting..."
                : connectionState === 2
                ? "Closing..."
                : "Disconnected";
            console.log("Connection title:", connectionTitle);
            return (
              <div
                key={gameId}
                style={{
                  marginBottom: "20px",
                  padding: "10px",
                  border: "1px solid #ccc",
                }}
              >
                <h2>Game ID: {gameId}</h2>
                <div className="d-flex  mb-2">
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      backgroundColor: connectionColor,
                      border: "1px solid #333",
                    }}
                    title={connectionTitle}
                  ></div>
                  <div style={{ marginLeft: "10px" }}>
                    <p> {connectionTitle}</p>
                  </div>
                </div>
                {console.log(
                  `Rendering game component gameType: ${gameState.gameType} for game ID: ${gameId} at URL: ${wsAddress}`
                )}
                {renderGameComponent(gameId, gameState, wsAddress)}
                <p>Game Messages:</p>
                {gameMessages[gameId]?.length > 1 && (
                  <details style={{ marginBottom: "8px" }}>
                    <summary>
                      Previous Messages ({gameMessages[gameId].length - 1})
                    </summary>
                    {gameMessages[gameId].slice(0, -1).map((msg, index) => (
                      <JsonView
                        data={msg}
                        key={`prev-game-msg-${gameId}-${index}`}
                        shouldExpandNode={() => false} // Always collapsed for previous messages
                        style={{ fontSize: "14px", lineHeight: "1.2" }}
                      />
                    ))}
                  </details>
                )}

                {/* Render the last message fully expanded */}
                {gameMessages[gameId]?.slice(-1).map((msg, index) => (
                  <JsonView
                    data={msg}
                    key={`last-game-msg-${gameId}-${index}`}
                    shouldExpandNode={() => true} // Always fully expanded for the last message
                    style={{ fontSize: "14px", lineHeight: "1.2" }}
                  />
                ))}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default GameConsole;
