import React, { useState, useEffect } from "react";
import { Button, Form, Row, Col, Badge } from "react-bootstrap";
import useWebSocketManager from "./hooks/webSocketManager";

const ConnectionInterface = () => {
  const {
    addConnection,
    removeConnection,
    sendMessage,
    connectionList,
    messages,
  } = useWebSocketManager();

  const [connections, setConnections] = useState([]);
  const [url, setUrl] = useState("");
  const [type, setType] = useState("lobby");
  const [message, setMessage] = useState("");

  const handleAddConnection = () => {
    const id = addConnection(url, type, handleMessage, handleOpen, handleClose);
    updateConnectionList();
  };

  const handleRemoveConnection = (id) => {
    removeConnection(id);
    updateConnectionList();
  };

  const handleMessage = (id, data) => {
    console.log(`Received message from ${id}:`, data);
  };

  const handleOpen = (id) => {
    console.log(`Connection ${id} opened.`);
    updateConnectionList();
  };

  const handleClose = (id) => {
    console.log(`Connection ${id} closed.`);
    updateConnectionList();
  };

  const updateConnectionList = () => {
    setConnections(listConnections());
  };

  const handleSendMessage = (id) => {
    sendMessage(id, { type, message });
  };

  return (
    <div className="connection-interface">
      <h3>Connection Interface</h3>
      <Row>
        <Col>
          <Form.Label>URL:</Form.Label>
          <Form.Control
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Form.Label>Type:</Form.Label>
          <Form.Control
            as="select"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="lobby">Lobby</option>
            <option value="game">Game</option>
          </Form.Control>
          <Button onClick={handleAddConnection}>Add Connection</Button>
        </Col>
        <Col>
          <h4>Active Connections</h4>
          {connections.map((conn) => (
            <div key={conn.id}>
              <Badge>{conn.type}</Badge> {conn.url} [{conn.status}]
              <Button onClick={() => handleRemoveConnection(conn.id)}>
                Remove
              </Button>
              <Form.Control
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message to send"
              />
              <Button onClick={() => handleSendMessage(conn.id)}>Send</Button>
            </div>
          ))}
        </Col>
      </Row>
    </div>
  );
};

export default ConnectionInterface;
