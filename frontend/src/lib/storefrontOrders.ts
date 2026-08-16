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
