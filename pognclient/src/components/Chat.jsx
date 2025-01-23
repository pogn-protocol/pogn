import React, { useState } from "react";
import "./css/chat.css";

const Chat = ({ messages = [], sendMessage, publicKey }) => {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) return;

    const event = {
      type: "chat",
      payload: { message, publicKey },
    };

    sendMessage(event); // Send the message via WebSocket
    setMessage(""); // Clear the input field
  };

  return (
    <div className="chatMain">
      <h2>Chat</h2>
      <div className="messagesWindow">
        {messages.length > 0 ? (
          messages.map((msg, index) => (
            <p key={index}>
              <strong>{msg.publicKey.slice(0, 8)}:</strong> {msg.message}
            </p>
          ))
        ) : (
          <p>No messages yet.</p>
        )}
      </div>
      <div className="chatForm">
        <textarea
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        ></textarea>
        <div className="d-grid">
        <button className="btn btn-primary" onClick={handleSend}>
          Send
        </button>
        </div>
       
      </div>
    </div>
  );
};

export default Chat;
