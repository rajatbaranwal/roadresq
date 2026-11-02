import { useEffect, useRef, useSyncExternalStore } from "react";
import socket from "../socket";

// Subscribe to a socket event for the lifetime of the component.
// Removes only its own listener on unmount (other components keep theirs).
export const useSocketEvent = (event, handler) => {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const listener = (payload) => handlerRef.current(payload);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [event]);
};

// Calls `handler` after a reconnection that could not restore missed events,
// so the component can refetch its data from the API.
export const useResyncOnReconnect = (handler) => {
  useSocketEvent("connect", () => {
    if (!socket.recovered) handler();
  });
};

const subscribeStatus = (onChange) => {
  socket.on("connect", onChange);
  socket.on("disconnect", onChange);
  return () => {
    socket.off("connect", onChange);
    socket.off("disconnect", onChange);
  };
};

export const useSocketConnected = () => useSyncExternalStore(subscribeStatus, () => socket.connected);
