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
  setStartGameConsole,
  sendLobbyMessage,
  setStartGameWebSocket,
  gamesToInit,
  lobbyUrl,
  gameRelaysReady,
  connections,
}) => {
  // const [gameState, setGameState] = useState({
  //   ...initialGameState,
  // });
  const [gameStates, setGameStates] = useState(new Map());
  const [lobbyMessage, setLobbyMessage] = useState({});

  useEffect(() => {
    console.log("Lobby message:", lobbyMessage);
    if (lobbyMessage && Object.keys(lobbyMessage).length > 0) {
      console.log("Sending lobby message:", lobbyMessage);
      sendLobbyMessage(gameId, lobbyMessage);

      setTimeout(() => {
        console.log("Clearing lobby message...");
        setLobbyMessage(null); // Use `null` instead of `{}`
      }, 100);
    }
  }, [lobbyMessage, sendLobbyMessage]);

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

    setGameStates((prevStates) => {
      const newStates = new Map(prevStates);
      const currentGameState = newStates.get(gameId) || {};

      console.log(`Updating game ID: ${gameId}`, currentGameState);

      switch (action) {
        case "gameAction":
          newStates.set(gameId, {
            ...payload,
          });
          console.log("🛠️ Updated GameState:", newStates);
          break;

        case "results":
          newStates.set(gameId, {
            ...payload,
          });
          console.log("🏁 Game Finished:", newStates);
          break;

        case "gameEnded":
          newStates.delete(gameId);
          console.log("🛑 Game Ended:", newStates);
          console.log("Game ended.");
          break;

        default:
          console.warn(`Unhandled action: ${action}`);
      }

      return newStates;
    });
  }, [message]);

  // useEffect(() => {
  //   console.log(
  //     "Games to init:",
  //     gamesToInit,
  //     "Game relays ready:",
  //     gameRelaysReady
  //   );
  //   if (!gameRelaysReady) {
  //     console.log("Game relays not ready. Waiting to initGames...");
  //     return;
  //   }
  //   if (gamesToInit && gamesToInit.length > 0) {
  //     console.log("Game console initing new games:", gamesToInit);
  //     initNewGames(gamesToInit);
  //   }
  // }, [gamesToInit, gameRelaysReady]);

  // const initNewGames = (gamesToInit) => {
  //   console.log("gamesToInit", gamesToInit);

  //   setGameStates((prevGameUpdates) => {
  //     gamesToInit.forEach((gameToInit) => {
  //       console.log("gameToInit:", gameToInit);
  //       if (gameToInit.gameId !== undefined) {
  //         prevGameUpdates.set(gameToInit.gameId, gameToInit);
  //         console.log(`🗺️ Game ${gameToInit.gameId} stored in gameMap.`);
  //       }
  //     });

  //     return new Map(prevGameUpdates); // Return updated map to trigger re-render
  //   });
  // };

  // useEffect(() => {
  //   console.log(
  //     "Games to init:",
  //     gamesToInit,
  //     "Game relays ready:",
  //     gameRelaysReady
  //   );
  //   if (!gameRelaysReady) {
  //     console.log("Game relays not ready. Waiting to initGames...");
  //     return;
  //   }
  //   if (gamesToInit && gamesToInit.length > 0) {
  //     // gamesToInit.forEach((game) => {
  //     //   console.log(`🚀 Initializing game for relay ${game.gameId}`);
  //     //   initNewGame(game);  // Call a function to initialize the game
  //     // });
  //     console.log("Game console initing new games:", gamesToInit);
  //     initNewGames(gamesToInit);
  //   }
  // }, [gamesToInit, gameRelaysReady]);

  useEffect(() => {
    const activeGames = Array.from(connections.entries())
      .filter(([, conn]) => conn.type === "game" && conn.readyState === 1)
      .map(([id, conn]) => ({ gameId: id, ...conn }));

    if (activeGames.length > 0) {
      console.log("🔗 Active game connections:", activeGames);
      initNewGames(activeGames);
    }
  }, [connections]);

  const initNewGames = (gamesToInit) => {
    console.log("gamesToInit", gamesToInit);

    setGameStates((prevGameUpdates) => {
      gamesToInit.forEach((gameToInit) => {
        console.log("gameToInit:", gameToInit);
        if (gameToInit.gameId !== undefined) {
          prevGameUpdates.set(gameToInit.gameId, gameToInit);
          console.log(`🗺️ Game ${gameToInit.gameId} stored in gameMap.`);
        }
      });

      return new Map(prevGameUpdates); // Return updated map to trigger re-render
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
    if (gameState.lobbyStatus !== "started") {
      console.log("Game not started:", gameId);
      return null; // Do not render anything if the game has not started
    }
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
