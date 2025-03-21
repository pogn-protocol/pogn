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
  message = {},
  sendGameMessage,
  playerId = "",
  initialGameState = {},
  setStartGameConsole,
  sendLobbyMessage,
  setStartGameWebSocket,
  playerGames,
}) => {
  // const [gameState, setGameState] = useState({
  //   ...initialGameState,
  // });
  const [gameStates, setGameStates] = useState(new Map());
  const [lobbyMessage, setLobbyMessage] = useState({});
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    console.log("Lobby message:", lobbyMessage);
    if (lobbyMessage && Object.keys(lobbyMessage).length > 0) {
      console.log("Sending lobby message:", lobbyMessage);
      sendLobbyMessage(lobbyMessage);

      setTimeout(() => {
        console.log("Clearing lobby message...");
        setLobbyMessage(null); // Use `null` instead of `{}`
      }, 100);
    }
  }, [lobbyMessage, sendLobbyMessage]);

  // useEffect(() => {
  //   console.log("Checking game state for start condition...");
  //   console.log("gamestate", gameStates);
  //   // setGameStarted(gameStates.status === "started");
  // }, [gameStates]);

  // useEffect(() => {
  //   if (!message || Object.keys(message).length === 0) {
  //     console.log("No message received.");
  //     return;
  //   }

  //   console.log("Processing Game message:", message);
  //   const { action, payload } = message;
  //   console.log("action", action);
  //   console.log("payload", payload);
  //   //check if the action is not in switch statement
  //   console.log("Switching on action:", action);
  //   switch (action) {
  //     case "gameAction":
  //       console.log("Game action received:", payload);
  //       setGameState((prevState) => {
  //         const newState = { ...prevState, ...payload };
  //         console.log("🛠️ Updated GameState:", newState);
  //         setGameStarted(newState.status === "started"); // ✅ Set it inside
  //         return newState;
  //       });

  //       break;
  //     case "results":
  //       console.log("Game finished. Winner determined.");
  //       setGameState((prevState) => ({
  //         ...prevState,
  //         status: "complete",
  //         winner: payload.winner,
  //         loser: payload.loser,
  //         choices: payload.choices,
  //       }));
  //       break;
  //     case "gameEnded":
  //       console.log("Game ended.");
  //       setGameState({});
  //       setGameStarted(false);
  //       setStartWebSocket(false);
  //       setStartGameConsole(false);
  //       break;

  //     default:
  //       console.warn(`Unhandled action: ${action}`);
  //   }
  // }, [message]);
  useEffect(() => {
    if (!message || Object.keys(message).length === 0) {
      console.log("No message received.");
      return;
    }

    console.log("Processing Game message:", message);
    const { action, payload } = message;
    const gameId = payload.gameId || payload.game?.gameId;

    setGameStates((prevStates) => {
      const newStates = new Map(prevStates);
      const currentGameState = newStates.get(gameId) || {};

      console.log(
        `Updating game state for game ID: ${gameId}`,
        currentGameState
      );

      switch (action) {
        case "gameAction":
          newStates.set(gameId, {
            ...currentGameState,
            ...payload,
          });
          console.log("🛠️ Updated GameState:", newStates);
          break;

        case "results":
          newStates.set(gameId, {
            ...currentGameState,
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

  useEffect(() => {
    if (playerGames && playerGames.length > 0) {
      console.log("Player games received:", playerGames);
      handlePlayerGames(playerGames);
    }
  }, [playerGames]);

  const handlePlayerGames = (playerGames) => {
    console.log("handlePlayergames", playerGames);
    const gameMap = new Map();
    playerGames.forEach((playerGame) => {
      console.log("Handling player game:", playerGame);
      if (playerGame.gameId !== undefined) {
        gameMap.set(playerGame.gameId, playerGame);
        console.log(`🗺️ Game ${playerGame.gameId} stored in gameMap.`);
      }
    });
    setGameStates(gameMap);
  };

  //   // Preselect the game
  //   setSelectedGameId(playerGame.gameId);
  //   setSelectedGamestate((prevState) => ({
  //     ...prevState,
  //     ...playerGame,
  //   }));

  //   const isPlayerInGame = playerGame.players?.some(
  //     (player) => player === String(playerId)
  //   );

  //   setHasJoined(isPlayerInGame);

  //   if (playerGame.status === "started") {
  //     console.log(
  //       "Game has started. Transitioning to GameConsole.",
  //       playerGame
  //     );
  //     // setStartWebSocket(true);
  //     // setStartGame(true);
  //     setStartWebSocket((prev) => {
  //       if (prev) {
  //         console.log("🚨 WebSocket already started. Skipping...");
  //         return true; // Don't change state
  //       }
  //       console.log(
  //         `✅ Player ${playerId} is in the game. Attaching to relay.`
  //       );
  //       setInitialGameState({ ...playerGame });
  //       return true; // Change state to start WebSocket
  //     });

  //     // setInitialGameState({
  //     //   ...playerGame,
  //     // });
  //   } else {
  //     console.log("Game is not started yet. Staying in the lobby.");
  //     setStartGameConsole(false);
  //     setInitialGameState({});
  //   }
  // } else {
  //   console.log("Player is not in any valid game. Staying in the lobby.");
  //   setSelectedGameId(null);
  //   setHasJoined(false);
  //   setInitialGameState({});
  //   setStartGameConsole(false);
  //   setStartWebSocket(false);
  // }
  // break;

  const renderGameComponent = (gameId, gameState) => {
    console.log("Rendering game component:", gameState, "for game ID:", gameId);
    if (gameState.status !== "started") {
      console.log("Game not started:", gameId);
      return null; // Do not render anything if the game has not started
    }
    switch (gameState.gameType) {
      case "rock-paper-scissors":
        return (
          <RockPaperScissors
            sendGameMessage={
              (msg) => sendGameMessage({ ...msg, gameId }) // Include gameId in every message
            }
            playerId={playerId}
            gameState={gameState}
            gameId={gameId}
          />
        );
      case "odds-and-evens":
        console.log("Rendering Odds and Evens component...", gameState);
        return (
          <OddsAndEvens
            sendGameMessage={
              (msg) => sendGameMessage({ ...msg, gameId }) // Include gameId in every message
            }
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

        {Array.from(gameStates.entries())
          .filter(([, gameState]) => gameState.status === "started")
          .map(([gameId, gameState]) => {
            return (
              <div
                key={gameId}
                style={{
                  marginBottom: "20px",
                  padding: "10px",
                  border: "1px solid #ccc",
                }}
              >
                <h3>Game ID: {gameId}</h3>
                <h4>Game Type: {gameState.gameType}</h4>

                {/* Collapsible and interactive JSON view */}
                <JsonView
                  data={gameState}
                  shouldExpandNode={(level) => level === 0} // Expand only the first level
                  s
                  style={{ fontSize: "14px", lineHeight: "1.2" }}
                />

                {renderGameComponent(gameId, gameState)}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default GameConsole;
