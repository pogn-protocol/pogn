import React, { useEffect, useState, useRef } from "react";

const OddsAndEvens = ({
  sendMessage,
  playerId,

  gameState,
}) => {
  const [role, setRole] = useState(null); // Player's assigned role
  const [number, setNumber] = useState(""); // Player's chosen number
  const [localGameState, setLocalGameState] = useState({
    status: "started",
    winner: null,
    sum: null,
    roles: {}, // Store the roles assigned by the server
    numbers: {}, // Track submitted numbers
  });

  const rolesFetched = useRef(false); // Ref to track whether roles have been fetched

  //set localGameState to gameState
  useEffect(() => {
    console.log("gameState", gameState);
    setLocalGameState((prev) => ({
      ...prev,
      ...gameState,
    }));
    //if this.roles isn't populated get them from the relay
    if (Object.keys(localGameState.roles).length === 0) {
      console.log("Roles not assigned yet. Fetching from the relay...");
      sendMessage({
        type: "game",
        action: "gameAction",
        payload: {
          gameAction: "getRoles",
          playerId,
          gameId: gameState.gameId,
        },
      });
    }
  }, [gameState]);

  useEffect(() => {
    console.log("gameState", localGameState);
    switch (localGameState?.action) {
      case "rolesAssigned":
        rolesFetched.current = true;
        console.log(`Role assigned`);
        setLocalGameState((prev) => ({
          ...prev,
          action: "",
          state: "in-progress",
        }));
        setRole(localGameState.roles[playerId]);

        break;

      case "waitingForOpponent":
        console.log("Waiting for the other player...");
        setLocalGameState((prev) => ({
          ...prev,
          waitingForOpponent: true,
        }));
        break;

      case "results":
        console.log("Game results received.");

        break;

      default:
        console.warn(`Unhandled action: ${localGameState?.action}`);
    }
  }, [localGameState.action]);

  const handleSubmitNumber = () => {
    console.log("Submitting number:", number);
    sendMessage({
      type: "game",
      action: "gameAction",
      payload: {
        game: "odds-and-evens",
        gameAction: "submitNumber",
        playerId,
        number: parseInt(number, 10),
        state: localGameState.state,
        gameId: localGameState.gameId,
      },
    });
    setNumber(""); // Clear input after submission
  };

  //send a msg to game to get a role "getRole"
  // Send a message to the game to get roles
  // useEffect(() => {
  //   console.log("gameState", localGameState);
  //   if (localGameState?.action === "getRoles") {
  //     console.log("Getting roles...");
  //     // rolesFetched.current = true;
  //     sendMessage({
  //       type: "game",
  //       action: "gameAction",
  //       payload: {
  //         game: "odds-and-evens",
  //         gameAction: "getRoles",
  //         playerId,
  //         gameId: localGameState.gameId, // Use gameState directly
  //         state: localGameState.status, // Use gameState directly
  //       },
  //     });
  //   } else {
  //     console.warn("Game ID or state is not available yet.");
  //   }
  // }, [localGameState.action]);

  return (
    <div className="mb-5">
      <h2>Odds and Evens</h2>

      {/* Display current local state for debugging */}
      <div className="localState">
        <h3>Local Game State</h3>
        <pre>{JSON.stringify(localGameState, null, 2)}</pre>
      </div>

      {/* Game Waiting State */}
      {localGameState.state === "waiting" && (
        <p>Waiting for the game to start...</p>
      )}

      {/* Game In Progress */}
      {localGameState.state === "in-progress" && role && (
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
      {localGameState.state === "complete" && (
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
    </div>
  );
};

export default OddsAndEvens;
