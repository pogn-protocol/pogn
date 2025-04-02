import React, { useEffect, useCallback, useState, useRef } from "react";
import useWebSocket from "react-use-websocket";

// Custom hook to manage a single WebSocket connection
const useRelayConnection = ({
  id,
  url,
  type,
  onMessage,
  setConnections,
  closingConnections,
  manualCloseRef,
}) => {
  const [prevMessage, setPrevMessage] = useState(null);
  const reconnectTimeoutRef = useRef(null);
  const [shouldAttemptReconnect, setShouldAttemptReconnect] = useState(false);

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
    shouldReconnect: () => !manualCloseRef.current,
    reconnectAttempts: 5,
    reconnectInterval: 3000,
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

  useEffect(() => {
    let customState = readyState;

    // If readyState is CLOSED and it's not a manual close, mark as reconnecting
    // if (readyState === 3 && !closingConnections.has(id)) {
    //   console.log(`🛠️ Reconnecting state override for ${id}`);
    //   customState = 4; // Our custom "Re-connecting" state
    // }
    if (readyState === 3) {
      if (closingConnections.has(id)) {
        console.log(`🛑 ${id} is closing manually — skipping reconnect`);
        return;
      }

      // otherwise auto-reconnect logic:
      reconnectTimeoutRef.current = setTimeout(() => {
        console.warn(`⏱️ Auto-reconnect window expired for ${id}`);
        setShouldAttemptReconnect(false);
        setConnections((prev) => {
          const newMap = new Map(prev);
          newMap.delete(id);
          return newMap;
        });
      }, 10000);
    }

    // updateConnection({ sendJsonMessage, readyState: customState, url, type });
    // updateConnection({
    //   sendJsonMessage,
    //   readyState,
    //   customReadyState: customState, // ⬅️ Track this separately
    //   url,
    //   type,
    // });

    updateConnection({
      sendJsonMessage,
      readyState,
      customReadyState:
        readyState === 3 && !closingConnections.has(id) ? 4 : readyState,
      url,
      type,
    });

    if (readyState === 1) {
      console.log(`✅ WebSocket connected for ${id}`);
      setShouldAttemptReconnect(true);
      clearTimeout(reconnectTimeoutRef.current);
    } else if (readyState === 3 && !closingConnections.has(id)) {
      // start reconnect logic
      reconnectTimeoutRef.current = setTimeout(() => {
        console.warn(`⏱️ Auto-reconnect window expired for ${id}`);
        setShouldAttemptReconnect(false);

        setConnections((prev) => {
          const newMap = new Map(prev);
          newMap.delete(id);
          return newMap;
        });
      }, 10000);
    }
  }, [readyState, updateConnection, id, setConnections, closingConnections]);

  // useEffect(() => {
  //   updateConnection({ sendJsonMessage, readyState, url, type });

  //   if (readyState === 1) {
  //     console.log(`✅ WebSocket connected for ${id}`);
  //     setShouldAttemptReconnect(true);
  //     clearTimeout(reconnectTimeoutRef.current);
  //   }

  //   // else if (readyState === 3) {
  //   //   // Check if this is a manual shutdown
  //   //   if (closingConnections.has(id)) {
  //   //     console.log(`🛑 WebSocket manually shut down for ${id}.`);
  //   //     return;
  //   //   }

  //   //   console.log(
  //   //     `🛑 WebSocket closed for ${id} – attempting auto-reconnect...`
  //   //   );

  //   //   // Mark it as re-connecting
  //   //   updateConnection({ sendJsonMessage, readyState: 4, url, type });

  //   //   // Auto-reconnect logic
  //   //   reconnectTimeoutRef.current = setTimeout(() => {
  //   //     console.warn(`⏱️ Auto-reconnect window expired for ${id}`);
  //   //     setShouldAttemptReconnect(false);

  //   //     // Final cleanup after auto-reconnect attempts fail
  //   //     setConnections((prev) => {
  //   //       const newMap = new Map(prev);
  //   //       newMap.delete(id);
  //   //       return newMap;
  //   //     });
  //   //   }, 10000); // Auto-reconnect window (10 seconds)

  //   //   // Attempt to re-establish the connection after a short delay
  //   //   setTimeout(() => {
  //   //     console.log(`🔄 Attempting to auto-reconnect to ${id}...`);
  //   //     setShouldAttemptReconnect(true);
  //   //   }, 3000); // Retry every 3 seconds
  //   // }
  // }, [readyState, updateConnection, id, setConnections, closingConnections]);

  // useEffect(() => {
  //   updateConnection({ sendJsonMessage, readyState, url, type });

  //   if (readyState === 1) {
  //     console.log(`✅ WebSocket connected for ${id}`);
  //     setShouldAttemptReconnect(true);
  //     clearTimeout(reconnectTimeoutRef.current);
  //   } else if (readyState === 3) {
  //     // Check if it was manually closed
  //     if (closingConnections.has(id)) {
  //       console.log(`🛑 WebSocket manually shut down for ${id}.`);
  //       return;
  //     }

  //     console.log(`🛑 WebSocket closed for ${id} – will retry for 10s...`);

  //     // Set the readyState to 4 (Re-connecting) when starting the retry
  //     updateConnection({ sendJsonMessage, readyState: 4, url, type });

  //     // Retry reconnects for 10 seconds
  //     reconnectTimeoutRef.current = setTimeout(() => {
  //       console.warn(`⏱️ Reconnect window expired for ${id}`);
  //       setShouldAttemptReconnect(false);
  //       setConnections((prev) => {
  //         const newMap = new Map(prev);
  //         newMap.delete(id);
  //         return newMap;
  //       });
  //     }, 10000);
  //   }
  // }, [readyState, updateConnection, id, setConnections, closingConnections]);

  // useEffect(() => {
  //   updateConnection({ sendJsonMessage, readyState, url, type });

  //   if (readyState === 1) {
  //     console.log(`✅ WebSocket connected for ${id}`);
  //     setShouldAttemptReconnect(true);
  //     clearTimeout(reconnectTimeoutRef.current);
  //   } else if (readyState === 3) {
  //     console.log(`🛑 WebSocket closed for ${id} – will retry for 10s...`);

  //     // Set the readyState to 4 (Re-connecting) when starting the retry
  //     updateConnection({ sendJsonMessage, readyState: 4, url, type });

  //     // Retry reconnects for 10 seconds
  //     reconnectTimeoutRef.current = setTimeout(() => {
  //       console.warn(`⏱️ Reconnect window expired for ${id}`);
  //       setShouldAttemptReconnect(false);
  //       setConnections((prev) => {
  //         const newMap = new Map(prev);
  //         newMap.delete(id);
  //         return newMap;
  //       });
  //     }, 10000);
  //   }
  // }, [readyState, updateConnection, id, setConnections]);

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
  sendMessageToRelay,
  setConnections,
  closingConnections,
  customReadyState,
  manualCloseRef,
}) => {
  const { readyState, sendJsonMessage } = useRelayConnection({
    id,
    url,
    type,
    onMessage,
    setConnections,
    closingConnections,
    manualCloseRef,
  });
  const [countdown, setCountdown] = useState(null); // ✅ this line is missing!

  useEffect(() => {
    if (!closingConnections.has(id)) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    setCountdown(closingConnections.get(id)?.countdown || 5); // initialize to 5

    return () => clearInterval(interval);
  }, [closingConnections, id]);

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
        {/* <div className="text-xs opacity-80">
          {closingConnections.has(id) ? (
            <span className="text-orange-500">
              🛑 Shutting down... {closingConnections.get(id)?.countdown}s
            </span>
          ) : readyState === 1 ? (
            "✅"
          ) : readyState === 0 ? (
            "🟡 Connecting..."
          ) : readyState === 3 ? (
            "🔴 Closed"
          ) : readyState === 4 ? (
            "🟠 Re-connecting..."
          ) : (
            "⚪️ Unknown"
          )}
        </div> */}
        <div className="text-xs opacity-80">
          {closingConnections.has(id) ? (
            <span className="text-orange-500">
              🛑 Shutting down...{" "}
              {countdown ?? closingConnections.get(id)?.countdown}s
            </span>
          ) : customReadyState === 1 ? (
            "✅"
          ) : customReadyState === 0 ? (
            "🟡 Connecting..."
          ) : customReadyState === 3 ? (
            "🔴 Closed"
          ) : customReadyState === 4 ? (
            "🟠 Attempting re-connect..."
          ) : (
            "⚪️ Unknown"
          )}
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
  const [closingConnections, setClosingConnections] = useState(new Map());
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
  const manualCloseRefs = useRef({}); // ⬅️ Tracks which IDs are manual close

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
        if (!relay.id) {
          console.error("❌ Relay ID is missing:", relay);
          return;
        }
        if (!relay.url) {
          console.error("❌ Relay URL is missing:", relay);
          return;
        }
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
      removeRelayConnections.forEach((id) => {
        // Mark as manually closing so the hook doesn't reconnect
        manualCloseRefs.current[id] = true; // ⬅️ Tell the hook this is manual

        setClosingConnections((prev) => {
          const updated = new Map(prev);
          updated.set(id, { countdown: 5, startedAt: Date.now() });
          return updated;
        });

        setTimeout(() => {
          setConnections((prev) => {
            const newMap = new Map(prev);
            if (newMap.has(id)) {
              newMap.delete(id);
              console.log(`✅ Relay ${id} removed after timeout`);
            }
            return newMap;
          });

          setClosingConnections((prev) => {
            const updated = new Map(prev);
            updated.delete(id);
            return updated;
          });
        }, 5000); // ⏱️ Delay actual removal
      });

      setRemoveRelayConnections([]);
    }
  }, [removeRelayConnections, setConnections, setRemoveRelayConnections]);

  return (
    <div className="d-flex flex-row">
      {Array.from(connections.values()).map((relay) => (
        <RelayItem
          key={relay.id}
          {...relay}
          onMessage={onMessage}
          setConnections={setConnections}
          sendMessageToRelay={sendMessageToRelay}
          closingConnections={closingConnections} // ✅ Pass it down
          manualCloseRef={
            manualCloseRefs.current[relay.id] || { current: false }
          } // ✅ Correct place
        />
      ))}
    </div>
  );
};

export default RelayManager;
