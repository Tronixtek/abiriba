import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useOrders, usePayOrder, useVoidOrder } from "@/hooks/useOrders";
import type { Order, OrderStatus, PaymentMethod } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ApiError } from "@/lib/apiClient";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusVariant(status: OrderStatus): "default" | "secondary" | "destructive" {
  if (status === "PAID") return "default";
  if (status === "VOIDED") return "destructive";
  return "secondary";
}

export function OrdersPage() {
  const { role } = useAuth();
  const canVoid = role === "OWNER" || role === "MANAGER";
  const { data: orders = [], isLoading } = useOrders();
  const [selected, setSelected] = useState<Order | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!isLoading && orders.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No orders yet.
              </TableCell>
            </TableRow>
          )}
          {orders.map((o) => (
            <TableRow key={o.id} className="cursor-pointer" onClick={() => setSelected(o)}>
              <TableCell>{o.customerName ?? "Walk-in"}</TableCell>
              <TableCell>
                <div className="flex gap-1.5">
                  <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
                  {o.source === "CUSTOMER_QR" && <Badge variant="outline">QR order</Badge>}
                </div>
              </TableCell>
              <TableCell className="text-right">{money(o.total)}</TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(o.createdAt).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        {selected && (
          <OrderDetail order={selected} canVoid={canVoid} onClosed={() => setSelected(null)} />
        )}
      </Dialog>
    </div>
  );
}

function OrderDetail({
  order,
  canVoid,
  onClosed,
}: {
  order: Order;
  canVoid: boolean;
  onClosed: () => void;
}) {
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const voidOrder = useVoidOrder();
  const payOrder = usePayOrder();

  async function handleVoid() {
    if (!reason.trim()) {
      toast.error("A reason is required to void an order.");
      return;
    }
    try {
      await voidOrder.mutateAsync({ orderId: order.id, reason: reason.trim() });
      toast.success("Order voided and stock restored.");
      onClosed();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to void order.");
    }
  }

  async function handleMarkPaid() {
    try {
      await payOrder.mutateAsync({ orderId: order.id, method });
      toast.success("Order marked as paid.");
      onClosed();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to mark order as paid.");
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          Order — {order.customerName ?? "Walk-in"}
          <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
          {order.source === "CUSTOMER_QR" && <Badge variant="outline">QR order</Badge>}
        </DialogTitle>
      </DialogHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.items.map((item) => (
            <TableRow key={item.productId}>
              <TableCell>{item.name}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="text-right">{money(item.lineTotal)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between text-lg font-semibold">
        <span>Total</span>
        <span>{money(order.total)}</span>
      </div>
      {order.payment && (
        <p className="text-sm text-muted-foreground">Paid via {order.payment.method}</p>
      )}
      {order.status === "VOIDED" && (
        <p className="text-sm text-muted-foreground">Void reason: {order.voidReason}</p>
      )}

      {order.status === "OPEN" && (
        <div className="flex flex-col gap-2 border-t pt-4">
          <p className="text-sm font-medium">Mark as paid</p>
          <div className="flex gap-2">
            {(["CASH", "CARD", "TRANSFER"] as PaymentMethod[]).map((m) => (
              <Button
                key={m}
                type="button"
                variant={method === m ? "default" : "outline"}
                size="sm"
                onClick={() => setMethod(m)}
              >
                {m}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={handleMarkPaid} disabled={payOrder.isPending}>
              {payOrder.isPending ? "Processing..." : "Confirm payment"}
            </Button>
          </DialogFooter>
        </div>
      )}

      {canVoid && order.status === "PAID" && (
        <div className="flex flex-col gap-2 border-t pt-4">
          <Input
            placeholder="Reason for voiding this order"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="destructive" onClick={handleVoid} disabled={voidOrder.isPending}>
              {voidOrder.isPending ? "Voiding..." : "Void order"}
            </Button>
          </DialogFooter>
        </div>
      )}
    </DialogContent>
  );
}
