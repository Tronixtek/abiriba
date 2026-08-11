import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import type { CartItem, Order, Storefront } from "@/types";
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
import { toast } from "sonner";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function StorefrontPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { data: storefront, isLoading, isError } = useQuery({
    queryKey: ["public-storefront", tenantId],
    queryFn: () => api.get<Storefront>(`/public/${tenantId}/storefront`),
    retry: false,
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

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
    return <OrderConfirmation businessName={storefront.businessName} order={confirmedOrder} />;
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col gap-4 p-4 pb-28">
      <div>
        <h1 className="text-xl font-semibold">{storefront.businessName}</h1>
        <p className="text-sm text-muted-foreground">Browse and add items to your order</p>
      </div>

      <div className="flex flex-col gap-2">
        {storefront.products.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No products available right now.</p>
        )}
        {storefront.products.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex items-center justify-between gap-3 py-3">
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
              <Button size="sm" disabled={!p.available} onClick={() => addToCart(p)}>
                Add
              </Button>
            </CardContent>
          </Card>
        ))}
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
        tenantId={tenantId!}
        cart={cart}
        onSubmitted={(order) => setConfirmedOrder(order)}
      />
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
  tenantId,
  cart,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  cart: CartItem[];
  onSubmitted: (order: Order) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const submitOrder = useMutation({
    mutationFn: () =>
      api.post<Order>(`/public/${tenantId}/orders`, {
        customerName: name.trim(),
        customerEmail: email.trim() || undefined,
        customerPhone: phone.trim() || undefined,
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      }),
    onSuccess: (order) => {
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

function OrderConfirmation({ businessName, order }: { businessName: string; order: Order }) {
  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-xl font-semibold">Order submitted!</h1>
      <p className="text-muted-foreground">
        Show this screen to a staff member at {businessName} to pay.
      </p>
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
    </div>
  );
}
