import { v4 as uuidv4 } from "uuid";

const connections = {};

const createWebSocket = (id, url, type, onMessage, onOpen, onClose) => {
  const ws = new WebSocket(url);

  ws.onopen = () => {
    console.log(`✅ ${type} WebSocket (${id}) connected at ${url}`);
    if (onOpen) onOpen(id);
  };

  ws.onmessage = (event) => {
    console.log(`📩 Message from ${type} WebSocket (${id}):`, event.data);
    if (onMessage) onMessage(id, event.data);
  };

  ws.onclose = () => {
    console.log(`🔴 ${type} WebSocket (${id}) disconnected`);
    if (onClose) onClose(id);
  };

  return ws;
};

// const addConnection = (url, type, onMessage, onOpen, onClose) => {
//   const id = uuidv4();
//   const ws = createWebSocket(id, url, type, onMessage, onOpen, onClose);
//   connections[id] = { ws, url, type };
//   return id;
// };

const addConnection = (wsUrl, type) => {
  const connectionId = `${type}-${uuidv4()}`; // Generate a unique ID for each connection

  // Check if connection already exists
  if (connections[connectionId]) {
    console.warn(`⚠️ Connection with ID ${connectionId} already exists.`);
    return;
  }

  const ws = new WebSocket(wsUrl);

  connections[connectionId] = {
    id: connectionId,
    url: wsUrl,
    type,
    sendMessage: (msg) => ws.send(JSON.stringify(msg)), // Send method for this connection
  };

  ws.onopen = () => console.log(`🔵 Connected to ${connectionId} at ${wsUrl}`);
  ws.onmessage = (event) =>
    console.log(`📥 Received from ${connectionId}:`, event.data);
  ws.onclose = () => {
    console.log(`🔴 Disconnected from ${connectionId}`);
    delete connections[connectionId]; // Remove from the object on disconnect
  };
  ws.onerror = (error) => console.error(`❗ Error on ${connectionId}:`, error);
};

const removeConnection = (id) => {
  if (connections[id]) {
    connections[id].ws.close();
    delete connections[id];
    console.log(`🗑️ Connection ${id} removed.`);
  }
};

const sendMessage = (id, message) => {
  if (connections[id]) {
    connections[id].ws.send(JSON.stringify(message));
    console.log(`📤 Sent to ${connections[id].type} (${id}):`, message);
  }
};

const getStatus = (id) => {
  return connections[id] ? connections[id].ws.readyState : null;
};

const listConnections = () => {
  return Object.keys(connections).map((id) => ({
    id,
    url: connections[id].url,
    type: connections[id].type,
    status: connections[id].ws.readyState,
  }));
};

export {
  addConnection,
  removeConnection,
  sendMessage,
  getStatus,
  listConnections,
};
