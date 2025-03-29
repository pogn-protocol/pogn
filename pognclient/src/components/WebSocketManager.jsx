import React, { useEffect, useCallback, useState } from "react";
import useWebSocket from "react-use-websocket";

// Custom hook to manage a single WebSocket connection
const useRelayConnection = ({ id, url, type, onMessage, setConnections }) => {
  const [prevMessage, setPrevMessage] = useState(null);

  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(url, {
    // onOpen: () => {
    //   console.log(`✅ Connected to ${id}`);
    //   setConnections((prev) => {
    //     const newMap = new Map(prev);
    //     newMap.set(id, { sendJsonMessage, readyState, url, type });        return new Map([...newMap]);
    //   });
    // },
    // onClose: () => {
    //   console.log(`🛑 Connection closed for ${id}`);
    //   setConnections((prev) => {
    //     const newMap = new Map(prev);
    //     const conn = newMap.get(id);
    //     if (conn) {
    //       newMap.set(id, { ...conn, readyState: 3 });
    //     }
    //     return new Map([...newMap]);
    //   });
    // },
    // onError: (event) => {
    //   console.error(`❌ WebSocket error at ${id}:`, event);
    //   setConnections((prev) => {
    //     const newMap = new Map(prev);
    //     const conn = newMap.get(id);
    //     if (conn) {
    //       newMap.set(id, { ...conn, readyState: -1 });
    //     }
    //     return new Map([...newMap]);
    //   });
    // },
    // onMessage: (event) => {
    //   const rawMessage = event.data;
    //   let message;
    //   try {
    //     message = JSON.parse(rawMessage);
    //     console.log(`✅ Successfully parsed message from ${id}:`, message);
    //   } catch (error) {
    //     console.error(`❌ Error parsing JSON message from ${id}:`, error);
    //     return; // Stop further processing if the message is invalid
    //   }
    // },
    share: true,
  });

  const updateConnection = useCallback(
    (stateUpdate) => {
      setConnections((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(id) || {};
        newMap.set(id, {
          ...existing,
          sendJsonMessage,
          readyState,
          url,
          type,
          ...stateUpdate,
        });
        return newMap;
      });
    },
    [id, sendJsonMessage, readyState, url, type, setConnections]
  );

  // ✅ Handle connection state changes
  useEffect(() => {
    updateConnection({ sendJsonMessage, readyState, url, type });

    if (readyState === 1) {
      console.log(`✅ WebSocket connected for ${id}`);
    } else if (readyState === 3) {
      console.log(`🛑 WebSocket closed for ${id}`);
      setConnections((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    } else if (readyState === -1) {
      console.log(`❌ WebSocket error for ${id}`);
      //remove
      // setConnections((prev) => {
      //   const newMap = new Map(prev);
      //   newMap.delete(id);
      //   return newMap;
      // });
    }
  }, [readyState, updateConnection]);

  useEffect(() => {
    if (
      lastJsonMessage !== null &&
      lastJsonMessage !== prevMessage &&
      lastJsonMessage !== undefined
    ) {
      console.log(`📥 Received message from ${id}:`, lastJsonMessage);
      onMessage(id, lastJsonMessage);
      setPrevMessage(lastJsonMessage);
    }
  }, [lastJsonMessage, id, onMessage, prevMessage]);

  return { sendJsonMessage, readyState };
};

const RelayItem = ({
  id,
  url,
  type,
  onMessage,
  setConnections,
  sendMessageToRelay,
}) => {
  const { readyState, sendJsonMessage } = useRelayConnection({
    id,
    url,
    type,
    onMessage,
    setConnections,
  });

  return (
    <div className=" border rounded shadow-sm w-52">
      <button
        className="w-full p-2 bg-blue-500 rounded hover:bg-blue-600 active:bg-blue-700 transition"
        onClick={() => {
          console.log("🔔 Ping button clicked!");
          sendMessageToRelay(id, { payload: { type: "ping" } });
        }}
      >
        <div className="text-xs font-semibold">{id}</div>
        <div className="text-xs opacity-80">
          {readyState === 1
            ? "✅"
            : readyState === 0
            ? "🟡 Connecting..."
            : readyState === 3
            ? "🔴 Closed"
            : "⚪️ Unknown"}
        </div>
        <div className="text-xs mt-1">Ping 🛎️</div>
      </button>
    </div>
  );
};

// Main RelayManager component
const RelayManager = ({
  addRelayConnections,
  onMessage,
  setSendMessage,
  connections,
  setConnections,
  removeRelayConnections,
  setRemoveRelayConnections,
}) => {
  const sendMessageToRelay = useCallback(
    (id, message) => {
      console.log(`📤 sendMessageToRelay ${id}:`, message);
      console.log(connections);
      const relay = connections.get(id);
      console.log(relay);
      if (relay && relay.sendJsonMessage) {
        console.log(`📤 Sending message to ${id}:`, message);
        relay.sendJsonMessage(message);
      } else {
        console.warn(`⚠️ Relay ${id} not found or not ready`);
      }
    },
    [connections]
  );

  useEffect(() => {
    setSendMessage(() => sendMessageToRelay);
  }, [setSendMessage, sendMessageToRelay]);

  useEffect(() => {
    if (!addRelayConnections || addRelayConnections.length === 0) {
      console.warn("⚠️ No relays to add");
      return;
    }

    console.log("🚀 Adding new relays to connections:", addRelayConnections);

    setConnections((prev) => {
      const newMap = new Map(prev);
      addRelayConnections.forEach((relay) => {
        if (!newMap.has(relay.id)) {
          newMap.set(relay.id, relay);
          console.log(`✅ Relay ${relay.id} added to connections`);
        } else {
          console.warn(`⚠️ Relay ${relay.id} already exists`);
        }
      });
      return newMap;
    });
  }, [addRelayConnections]);

  useEffect(() => {
    console.log("Removing relays from connections:", removeRelayConnections);
    if (removeRelayConnections && removeRelayConnections.length > 0) {
      console.log(
        "🗑 Removing relays from connections:",
        removeRelayConnections
      );

      setConnections((prev) => {
        const newMap = new Map(prev);
        removeRelayConnections.forEach((id) => {
          if (newMap.has(id)) {
            newMap.delete(id);
            console.log(`✅ Relay ${id} removed from connections`);
          } else {
            console.warn(`⚠️ Relay ${id} not found in connections`);
          }
        });
        return newMap;
      });
      console.log("✅ Connections after removal:", connections);

      // ✅ Clear removeRelayConnections after cleanup
      setRemoveRelayConnections([]);
    }
  }, [removeRelayConnections, setConnections]);

  // useEffect(() => {
  //   console.log("Removing relays from connections:", removeRelayConnections);
  //   if (removeRelayConnections && removeRelayConnections.length > 0) {
  //     console.log(
  //       "🗑 Removing relays from connections:",
  //       removeRelayConnections
  //     );

  //     setConnections((prev) => {
  //       const newMap = new Map(prev);
  //       removeRelayConnections.forEach((id) => {
  //         if (newMap.has(id)) {
  //           newMap.delete(id);
  //           console.log(`✅ Relay ${id} removed from connections`);
  //         } else {
  //           console.warn(`⚠️ Relay ${id} not found in connections`);
  //         }
  //       });
  //       return newMap;
  //     });
  //   }
  // }, [removeRelayConnections, setConnections]);

  return (
    <div className="d-flex flex-row">
      {Array.from(connections.values()).map((relay) => (
        <RelayItem
          key={relay.id}
          {...relay}
          onMessage={onMessage}
          setConnections={setConnections}
          sendMessageToRelay={sendMessageToRelay}
        />
      ))}
    </div>
  );
};

export default RelayManager;
