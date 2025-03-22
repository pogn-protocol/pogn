import React, { useState, useEffect } from "react";
import { Button, Form, Row, Col, Badge } from "react-bootstrap";

const ConnectionInterface = ({
  lobbyUrl,
  gameUrl,
  onConnect,
  onDisconnect,
  onUrlChange,
  lobbyStatus,
  gameStatus,
}) => {
  const [customLobbyUrl, setCustomLobbyUrl] = useState(lobbyUrl);
  const [customGameUrl, setCustomGameUrl] = useState(gameUrl);

  useEffect(() => {
    setCustomLobbyUrl(lobbyUrl);
    setCustomGameUrl(gameUrl);
  }, [lobbyUrl, gameUrl]);

  const handleConnect = () => {
    onConnect(customLobbyUrl, customGameUrl);
  };

  const handleDisconnect = () => {
    onDisconnect();
  };

  return (
    <div className="connection-interface p-3 mb-4 bg-light rounded border">
      <h3>WebSocket Connection</h3>
      <Row>
        <Col>
          <Form.Label>Lobby URL:</Form.Label>
          <Form.Control
            type="text"
            value={customLobbyUrl}
            onChange={(e) => setCustomLobbyUrl(e.target.value)}
            onBlur={() => onUrlChange("lobby", customLobbyUrl)}
          />
          <Badge
            bg={lobbyStatus === "connected" ? "success" : "danger"}
            className="mt-2"
          >
            {lobbyStatus === "connected" ? "Connected" : "Disconnected"}
          </Badge>
        </Col>
        <Col>
          <Form.Label>Game URL:</Form.Label>
          <Form.Control
            type="text"
            value={customGameUrl}
            onChange={(e) => setCustomGameUrl(e.target.value)}
            onBlur={() => onUrlChange("game", customGameUrl)}
          />
          <Badge
            bg={gameStatus === "connected" ? "success" : "danger"}
            className="mt-2"
          >
            {gameStatus === "connected" ? "Connected" : "Disconnected"}
          </Badge>
        </Col>
      </Row>
      <Button className="mt-3" variant="primary" onClick={handleConnect}>
        Connect
      </Button>
      <Button className="mt-3 ms-2" variant="danger" onClick={handleDisconnect}>
        Disconnect
      </Button>
    </div>
  );
};

export default ConnectionInterface;
