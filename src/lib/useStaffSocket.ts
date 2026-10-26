"use client";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import type { StaffOrder, StaffRequestDTO } from "./types";

interface Handlers {
  onConnect?: () => void; onNewOrder?: (o: StaffOrder) => void; onOrderUpdated?: (o: StaffOrder) => void;
  onRequestNew?: (r: StaffRequestDTO) => void; onRequestUpdated?: (r: StaffRequestDTO) => void;
}
/** Connects once. `onConnect` fires on the first connect AND on every reconnect, so screens can re-sync missed events. */
export function useStaffSocket(h: Handlers) {
  const [connected, setConnected] = useState(false);
  const ref = useRef(h); ref.current = h;
  useEffect(() => {
    const s = io({ transports: ["websocket", "polling"] });
    s.on("connect", () => { setConnected(true); ref.current.onConnect?.(); });
    s.on("disconnect", () => setConnected(false));
    s.on("order:new", (o: StaffOrder) => ref.current.onNewOrder?.(o));
    s.on("order:updated", (o: StaffOrder) => ref.current.onOrderUpdated?.(o));
    s.on("request:new", (r: StaffRequestDTO) => ref.current.onRequestNew?.(r));
    s.on("request:updated", (r: StaffRequestDTO) => ref.current.onRequestUpdated?.(r));
    return () => { s.disconnect(); };
  }, []);
  return connected;
}
