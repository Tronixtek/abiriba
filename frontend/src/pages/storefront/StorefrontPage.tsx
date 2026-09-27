import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { History, ArrowLeft } from "lucide-react";
import { api, ApiError, resolveUploadUrl } from "@/lib/apiClient";
import {
  trackOrder,
  getTrackedOrderIds,
  getCustomerDetails,
  saveCustomerDetails,
  clearCustomerDetails,
} from "@/lib/storefrontOrders";
import type { CartItem, Order, OrderStatus, PublicOrder, Storefront } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ImageLightbox } from "@/components/storefront/ImageLightbox";
import { OnlinePaymentCard } from "@/components/storefront/OnlinePaymentCard";
import { toast } from "sonner";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusVariant(status: OrderStatus): "default" | "secondary" | "destructive" {
  if (status === "PAID") return "default";
  if (status === "VOIDED") return "destructive";
  return "secondary";
}

export function StorefrontPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: storefront, isLoading, isError } = useQuery({
    queryKey: ["public-storefront", slug],
    queryFn: () => api.get<Storefront>(`/public/${slug}/storefront`),
    retry: false,
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [lightboxProduct, setLightboxProduct] = useState<{ images: string[]; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"browse" | "orders">("browse");

  function addToCart(product: NonNullable<typeof storefront>["products"][number]) {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      const unitPrice = Number(product.price);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, lineTotal: (item.quantity + 1) * unitPrice }
            : item
        );
      }
      return [
        ...prev,
        { productId: product.id, name: product.name, unitPrice, quantity: 1, lineTotal: unitPrice },
      ];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.productId !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity, lineTotal: quantity * item.unitPrice } : item
      )
    );
  }

  const total = cart.reduce((sum, item) => sum + item.lineTotal, 0);

  if (isLoading) {
    return <CenteredMessage>Loading store...</CenteredMessage>;
  }

  if (isError || !storefront) {
    return <CenteredMessage>This store link isn't available.</CenteredMessage>;
  }

  if (confirmedOrder) {
    return (
      <OrderConfirmation
        businessName={storefront.businessName}
        order={confirmedOrder}
        onBackToShop={() => setConfirmedOrder(null)}
        onViewOrders={() => {
          setConfirmedOrder(null);
          setView("orders");
        }}
      />
    );
  }

  if (view === "orders") {
    return <MyOrdersView slug={slug!} businessName={storefront.businessName} onBack={() => setView("browse")} />;
  }

  const filteredProducts = storefront.products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col gap-4 p-4 pb-28">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{storefront.businessName}</h1>
          <p className="text-sm text-muted-foreground">Browse and add items to your order</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setView("orders")}>
          <History className="size-4" />
          My orders
        </Button>
      </div>

      {storefront.products.length > 0 && (
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      <div className="flex flex-col gap-2">
        {storefront.products.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No products available right now.</p>
        )}
        {storefront.products.length > 0 && filteredProducts.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No products match "{search}".</p>
        )}
        {filteredProducts.map((p) => {
          const imageUrls = p.images.map((img) => resolveUploadUrl(img)).filter((u): u is string => !!u);
          return (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  {imageUrls.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setLightboxProduct({ images: imageUrls, name: p.name })}
                      className="shrink-0"
                      aria-label={`View photos of ${p.name}`}
                    >
                      <img
                        src={imageUrls[0]}
                        alt={p.name}
                        className="size-14 rounded-md border object-cover"
                      />
                    </button>
                  )}
                  <div>
                    <p className="font-medium">{p.name}</p>
                    {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                    <p className="text-sm text-muted-foreground">{money(p.price)}</p>
                    {!p.available && (
                      <Badge variant="secondary" className="mt-1">
                        Out of stock
                      </Badge>
                    )}
                  </div>
                </div>
                <Button size="sm" disabled={!p.available} onClick={() => addToCart(p)}>
                  Add
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t bg-background p-4">
          <div className="mx-auto flex max-w-md flex-col gap-2">
            <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center justify-between text-sm">
                  <span>{item.name}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-6"
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    >
                      -
                    </Button>
                    <span className="w-4 text-center">{item.quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-6"
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    >
                      +
                    </Button>
                    <span className="w-16 text-right">{money(item.lineTotal)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between font-semibold">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
            <Button onClick={() => setDetailsOpen(true)}>Place order</Button>
          </div>
        </div>
      )}

      <CustomerDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        slug={slug!}
        cart={cart}
        onSubmitted={(order) => {
          trackOrder(slug!, order.id);
          setConfirmedOrder(order);
        }}
      />

      {lightboxProduct && (
        <ImageLightbox
          images={lightboxProduct.images}
          initialIndex={0}
          productName={lightboxProduct.name}
          open={!!lightboxProduct}
          onOpenChange={(open) => !open && setLightboxProduct(null)}
        />
      )}
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center p-4 text-center text-muted-foreground">
      {children}
    </div>
  );
}

function CustomerDetailsDialog({
  open,
  onOpenChange,
  slug,
  cart,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  cart: CartItem[];
  onSubmitted: (order: Order) => void;
}) {
  // Prefilled from the last order placed on this device, so a returning
  // customer only has to confirm rather than retype.
  const saved = getCustomerDetails();
  const [name, setName] = useState(saved?.name ?? "");
  const [email, setEmail] = useState(saved?.email ?? "");
  const [phone, setPhone] = useState(saved?.phone ?? "");

  const submitOrder = useMutation({
    mutationFn: () =>
      api.post<Order>(`/public/${slug}/orders`, {
        customerName: name.trim(),
        customerEmail: email.trim() || undefined,
        customerPhone: phone.trim() || undefined,
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      }),
    onSuccess: (order) => {
      saveCustomerDetails({ name: name.trim(), email: email.trim(), phone: phone.trim() });
      onOpenChange(false);
      onSubmitted(order);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to submit order.");
    },
  });

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Your name is required.");
      return;
    }
    submitOrder.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your details</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customerName">Name</Label>
            <Input id="customerName" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customerEmail">Email (optional — for a receipt)</Label>
            <Input
              id="customerEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customerPhone">Phone (optional)</Label>
            <Input id="customerPhone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {saved && (
            <button
              type="button"
              onClick={() => {
                clearCustomerDetails();
                setName("");
                setEmail("");
                setPhone("");
              }}
              className="self-start text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Not you? Clear saved details
            </button>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitOrder.isPending}>
            {submitOrder.isPending ? "Submitting..." : "Submit order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrderConfirmation({
  businessName,
  order,
  onBackToShop,
  onViewOrders,
}: {
  businessName: string;
  order: Order;
  onBackToShop: () => void;
  onViewOrders: () => void;
}) {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-xl font-semibold">Order submitted!</h1>
      <Card className="w-full">
        <CardContent className="flex flex-col gap-2 py-4 text-left">
          <p className="text-sm text-muted-foreground">
            Order reference: <span className="font-mono">{order.id.slice(-8).toUpperCase()}</span>
          </p>
          {order.items.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>{money(item.lineTotal)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-2 font-semibold">
            <span>Total</span>
            <span>{money(order.total)}</span>
          </div>
        </CardContent>
      </Card>
      <OnlinePaymentCard slug={slug!} businessName={businessName} order={order} />
      <div className="flex w-full gap-2">
        <Button variant="outline" className="flex-1" onClick={onBackToShop}>
          Back to shop
        </Button>
        <Button className="flex-1" onClick={onViewOrders}>
          My orders
        </Button>
      </div>
    </div>
  );
}

function MyOrdersView({
  slug,
  businessName,
  onBack,
}: {
  slug: string;
  businessName: string;
  onBack: () => void;
}) {
  const orderIds = getTrackedOrderIds(slug);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["public-my-orders", slug, orderIds.join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        orderIds.map((id) => api.get<PublicOrder>(`/public/${slug}/orders/${id}`).catch(() => null))
      );
      return results.filter((o): o is PublicOrder => o !== null);
    },
    enabled: orderIds.length > 0,
  });

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="Back to shop">
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">My orders</h1>
          <p className="text-sm text-muted-foreground">{businessName}</p>
        </div>
      </div>

      {orderIds.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          You haven't placed any orders here yet — orders you place from this device will show up here.
        </p>
      )}

      {isLoading && <p className="text-center text-sm text-muted-foreground">Loading...</p>}

      <div className="flex flex-col gap-2">
        {orders?.map((order) => (
          <Card key={order.id}>
            <CardContent className="flex flex-col gap-2 py-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-muted-foreground">
                  #{order.id.slice(-8).toUpperCase()}
                </span>
                <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
              </div>
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  <span>{money(item.lineTotal)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t pt-2 text-sm font-semibold">
                <span>Total</span>
                <span>{money(order.total)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(order.createdAt).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
