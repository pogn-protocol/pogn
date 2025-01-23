import { useState, useEffect } from "react";
import { generatePrivateKey, getPublicKey } from "nostr-tools";
import "./css/Player.css";

const Player = ({ sendPublicKey }) => {
  const [privateKey] = useState(generatePrivateKey()); // Generate private key
  const [publicKey] = useState(getPublicKey(privateKey)); // Derive public key

  // Send the public key to App.jsx when the component mounts
  useEffect(() => {
    if (sendPublicKey && publicKey) {
      sendPublicKey(publicKey); // Pass publicKey up to App.jsx
    }
  }, [sendPublicKey, publicKey]);

  // No UI is needed if Player is just logic.
  return null;
};

export default Player;
