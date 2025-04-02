import React, { useCallback, useEffect, useRef, useState } from "react";
import RelayItem from "./RelayItem";

const RelayManager = ({
  addRelayConnections,
  onMessage,
  setSendMessage,
  connections,
  setConnections,
  removeRelayConnections,
  setRemoveRelayConnections,
}) => {
  const [closingConnections, setClosingConnections] = useState(new Map());
  const manualCloseRefs = useRef({});

  const sendMessageToRelay = useCallback(
    (id, message) => {
      const conn = connections.get(id);
      conn?.sendJsonMessage?.(message);
    },
    [connections]
  );

  useEffect(() => {
    setSendMessage(() => sendMessageToRelay);
  }, [sendMessageToRelay, setSendMessage]);

  useEffect(() => {
    if (addRelayConnections?.length) {
      setConnections((prev) => {
        const newMap = new Map(prev);
        addRelayConnections.forEach((relay) => {
          if (!newMap.has(relay.id)) {
            manualCloseRefs.current[relay.id] = { current: false };
            newMap.set(relay.id, relay);
          }
        });
        return newMap;
      });
    }
  }, [addRelayConnections, setConnections]);

  useEffect(() => {
    if (removeRelayConnections?.length) {
      removeRelayConnections.forEach((id) => {
        manualCloseRefs.current[id] = { current: true };

        setClosingConnections((prev) => {
          const updated = new Map(prev);
          updated.set(id, { countdown: 5 });
          return updated;
        });

        setTimeout(() => {
          setConnections((prev) => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
          });

          setClosingConnections((prev) => {
            const updated = new Map(prev);
            updated.delete(id);
            return updated;
          });
        }, 5000);
      });

      setRemoveRelayConnections([]);
    }
  }, [removeRelayConnections, setConnections, setRemoveRelayConnections]);

  return (
    <div className="relay-container d-flex flex-wrap gap-2">
      {Array.from(connections.values()).map((relay) => (
        <RelayItem
          key={relay.id}
          {...relay}
          onMessage={onMessage}
          setConnections={setConnections}
          sendMessageToRelay={sendMessageToRelay}
          closingConnections={closingConnections}
          manualCloseRef={manualCloseRefs.current[relay.id]}
        />
      ))}
    </div>
  );
};

export default RelayManager;
