import { cloneElement, isValidElement, useState, type ReactElement } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAdjustStock, useCreateProduct, useProducts, useUpdateProduct } from "@/hooks/useProducts";
import type { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ApiError } from "@/lib/apiClient";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isLowStock(p: Product) {
  return p.quantity <= p.lowStockThreshold;
}

export function ProductsPage() {
  const { role } = useAuth();
  const canManage = role === "OWNER" || role === "MANAGER";
  const { data: products = [], isLoading } = useProducts();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        {canManage && <AddProductDialog />}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead>Status</TableHead>
            {canManage && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {!isLoading && products.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No products yet.
              </TableCell>
            </TableRow>
          )}
          {products.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell className="text-muted-foreground">{p.sku}</TableCell>
              <TableCell className="text-right">{money(p.price)}</TableCell>
              <TableCell className="text-right">{p.quantity}</TableCell>
              <TableCell>
                {isLowStock(p) && <Badge variant="destructive">Low stock</Badge>}
                {!p.isActive && <Badge variant="secondary">Inactive</Badge>}
              </TableCell>
              {canManage && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <AdjustStockDialog productId={p.id} productName={p.name} />
                    <EditProductDialog product={p} />
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AddProductDialog() {
  const [open, setOpen] = useState(false);
  const createProduct = useCreateProduct();
  const [form, setForm] = useState({
    sku: "",
    name: "",
    description: "",
    price: "",
    quantity: "",
    lowStockThreshold: "5",
  });

  async function handleSubmit() {
    if (!form.sku.trim() || !form.name.trim() || !form.price || !form.quantity) {
      toast.error("SKU, name, price, and quantity are required.");
      return;
    }
    try {
      await createProduct.mutateAsync({
        sku: form.sku.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: Number(form.price),
        quantity: Number(form.quantity),
        lowStockThreshold: Number(form.lowStockThreshold) || 5,
      });
      toast.success("Product added.");
      setOpen(false);
      setForm({ sku: "", name: "", description: "", price: "", quantity: "", lowStockThreshold: "5" });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add product.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add product</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add product</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field id="sku" label="SKU">
            <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </Field>
          <Field id="name" label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field id="price" label="Price">
            <Input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </Field>
          <Field id="quantity" label="Initial quantity">
            <Input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </Field>
          <Field id="lowStockThreshold" label="Low stock threshold">
            <Input
              type="number"
              value={form.lowStockThreshold}
              onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field id="description" label="Description">
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={createProduct.isPending}>
            {createProduct.isPending ? "Adding..." : "Add product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditProductDialog({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const updateProduct = useUpdateProduct();
  const [form, setForm] = useState({
    name: product.name,
    description: product.description ?? "",
    price: product.price,
    lowStockThreshold: String(product.lowStockThreshold),
    isActive: product.isActive,
  });

  async function handleSubmit() {
    try {
      await updateProduct.mutateAsync({
        productId: product.id,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: Number(form.price),
        lowStockThreshold: Number(form.lowStockThreshold),
        isActive: form.isActive,
      });
      toast.success("Product updated.");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update product.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {product.name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field id="edit-name" label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field id="edit-price" label="Price">
            <Input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </Field>
          <Field id="edit-lowStockThreshold" label="Low stock threshold">
            <Input
              type="number"
              value={form.lowStockThreshold}
              onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field id="edit-description" label="Description">
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={updateProduct.isPending}>
            {updateProduct.isPending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdjustStockDialog({ productId, productName }: { productId: string; productName: string }) {
  const [open, setOpen] = useState(false);
  const adjustStock = useAdjustStock();
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState<"RESTOCK" | "MANUAL_CORRECTION">("RESTOCK");
  const [note, setNote] = useState("");

  async function handleSubmit() {
    const deltaNum = Number(delta);
    if (!deltaNum) {
      toast.error("Enter a non-zero quantity change.");
      return;
    }
    try {
      await adjustStock.mutateAsync({ productId, delta: deltaNum, reason, note: note.trim() || undefined });
      toast.success("Stock adjusted.");
      setOpen(false);
      setDelta("");
      setNote("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to adjust stock.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Adjust stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock — {productName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Reason</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={reason === "RESTOCK" ? "default" : "outline"}
                size="sm"
                onClick={() => setReason("RESTOCK")}
              >
                Restock
              </Button>
              <Button
                type="button"
                variant={reason === "MANUAL_CORRECTION" ? "default" : "outline"}
                size="sm"
                onClick={() => setReason("MANUAL_CORRECTION")}
              >
                Manual correction
              </Button>
            </div>
          </div>
          <Field id="delta" label="Quantity change (use a negative number to remove stock)">
            <Input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} />
          </Field>
          <Field id="note" label="Note (optional)">
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={adjustStock.isPending}>
            {adjustStock.isPending ? "Saving..." : "Apply adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactElement }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {isValidElement(children) ? cloneElement(children, { id } as Record<string, unknown>) : children}
    </div>
  );
}
