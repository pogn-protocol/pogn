import { useState, useEffect } from "react";
import { generatePrivateKey, getPublicKey } from "nostr-tools";
import "./css/Player.css";

const Player = ({ sendplayerId }) => {
  const [privateKey] = useState(generatePrivateKey()); // Generate private key
  const [playerId] = useState(getPublicKey(privateKey)); // Derive public key

  // Send the public key to App.jsx when the component mounts
  useEffect(() => {
    if (sendplayerId && playerId) {
      sendplayerId(playerId); // Pass playerId up to App.jsx
    }
  }, [sendplayerId, playerId]);

  // No UI is needed if Player is just logic.
  return null;
};

export default Player;
