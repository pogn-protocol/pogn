import React from 'react';
import { createAvatar } from '@dicebear/avatars';
import * as identiconSprites from '@dicebear/avatars-identicon-sprites';
import './css/dashboard.css';

const Dashboard = ({ playerName, playerId }) => {
  // Generate a unique avatar using player ID
  const avatarSvg = createAvatar(identiconSprites, {
    seed: playerId, // Use playerId to generate unique avatar
    dataUri: true,  // Return as a data URI for easy use in <img>
  });

  return (
    <div className="player-dashboard mt-2">
      <h2>Player Dashboard</h2>
      <div className="player-info">
        <div className="avatar">
          <img src={avatarSvg} alt="Player Avatar" />
        </div>
        <div className="details">
          <h3>{playerName}</h3>
          <p>ID: {playerId}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
