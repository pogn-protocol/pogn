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
import { verifyGameMessage } from "../utils/verifications";

const GameConsole = ({
  sendMessage,
  message = {},
  playerId = "",
  gamesToInit,
  lobbyUrl,
  gameConnections,
  setAddRelayConnections,
  setGamesToInit,
  gameMessages,
  setRemoveRelayConnections,
}) => {
  const [gameStates, setGameStates] = useState(new Map());
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [gameMessagesSent, setGameMessagesSent] = useState({});

  const sendGameMessage = (gameId, message) => {
    setGameMessagesSent((prev) => {
      const updated = { ...prev };
      updated[gameId] = [...(updated[gameId] || []), message];
      return updated;
    });
    // existing logic
    sendMessage(gameId, message); // or however you're sending
  };

  useEffect(() => {
    // if (!message || Object.keys(message).length === 0) {
    //   console.log("No message received.");
    //   return;
    // }
    // console.log("Processing Game message:", message);
    // const { payload } = message;
    // if (!payload) {
    //   console.warn("No payload in message:", message);
    //   return;
    // }
    // const { type, action } = payload;
    // if (type !== "game") {
    //   console.warn("Message sent to game not of type game:", type);
    //   return;
    // }
    // if (!action) {
    //   console.warn("No action in payload:", payload);
    //   return;
    // }
    // const gameId = payload?.gameId;

    // if (!gameId) {
    //   console.warn("No gameId in payload:", payload);
    //   return;
    // }

    if (!verifyGameMessage(message)) return;

    const { payload } = message;
    const { action, gameId } = payload;
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
    if (gamesToInit.size > 0) {
      console.log("🚀 Initializing new games:", gamesToInit);

      const gamesArray = Array.from(gamesToInit.values()).flat();
      console.log("🚀 Initializing new games:", gamesArray);

      setAddRelayConnections(
        gamesArray.map((game) => ({
          id: game.gameId,
          url: game.wsAddress,
          type: "game",
        }))
      );
    }
  }, [gamesToInit, setAddRelayConnections]);

  useEffect(() => {
    if (gamesToInit.size === 0) {
      console.log("No games to initialize.");
      return;
    }
    if (gameConnections.size > 0) {
      // Flatten the gamesToInit map into an array of games
      const allGames = Array.from(gamesToInit.values()).flat();
      console.log("All games to initialize:", allGames);

      const allReady = allGames.every((game) => {
        const connection = gameConnections.get(game.gameId);
        return connection && connection.readyState === 1;
      });

      if (allReady) {
        console.log("✅ All game connections are ready, initializing games.");
        const lobbyIdsToInit = Array.from(gamesToInit.keys());
        console.log("Lobby IDs to initialize:", lobbyIdsToInit);

        // Track which game connections were refreshed
        const gamesRefreshed = [];

        // Remove all games from gameStates where game.lobbyId matches one of those
        setGameStates((prevGameStates) => {
          const updated = new Map();
          for (const [gameId, gameState] of prevGameStates.entries()) {
            if (!lobbyIdsToInit.includes(gameState.lobbyId)) {
              console.log("Not refreshing gameState", gameId, gameState);
              updated.set(gameId, gameState);
            } else {
              console.log(
                `🧹 Refreshing gameState and connections for game ${gameId} from gameState ${gameState}`
              );
              gamesRefreshed.push(gameId); // Track this game as refreshed
            }
          }
          return updated;
        });

        // Remove processed games from gamesToInit
        setGamesToInit((prev) => {
          const updated = new Map(prev);
          for (const lobbyId of lobbyIdsToInit) {
            updated.delete(lobbyId);
          }
          return updated;
        });

        console.log("gamesRefreshed:", gamesRefreshed);
        initNewGames(allGames);

        // Get the set of current game IDs to keep
        const allGameIds = new Set(allGames.map((game) => game.gameId));

        // Find connections to remove (ones not in allGameIds)
        const connectionsToRemove = gamesRefreshed.filter(
          (id) => !allGameIds.has(id)
        );

        if (connectionsToRemove.length > 0) {
          console.log(
            "🗑️ Removing stale relay connections:",
            connectionsToRemove
          );
          setRemoveRelayConnections((prev) => [
            ...prev,
            ...connectionsToRemove,
          ]);
        }

        console.log("🚀 Game initialization complete.");
      } else {
        console.log("⏳ Waiting for all game connections to be ready.");
      }
    }
  }, [gameConnections, gamesToInit]);

  // useEffect(() => {
  //   if (gamesToInit.size === 0) {
  //     console.log("No games to initialize.");
  //     return;
  //   }
  //   if (gameConnections.size > 0) {
  //     // Flatten the gamesToInit map into an array of games
  //     const allGames = Array.from(gamesToInit.values()).flat();
  //     console.log("All games to initialize:", allGames);

  //     const allReady = allGames.every((game) => {
  //       const connection = gameConnections.get(game.gameId);
  //       return connection && connection.readyState === 1;
  //     });

  //     if (allReady) {
  //       console.log("✅ All game connections are ready, initializing games.");
  //       const lobbyIdsToInit = Array.from(gamesToInit.keys());
  //       console.log("Lobby IDs to initialize:", lobbyIdsToInit);

  //       // Track which game connections to remove
  //       const gamesRefreshed = [];

  //       // Remove all games from gameStates where game.lobbyId matches one of those
  //       setGameStates((prevGameStates) => {
  //         const updated = new Map();
  //         for (const [gameId, gameState] of prevGameStates.entries()) {
  //           if (!lobbyIdsToInit.includes(gameState.lobbyId)) {
  //             console.log("Not refreshing gameState", gameId, gameState);
  //             updated.set(gameId, gameState);
  //           } else {
  //             console.log(
  //               `🧹 Refreshing gameState and connections for game ${gameId} from gameState ${gameState}`
  //             );
  //             gamesRefreshed.push(gameId); // Track this game for removal
  //           }
  //         }
  //         return updated;
  //       });

  //       // Remove processed games from gamesToInit
  //       setGamesToInit((prev) => {
  //         const updated = new Map(prev);
  //         for (const lobbyId of lobbyIdsToInit) {
  //           updated.delete(lobbyId);
  //         }
  //         return updated;
  //       });

  //       console.log("gamesRefreshed:", gamesRefreshed);
  //       initNewGames(allGames);

  //       // Get the set of current game IDs to keep
  //       const allGameIds = new Set(allGames.map((game) => game.gameId));

  //       // Find connections to remove (ones not in allGameIds)
  //       const connectionsToRemove = Array.from(gamesRefreshed.keys()).filter(
  //         (id) => !allGameIds.has(id)
  //       );

  //       if (connectionsToRemove.length > 0) {
  //         console.log(
  //           "🗑️ Removing stale relay connections:",
  //           connectionsToRemove
  //         );
  //         setRemoveRelayConnections((prev) => [
  //           ...prev,
  //           ...connectionsToRemove,
  //         ]);
  //       }

  //       console.log("🚀 Game initialization complete.");
  //     } else {
  //       console.log("⏳ Waiting for all game connections to be ready.");
  //     }
  //   }
  // }, [gameConnections, gamesToInit]);

  // useEffect(() => {
  //   if (gamesToInit.size === 0) {
  //     // ✅ Use size instead of length
  //     console.log("No games to initialize.");
  //     return;
  //   }
  //   if (gameConnections.size > 0) {
  //     // Flatten the gamesToInit map into an array of games
  //     const allGames = Array.from(gamesToInit.values()).flat();
  //     console.log("All games to initialize:", allGames);
  //     const allReady = allGames.every((game) => {
  //       const connection = gameConnections.get(game.gameId);
  //       return connection && connection.readyState === 1;
  //     });

  //     if (allReady) {
  //       console.log("✅ All game connections are ready, initializing games.");
  //       const lobbyIdsToInit = Array.from(gamesToInit.keys());
  //       console.log("Lobby IDs to initialize:", lobbyIdsToInit);
  //       const gameConnections = [];

  //       // Remove all games from gameStates where game.lobbyId matches one of those
  //       setGameStates((prevGameStates) => {
  //         const updated = new Map();
  //         for (const [gameId, gameState] of prevGameStates.entries()) {
  //           if (!lobbyIdsToInit.includes(gameState.lobbyId)) {
  //             console.log("Not refreshing gameState", gameId, gameState);
  //             updated.set(gameId, gameState);
  //           } else {
  //             console.log(
  //               `🧹 Removing gameState and connections for game ${gameId} from gameState ${gameState}`
  //             );
  //             gameConnections.push(gameId);
  //           }
  //         }
  //         return updated;
  //       });

  //       // Remove processed games from gamesToInit
  //       setGamesToInit((prev) => {
  //         const updated = new Map(prev);
  //         for (const lobbyId of lobbyIdsToInit) {
  //           updated.delete(lobbyId);
  //         }
  //         return updated;
  //       });
  //       console.log("gameConnections", gameConnections);
  //       initNewGames(allGames);
  //       //Remove connections for any not in allGames gameId

  //       // Get the set of current game IDs to keep
  //       const allGameIds = new Set(allGames.map((game) => game.gameId));

  //       // Find connections to remove (ones not in allGameIds)
  //       const connectionsToRemove = Array.from(gameConnections.keys()).filter(
  //         (id) => !allGameIds.has(id)
  //       );

  //       if (connectionsToRemove.length > 0) {
  //         console.log(
  //           "🗑️ Removing stale relay connections:",
  //           connectionsToRemove
  //         );
  //         setRemoveRelayConnections((prev) => [
  //           ...prev,
  //           ...connectionsToRemove,
  //         ]);
  //       }

  //       console.log("🚀 Game initialization complete.");
  //     } else {
  //       console.log("⏳ Waiting for all game connections to be ready.");
  //     }
  //   }
  // }, [gameConnections, gamesToInit]);

  // useEffect(() => {
  //   if (gamesToInit.length === 0) {
  //     console.log("No games to initialize.");
  //     return;
  //   }
  //   if (gameConnections.size > 0) {
  //     const allReady = gamesToInit.every((game) => {
  //       const connection = gameConnections.get(game.gameId);
  //       return connection && connection.readyState === 1;
  //     });

  //     if (allReady) {
  //       console.log("✅ All game connections are ready, initializing games.");
  //       //remove all games from gameStates that have .lobbyId the same as the initNewGames
  //       //id key
  //       const lobbyIdsToInit = Array.from(gamesToInit.keys());

  //       // Remove all games from gameStates where game.lobbyId matches one of those
  //       setGameStates((prevGameStates) => {
  //         const updated = new Map();
  //         for (const [gameId, gameState] of prevGameStates.entries()) {
  //           if (!lobbyIdsToInit.includes(gameState.lobbyId)) {
  //             updated.set(gameId, gameState);
  //           } else {
  //             console.log(
  //               `🧹 Removing game ${gameId} from lobby ${gameState.lobbyId}`
  //             );
  //           }
  //         }
  //         return updated;
  //       });

  //       setGamesToInit((prev) => {
  //         const updated = new Map(prev);
  //         for (const lobbyId of lobbyIdsToInit) {
  //           updated.delete(lobbyId);
  //         }
  //         return updated;
  //       });

  //       initNewGames(gamesToInit);

  //       for (const lobbyId of lobbyIdsToInit) {
  //         gamesToInit.delete(lobbyId);
  //       }

  //       // setGamesToInit((prevGames) =>
  //       //   prevGames.filter((game) => !gamesToInit.includes(game))
  //       // );
  //     } else {
  //       console.log("⏳ Waiting for all game connections to be ready.");
  //     }
  //   }
  // }, [gameConnections, gamesToInit]);

  const initNewGames = (games) => {
    console.log("Initializing games", games);
    console.log("gameConnections", gameConnections);
    //delet each game.lobbyId from gameStates.lobbyId

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

  const disconnectGame = (gameId) => {
    if (!gameId || !gameConnections.has(gameId)) {
      console.warn(
        `⚠️ Cannot disconnect: invalid or missing gameId: ${gameId}`
      );
      return;
    }
    console.log(`🧹 Requested disconnect from game ${gameId}`);
    setRemoveRelayConnections((prev) => [...prev, gameId]);
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
    const sharedProps = {
      sendGameMessage: (msg) => sendGameMessage(gameId, { ...msg }),
      playerId,
      gameState,
      gameId,
      disconnectSelf: () => disconnectGame(gameId), // ✅ secure scoped disconnect
    };
    switch (gameState.gameType) {
      case "rock-paper-scissors":
        return <RockPaperScissors {...sharedProps} />;
      case "odds-and-evens":
        return <OddsAndEvens {...sharedProps} />;
      default:
        return <p>Game type not supported.</p>;
    }
    // switch (gameState.gameType) {
    //   case "rock-paper-scissors":
    //     return (
    //       <RockPaperScissors
    //         sendGameMessage={(msg) => sendGameMessage(gameId, { ...msg })}
    //         playerId={playerId}
    //         gameState={gameState}
    //         gameId={gameId}
    //       />
    //     );
    //   case "odds-and-evens":
    //     console.log("Rendering Odds and Evens component...", gameState);
    //     return (
    //       <OddsAndEvens
    //         sendGameMessage={(msg) => sendGameMessage(gameId, { ...msg })}
    //         playerId={playerId}
    //         gameState={gameState}
    //         gameId={gameId}
    //       />
    //     );
    //   default:
    //     return <p>Game type not supported.</p>;
    // }
  };

  const connectedGames = Array.from(gameConnections.entries()).filter(
    ([id, conn]) =>
      conn.readyState === 1 && gameStates.get(id)?.lobbyStatus === "started"
  );
  console.log("Connected games:", connectedGames);

  useEffect(() => {
    if (!selectedGameId) {
      const firstGameId = connectedGames[0]?.[0];
      if (firstGameId) {
        setSelectedGameId(firstGameId);
      }
    }
  }, [connectedGames, selectedGameId]);

  return (
    <div>
      <h1 className="mb-4">Game Console</h1>
      <h4>Select a Game:</h4>
      <div
        className="border p-2 rounded mb-3"
        style={{ maxHeight: "200px", overflowY: "auto" }}
      >
        {Array.from(gameConnections.entries())
          .filter(([id]) => gameStates.get(id)?.lobbyStatus === "started")
          .map(([id]) => (
            <button
              key={id}
              onClick={() => setSelectedGameId(id)}
              className={`btn w-100 text-start mb-1 ${
                selectedGameId === id ? "btn-primary" : "btn-outline-secondary"
              }`}
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {id}
            </button>
          ))}
      </div>

      <div
        style={{
          marginBottom: "20px",
          padding: "10px",
          border: "1px solid #ccc",
        }}
      >
        {console.log("Game States:", gameStates)}
        {/* {Array.from(gameStates.entries())
          .filter(([, gameState]) => gameState.lobbyStatus === "started") */}
        {Array.from(gameStates.entries())
          .filter(([id]) => id === selectedGameId)
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
                <h5>Game ID: {gameId}</h5>
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
                <div style={{ display: "flex", gap: "20px" }}>
                  {/* Received Messages */}
                  <div>
                    <h6>Received</h6>
                    {gameMessages[gameId]?.length > 1 && (
                      <details style={{ marginBottom: "8px" }}>
                        <summary>
                          Previous ({gameMessages[gameId].length - 1})
                        </summary>
                        {gameMessages[gameId].slice(0, -1).map((msg, i) => (
                          <JsonView
                            data={msg}
                            key={`recv-${gameId}-${i}`}
                            shouldExpandNode={() => false}
                            style={{ fontSize: "14px", lineHeight: "1.2" }}
                          />
                        ))}
                      </details>
                    )}
                    {gameMessages[gameId]?.slice(-1).map((msg, i) => (
                      <JsonView
                        data={msg}
                        key={`recv-last-${gameId}-${i}`}
                        shouldExpandNode={() => true}
                        style={{ fontSize: "14px", lineHeight: "1.2" }}
                      />
                    ))}
                  </div>

                  {/* Sent Messages */}
                  <div>
                    <h6>Sent</h6>
                    {gameMessagesSent[gameId]?.length > 1 && (
                      <details style={{ marginBottom: "8px" }}>
                        <summary>
                          Previous ({gameMessagesSent[gameId].length - 1})
                        </summary>
                        {gameMessagesSent[gameId].slice(0, -1).map((msg, i) => (
                          <JsonView
                            data={msg}
                            key={`sent-${gameId}-${i}`}
                            shouldExpandNode={() => false}
                            style={{ fontSize: "14px", lineHeight: "1.2" }}
                          />
                        ))}
                      </details>
                    )}
                    {gameMessagesSent[gameId]?.slice(-1).map((msg, i) => (
                      <JsonView
                        data={msg}
                        key={`sent-last-${gameId}-${i}`}
                        shouldExpandNode={() => true}
                        style={{ fontSize: "14px", lineHeight: "1.2" }}
                      />
                    ))}
                  </div>
                </div>

                {/* {gameMessages[gameId]?.length > 1 && (
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
                )} */}

                {/* Render the last message fully expanded */}
                {/* {gameMessages[gameId]?.slice(-1).map((msg, index) => (
                  <JsonView
                    data={msg}
                    key={`last-game-msg-${gameId}-${index}`}
                    shouldExpandNode={() => true} // Always fully expanded for the last message
                    style={{ fontSize: "14px", lineHeight: "1.2" }}
                  />
                ))} */}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default GameConsole;
