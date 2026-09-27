// Tracks order IDs the customer has placed on this device, per store — the
// storefront has no customer accounts, so "order history" only makes sense
// scoped to "orders placed from this browser." No backend lookup by phone/
// email is exposed, since that would let anyone query someone else's orders.
function storageKey(slug: string): string {
  return `abiriba:orders:${slug}`;
}

export function trackOrder(slug: string, orderId: string) {
  const ids = getTrackedOrderIds(slug);
  if (!ids.includes(orderId)) {
    localStorage.setItem(storageKey(slug), JSON.stringify([orderId, ...ids]));
  }
}

export function getTrackedOrderIds(slug: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
}

// Remembered on this device only, and across stores — a customer shouldn't
// retype their name and number for every order. Never sent anywhere except
// with an order they submit themselves.
const CUSTOMER_KEY = "abiriba:customer";

export function saveCustomerDetails(details: CustomerDetails) {
  try {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(details));
  } catch {
    // A full or blocked localStorage just means no prefill next time.
  }
}

export function getCustomerDetails(): CustomerDetails | null {
  try {
    const raw = localStorage.getItem(CUSTOMER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.name !== "string") return null;
    return {
      name: parsed.name,
      email: typeof parsed.email === "string" ? parsed.email : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
    };
  } catch {
    return null;
  }
}

export function clearCustomerDetails() {
  try {
    localStorage.removeItem(CUSTOMER_KEY);
  } catch {
    // Nothing to do — the next order just prefills again.
  }
}
