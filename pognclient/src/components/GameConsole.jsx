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
  connections,
}) => {
  const [gameStates, setGameStates] = useState(new Map());
  useEffect(() => {
    if (!message || Object.keys(message).length === 0) {
      console.log("No message received.");
      return;
    }

    console.log("Processing Game message:", message);
    const { action, payload } = message;
    const gameId = payload?.gameId;

    if (!action || !payload || !gameId) {
      console.warn("Invalid message received:", message);
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
    //   console.log(`Updating game ID: ${gameId}`, currentGameState);

    //   switch (action) {
    //     case "gameAction":
    //       newStates.set(gameId, {
    //         ...payload,
    //       });
    //       console.log("🛠️ Updated GameState:", newStates);
    //       break;

    //     case "results":
    //       newStates.set(gameId, {
    //         ...payload,
    //       });
    //       console.log("🏁 Game Finished:", newStates);
    //       break;

    //     case "gameEnded":
    //       newStates.delete(gameId);
    //       console.log("🛑 Game Ended:", newStates);
    //       console.log("Game ended.");
    //       break;

    //     default:
    //       console.warn(`Unhandled action: ${action}`);
    //   }

    //   return newStates;
    // });
  }, [message]);

  useEffect(() => {
    if (gamesToInit.length > 0) {
      console.log("🚀 Initializing new games:", gamesToInit);
      initNewGames(gamesToInit);
    }
  }, [gamesToInit]);

  const initNewGames = (gamesToInit) => {
    console.log("Initializing gamesToInit", gamesToInit);

    gamesToInit.forEach((gameToInit) => {
      const gameId = gameToInit.gameId;
      const connection = connections.get(gameId);

      // Check if connection exists and is ready
      if (connection && connection.readyState === 1) {
        console.log("gameToInit:", gameToInit);
        updateGameState(gameId, gameToInit); // ✅ Centralized update
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
        ...newState, // Merge new state with existing state
      });

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
            sendGameMessage={
              (msg) => sendGameMessage(gameId, { ...msg }) // Include gameId in every message
            }
            playerId={playerId}
            localGameState={gameState}
            gameId={gameId}
          />
        );
      case "odds-and-evens":
        console.log("Rendering Odds and Evens component...", gameState);
        return (
          <OddsAndEvens
            sendGameMessage={
              (msg) => sendGameMessage(gameId, { ...msg }) // Include gameId in every message
            }
            playerId={playerId}
            localGameState={gameStates}
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

        {Array.from(gameStates.entries())
          .filter(([, gameState]) => gameState.lobbyStatus === "started")
          .map(([gameId, gameState]) => {
            const wsAddress = gameState.wsAddress; // Access wsAddress from gameState
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
                {console.log(
                  `Rendering game component gameType: ${gameState.gameType} for game ID: ${gameId} at URL: ${wsAddress}`
                )}
                {renderGameComponent(gameId, gameState, wsAddress)}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default GameConsole;
