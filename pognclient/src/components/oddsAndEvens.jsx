import React, { useEffect, useState, useRef } from "react";
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
    //lobbyStatus: "started",
    winner: null,
    sum: null,
    roles: {}, // Store the roles assigned by the server
    numbers: {}, // Track submitted numbers
  });

  // Update the localGameState when the gameState changes

  useEffect(() => {
    console.log(`${gameId} gameState changed`, gameState);
    setLocalGameState((prev) => ({
      ...prev,
      ...gameState,
    }));
  }, [gameState]);

  useEffect(() => {
    console.log("gameState.action fired", localGameState);
    if (!localGameState.initialized) {
      console.log(
        gameState.gameId,
        "Roles not assigned yet. Fetching from the relay..."
      );
      setLocalGameState((prev) => ({
        gameStatus: gameState.gameStatus,
      }));
      sendGameMessage({
        type: "game",
        action: "gameAction",
        payload: {
          gameAction: "getRoles",
          playerId,
          gameId: gameState.gameId,
        },
      });
      return;
    }

    switch (localGameState?.action) {
      case "rolesAssigned":
        console.log(gameId, "Roles assigned:", localGameState.roles);
        setRole(localGameState.roles[playerId]);
        setLocalGameState((prev) => ({
          ...prev,
          gameStatus: gameState.gameStatus,
          roles: localGameState.roles,
          initialized: true,
        }));
        break;
      case "waitingForOpponent":
        console.log("Waiting for the other player...");
        setLocalGameState((prev) => ({
          ...prev,
          gameStatus: gameState.gameStatus,
        }));
        break;
      case "results":
        setLocalGameState((prev) => ({
          ...prev,
          gameStatus: gameState.gameStatus,
          winner: localGameState.winner,
          sum: localGameState.sum,
          roles: localGameState.roles,
          numbers: localGameState.numbers,
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
  }, [localGameState.action]);

  const handleSubmitNumber = () => {
    console.log("Submitting number:", number);
    sendGameMessage({
      type: "game",
      action: "gameAction",
      payload: {
        game: "odds-and-evens",
        gameAction: "submitNumber",
        playerId,
        number: parseInt(number, 10),
        gameStatus: localGameState.gameStatus,
        gameId: localGameState.gameId,
      },
    });
    setNumber(""); // Clear input after submission
  };

  return (
    <div className="mb-5">
      <h2>Odds and Evens</h2>

      {/* Display current local gameStatus for debugging */}
      <div>
        <h3>Local Game State</h3>
        {/* <pre>{JSON.stringify(localGameState, null, 2)}</pre> */}

        <JsonView
          data={localGameState}
          shouldExpandNode={(level) => level === 0} // Expand only the first level
          style={{ fontSize: "14px", lineHeight: "1.2" }}
        />
      </div>

      {/* Game Waiting State */}
      {localGameState.gameStatus === "waiting" && (
        <p>Odds and Evens Waiting to start...</p>
      )}

      {/* Game In Progress */}
      {localGameState.gameStatus === "in-progress" && role && (
        <div>
          <p>
            Your Role: <strong>{role.toUpperCase()}</strong>
          </p>
          <p>Enter a number:</p>
          <input
            type="number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            min="1"
            required
          />
          <button onClick={handleSubmitNumber} disabled={!number}>
            Submit Number
          </button>
        </div>
      )}

      {/* Game Complete */}
      {localGameState.gameStatus === "complete" && (
        <div>
          <p>
            <strong>Winner:</strong> {localGameState.winner}
          </p>
          <p>
            <strong>Sum of Numbers:</strong> {localGameState.sum}
          </p>
          <h4>Roles:</h4>
          <ul>
            {Object.entries(localGameState.roles).map(
              ([player, assignedRole]) => (
                <li key={player}>
                  Player {player}: <strong>{assignedRole.toUpperCase()}</strong>
                </li>
              )
            )}
          </ul>
          <h4>Numbers:</h4>
          <ul>
            {Object.entries(localGameState.numbers).map(
              ([player, submittedNumber]) => (
                <li key={player}>
                  Player {player}: <strong>{submittedNumber}</strong>
                </li>
              )
            )}
          </ul>
        </div>
      )}
      {/* Kill Game */}
      <button
        onClick={() => {
          sendGameMessage({
            type: "game",
            action: "endGame",
            payload: {
              playerId,
              gameId: localGameState.gameId,
            },
          });
        }}
      >
        Kill Game
      </button>
    </div>
  );
};

export default OddsAndEvens;
