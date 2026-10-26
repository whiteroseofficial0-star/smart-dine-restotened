import type { Server } from "socket.io";
// The custom server (server.ts) stores the io instance on globalThis so route handlers can emit.
export const getIO = (): Server | undefined => (globalThis as any).__io;
export const emitToRestaurant = (restaurantId: string, event: string, payload: unknown) =>
  getIO()?.to(`staff:${restaurantId}`).emit(event, payload);
export const emitToOrder = (orderId: string, event: string, payload: unknown) =>
  getIO()?.to(`order:${orderId}`).emit(event, payload);
