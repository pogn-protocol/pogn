import React, { useEffect, useState } from "react";
import useRelayConnection from "./hooks/useRelayConnection";

const RelayItem = ({
  id,
  url,
  type,
  onMessage,
  sendMessageToRelay,
  setConnections,
  closingConnections,
  manualCloseRef,
}) => {
  const { readyState } = useRelayConnection({
    id,
    url,
    type,
    onMessage,
    setConnections,
    closingConnections,
    manualCloseRef,
  });

  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (!closingConnections.has(id)) return;

    setCountdown(closingConnections.get(id)?.countdown || 5);
    const interval = setInterval(() => {
      setCountdown((prev) => (prev === 1 ? clearInterval(interval) : prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [closingConnections, id]);

  return (
    <div className="relay-item">
      <button
        onClick={() => sendMessageToRelay(id, { payload: { type: "ping" } })}
      >
        <div>{id}</div>
        <div>
          {closingConnections.has(id)
            ? `🛑 ${countdown}s`
            : readyState === 1
            ? "✅"
            : readyState === 0
            ? "🟡"
            : readyState === 3
            ? "🔴"
            : readyState === 4
            ? "🟠"
            : "⚪️"}
        </div>
        <div>Ping 🛎️</div>
      </button>
    </div>
  );
};

export default RelayItem;
