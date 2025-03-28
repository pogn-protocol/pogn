import React, { useEffect, useState } from "react";
import { use } from "react";
import {
  JsonView,
  allExpanded,
  darkStyles,
  defaultStyles,
} from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";

const OddsAndEvens = ({ sendGameMessage, playerId, gameState, gameId }) => {
  const [role, setRole] = useState(null); // Player's assigned role
  const [number, setNumber] = useState(""); // Player's chosen number
  const [localGameState, setLocalGameState] = useState({
    gameId: gameId,
    gameStatus: null,
    action: null,
    winner: null,
    sum: null,
    roles: {}, // Store the roles assigned by the server
    numbers: {}, // Track submitted numbers
    initialized: false,
  });

  useEffect(() => {
    console.log("Warning gameId changed", gameId);
  }, [gameId]);

  /**
   * Updates local game state when the game state changes.
   */
  useEffect(() => {
    console.log(`${gameId} gameState changed`, gameState);
    if (!gameState) {
      console.warn("No gameState received.");
      return;
    }
    setLocalGameState((prev) => ({
      ...prev,
      ...gameState,
    }));
  }, [gameState]);

  /**
   * Initializes the game by fetching roles if not already assigned.
   */
  useEffect(() => {
    console.log("gameState.action fired", localGameState);

    // If the game state is not initialized, fetch roles.
    if (!localGameState.initialized) {
      console.log(
        `${gameId} Roles not assigned yet. Fetching from the relay...`
      );
      setLocalGameState((prev) => ({
        ...prev,
        initialized: true, // Mark as initialized to prevent re-triggering
      }));
      sendGameMessage({
        payload: {
          type: "game",
          action: "gameAction",
          gameAction: "getRoles",
          playerId,
          gameId: localGameState.gameId,
        },
      });

      return;
    }
    if (localGameState.action == null) {
      console.log("No action received.");
      return;
    }
    switch (localGameState?.action) {
      case "rolesAssigned":
        console.log(gameId, "Roles assigned:", localGameState.roles);
        setRole(localGameState.roles[playerId]);
        setLocalGameState((prev) => ({
          ...prev,
          gameStatus: localGameState.gameStatus,
          roles: localGameState.roles,
          initialized: true,
          action: null,
        }));
        break;

      case "waitingForOpponent":
        console.log("Waiting for the other player...");
        setLocalGameState((prev) => ({
          ...prev,
          action: null,
        }));
        break;

      case "results":
        setLocalGameState((prev) => ({
          ...prev,
          gameStatus: localGameState.gameStatus,
          winner: localGameState.winner,
          sum: localGameState.sum,
          roles: localGameState.roles,
          numbers: localGameState.numbers,
          action: null,
        }));
        console.log("Game results received.");
        break;

      default:
        console.warn(
          `Unhandled action: ${
            localGameState?.action
          } with message: ${JSON.stringify(localGameState)}`
        );
    }
  }, [
    localGameState.action,
    localGameState.roles,
    gameId,
    playerId,
    sendGameMessage,
  ]);

  /**
   * Handle number submission.
   */
  const handleNumberSubmit = () => {
    if (number.trim() === "" || isNaN(number)) {
      console.warn("Invalid number submission");
      return;
    }

    sendGameMessage({
      payload: {
        type: "game",
        action: "gameAction",
        gameAction: "submitNumber",
        playerId,
        gameId: localGameState.gameId,
        number: parseInt(number, 10), // Ensure it's an integer
      },
    });

    setNumber(""); // Clear the input after submission
  };

  return (
    <div>
      <h2>Odds and Evens Game</h2>
      <p>Game ID: {gameId}</p>
      <p>Role: {role || "Unknown"}</p>
      <p>Number: {number || "None"}</p>
      <input
        type="number"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        placeholder="Enter a number"
      />
      <button onClick={handleNumberSubmit}>Submit Number</button>
      <JsonView
        data={localGameState}
        shouldExpandNode={(level) => level === 0}
        style={{ fontSize: "14px", lineHeight: "1.2" }}
      />
      <button
        onClick={() =>
          sendGameMessage({
            payload: {
              type: "game",
              action: "endGame",
              playerId,
              gameId: localGameState.gameId,
            },
          })
        }
      >
        Kill Game
      </button>
    </div>
  );
};

export default OddsAndEvens;
