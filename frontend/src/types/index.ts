export type Role = "OWNER" | "MANAGER" | "STAFF";

export type OrderStatus = "OPEN" | "PAID" | "VOIDED";

export type OrderSource = "STAFF" | "CUSTOMER_QR";

export type PaymentMethod = "CASH" | "CARD" | "TRANSFER";

export type StockAdjustmentReason =
  | "SALE"
  | "RESTOCK"
  | "MANUAL_CORRECTION"
  | "VOID_RESTOCK";

export type ReceiptStatus = "NOT_APPLICABLE" | "PENDING" | "SENT" | "FAILED";

// Decimal columns (price, subtotal, total, unitPrice, lineTotal, amount)
// serialize as strings over JSON — convert with Number() when displaying.

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  price: string;
  displayPrice: string;
  quantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  source: OrderSource;
  customerId: string | null;
  customerName: string | null;
  items: OrderItem[];
  subtotal: string;
  total: string;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt?: string | null;
  payment?: { method: PaymentMethod; amount: string; markedPaidById: string } | null;
  voidedAt?: string | null;
  voidedById?: string | null;
  voidReason?: string | null;
  receiptStatus?: ReceiptStatus;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  userId: string;
  delta: number;
  reason: StockAdjustmentReason;
  orderId: string | null;
  note: string | null;
  createdAt: string;
  product: { name: string };
}

export interface SalesReport {
  range: "day" | "week" | "month";
  from: string;
  to: string;
  totalRevenue: number;
  itemsSold: number;
  orderCount: number;
  topProducts: { productId: string; name: string; qty: number; revenue: number }[];
}

export interface CartItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface PublicProduct {
  id: string;
  name: string;
  description?: string | null;
  price: string;
  available: boolean;
}

export interface Storefront {
  businessName: string;
  products: PublicProduct[];
}
