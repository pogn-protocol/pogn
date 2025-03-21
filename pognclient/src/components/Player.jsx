import { useState, useEffect } from "react";
import { generatePrivateKey, getPublicKey } from "nostr-tools";
import "./css/Player.css";

const Player = ({ setPlayerId }) => {
  const [privateKey, setPrivateKey] = useState(() => {
    // Try to load the private key from sessionStorage
    const storedKey = sessionStorage.getItem("nostrPrivateKey");
    if (storedKey) {
      console.log("Loaded private key from sessionStorage.");
      return storedKey;
    }
    // Generate a new private key if none exists
    const newKey = generatePrivateKey();
    sessionStorage.setItem("nostrPrivateKey", newKey);
    console.log("Generated and stored new private key.");
    return newKey;
  });

  const [playerId, setPlayerIdState] = useState(() => {
    // Derive the public key from the private key
    const newPlayerId = getPublicKey(privateKey);
    sessionStorage.setItem("nostrPublicKey", newPlayerId);
    console.log("Generated and stored new public key.");
    return newPlayerId;
  });

  // Send the public key to App.jsx when the component mounts
  useEffect(() => {
    if (setPlayerId && playerId) {
      setPlayerId(playerId); // Pass playerId up to App.jsx
    }
  }, [setPlayerId, playerId]);

  // No UI is needed if Player is just logic.
  return null;
};

export default Player;
