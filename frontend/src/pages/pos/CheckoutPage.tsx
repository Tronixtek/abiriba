import { useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useCustomers } from "@/hooks/useCustomers";
import { useCreateOrder, usePayOrder } from "@/hooks/useOrders";
import type { CartItem, PaymentMethod } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { ApiError, resolveUploadUrl } from "@/lib/apiClient";

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CheckoutPage() {
  const { data: allProducts = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const createOrder = useCreateOrder();
  const payOrder = usePayOrder();

  const products = allProducts.filter((p) => p.isActive);

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string>("none");
  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [charging, setCharging] = useState(false);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const total = cart.reduce((sum, item) => sum + item.lineTotal, 0);

  function addToCart(product: (typeof products)[number]) {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      const unitPrice = Number(product.displayPrice);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, lineTotal: (item.quantity + 1) * unitPrice }
            : item
        );
      }
      return [...prev, { productId: product.id, name: product.name, unitPrice, quantity: 1, lineTotal: unitPrice }];
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

  async function handleCharge() {
    if (cart.length === 0) return;
    setCharging(true);
    try {
      const order = await createOrder.mutateAsync({
        customerId: customerId === "none" ? undefined : customerId,
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      });
      await payOrder.mutateAsync({ orderId: order.id, method });
      toast.success("Payment recorded.");
      setCart([]);
      setCustomerId("none");
      setPayOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Checkout failed.");
    } finally {
      setCharging(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filteredProducts.map((p) => {
            const imageUrl = resolveUploadUrl(p.images[0]?.url);
            return (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.quantity <= 0}
                className="flex flex-col items-start gap-2 rounded-md border p-3 text-left hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                {imageUrl ? (
                  <img src={imageUrl} alt={p.name} className="h-16 w-full rounded object-cover" />
                ) : (
                  <div className="flex h-16 w-full items-center justify-center rounded bg-muted text-muted-foreground">
                    <ImageIcon className="size-5" />
                  </div>
                )}
                <div>
                  <span className="font-medium">{p.name}</span>
                  <span className="block text-sm text-muted-foreground">
                    {money(Number(p.displayPrice))} · {p.quantity} in stock
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-md border p-4">
        <h2 className="font-semibold">Cart</h2>
        <div className="flex flex-col gap-1.5">
          <Label>Customer (optional)</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Walk-in / no customer</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cart.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Cart is empty
                </TableCell>
              </TableRow>
            )}
            {cart.map((item) => (
              <TableRow key={item.productId}>
                <TableCell>{item.name}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-6"
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    >
                      -
                    </Button>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-6"
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-right">{money(item.lineTotal)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between text-lg font-semibold">
          <span>Total</span>
          <span>{money(total)}</span>
        </div>

        <Button disabled={cart.length === 0} onClick={() => setPayOpen(true)}>
          Charge
        </Button>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take payment — {money(total)}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            {(["CASH", "CARD", "TRANSFER"] as PaymentMethod[]).map((m) => (
              <Button
                key={m}
                type="button"
                variant={method === m ? "default" : "outline"}
                onClick={() => setMethod(m)}
              >
                {m}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={handleCharge} disabled={charging}>
              {charging ? "Processing..." : "Confirm payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
