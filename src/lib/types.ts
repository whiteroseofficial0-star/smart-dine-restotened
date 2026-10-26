export type OrderStatus = "PLACED" | "ACCEPTED" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";
export type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED" | "FAILED";
export interface OrderItemDTO { id: string; name: string; quantity: number; unitPrice: number; lineTotal: number; options: { name: string; group: string }[]; instructions: string | null }
export interface StaffOrder {
  id: string; orderNumber: number; tableNumber: number; tableLabel: string; status: OrderStatus; paymentStatus: PaymentStatus; sentToKitchen: boolean;
  customerName: string | null; customerPhone: string | null; notes: string | null; rejectReason: string | null;
  subtotal: number; taxTotal: number; serviceCharge: number; discountTotal: number; total: number; createdAt: string; updatedAt: string; items: OrderItemDTO[];
}
export interface StaffRequestDTO { id: string; tableNumber: number; type: "ASSISTANCE" | "WATER" | "CUTLERY" | "BILL"; status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED"; note: string | null; createdAt: string; acknowledgedAt?: string | null; text?: string }
export interface StaffSettings { restaurantName: string; voiceEnabled: boolean; voiceLang: string; voiceRate: number; voiceVolume: number; announceTemplate: string; kitchenWarnMinutes: number; autoSendToKitchen: boolean; user: { name: string; role: string } }
export const REQUEST_LABEL: Record<StaffRequestDTO["type"], string> = { ASSISTANCE: "needs assistance", WATER: "wants water", CUTLERY: "wants extra cutlery", BILL: "wants the bill" };
