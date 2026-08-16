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

export type ChatRole = "USER" | "ASSISTANT";

export type ProposalStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

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

export interface ProductImage {
  id: string;
  url: string;
  position: number;
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
  images: ProductImage[];
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

export interface SalesTrendPoint {
  date: string;
  revenue: number;
  transactions: number;
  itemsSold: number;
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
  images: string[];
  available: boolean;
}

export interface Storefront {
  businessName: string;
  products: PublicProduct[];
}

export interface PublicOrder {
  id: string;
  status: OrderStatus;
  total: string;
  items: { name: string; quantity: number; unitPrice: string; lineTotal: string }[];
  createdAt: string;
  paidAt?: string | null;
}

export interface TenantMarketplaceSettings {
  marketplaceEnabled: boolean;
  country: string | null;
  state: string | null;
  lga: string | null;
  city: string | null;
  street: string | null;
  streetNumber: string | null;
  latitude: string | null;
  longitude: string | null;
  locationUpdatedAt: string | null;
}

export interface MarketplaceProductResult {
  name: string;
  displayPrice: string;
  image: string | null;
}

export interface MarketplaceVendorResult {
  businessName: string;
  slug: string;
  state: string | null;
  city: string | null;
  street: string | null;
  streetNumber: string | null;
  distanceKm: number | null;
  products: MarketplaceProductResult[];
}

export interface AiProposedItem {
  name: string;
  quantity: number;
  unitPrice?: number | null;
  matchedProductId?: string | null;
}

export interface AiChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  imageUrl?: string | null;
  proposedActions?: AiProposedItem[] | null;
  status: ProposalStatus;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

// Super admin portal — cross-tenant monitoring, separate identity from Role/User above.
export interface AdminUser {
  id: string;
  name: string;
  email: string;
}

export interface AdminStats {
  tenantCount: number;
  activeUserCount: number;
  transactionCount: number;
  itemsSold: number;
  gmv: number;
  vendorPayouts: number;
  platformRevenue: number;
}

export interface AdminTenantSummary {
  id: string;
  businessName: string;
  createdAt: string;
  ownerName: string | null;
  ownerEmail: string | null;
  userCount: number;
  productCount: number;
  orderCount: number;
  gmv: number;
  vendorPayouts: number;
  platformRevenue: number;
}

export interface AdminTrendPoint {
  date: string;
  newTenants: number;
  transactions: number;
  gmv: number;
  platformRevenue: number;
  itemsSold: number;
}

export interface AdminTenantDetail {
  id: string;
  businessName: string;
  createdAt: string;
  users: { id: string; name: string; email: string; role: Role; isActive: boolean; createdAt: string }[];
  productCount: number;
  customerCount: number;
  transactionCount: number;
  gmv: number;
  vendorPayouts: number;
  platformRevenue: number;
  recentOrders: Order[];
  recentStockAdjustments: (StockAdjustment & { user: { name: string } })[];
}
