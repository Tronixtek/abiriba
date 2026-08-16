import { cloneElement, isValidElement, useRef, useState, type ReactElement } from "react";
import { ImageIcon, X } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  useAdjustStock,
  useCreateProduct,
  useDeleteProductImage,
  useProducts,
  useUpdateProduct,
  useUploadProductImage,
} from "@/hooks/useProducts";
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
import { ApiError, resolveUploadUrl } from "@/lib/apiClient";

const MAX_PRODUCT_IMAGES = 3;

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
            <TableHead className="w-12"></TableHead>
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
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No products yet.
              </TableCell>
            </TableRow>
          )}
          {products.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <ProductThumb product={p} />
              </TableCell>
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

function ProductThumb({ product }: { product: Product }) {
  const url = resolveUploadUrl(product.images[0]?.url);
  if (url) {
    return (
      <img
        src={url}
        alt={product.name}
        className="size-9 rounded-md border object-cover"
      />
    );
  }
  return (
    <div className="flex size-9 items-center justify-center rounded-md border bg-muted text-muted-foreground">
      <ImageIcon className="size-4" />
    </div>
  );
}

function AddProductDialog() {
  const [open, setOpen] = useState(false);
  const createProduct = useCreateProduct();
  const uploadImage = useUploadProductImage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    sku: "",
    name: "",
    description: "",
    price: "",
    quantity: "",
    lowStockThreshold: "5",
  });

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setStagedFiles((prev) => [...prev, ...files].slice(0, MAX_PRODUCT_IMAGES));
  }

  function removeStagedFile(index: number) {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    setForm({ sku: "", name: "", description: "", price: "", quantity: "", lowStockThreshold: "5" });
    setStagedFiles([]);
  }

  async function handleSubmit() {
    if (!form.sku.trim() || !form.name.trim() || !form.price || !form.quantity) {
      toast.error("SKU, name, price, and quantity are required.");
      return;
    }
    setSubmitting(true);
    try {
      const product = await createProduct.mutateAsync({
        sku: form.sku.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: Number(form.price),
        quantity: Number(form.quantity),
        lowStockThreshold: Number(form.lowStockThreshold) || 5,
      });
      for (const file of stagedFiles) {
        await uploadImage.mutateAsync({ productId: product.id, file });
      }
      toast.success("Product added.");
      setOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add product.");
    } finally {
      setSubmitting(false);
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
        <div className="flex flex-col gap-1.5">
          <Label>Photos (optional)</Label>
          <div className="flex flex-wrap gap-2">
            {stagedFiles.map((file, i) => (
              <div key={i} className="relative size-16">
                <img
                  src={URL.createObjectURL(file)}
                  alt=""
                  className="size-16 rounded-md border object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeStagedFile(i)}
                  aria-label="Remove photo"
                  className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            {stagedFiles.length < MAX_PRODUCT_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex size-16 items-center justify-center rounded-md border border-dashed text-muted-foreground hover:bg-accent"
              >
                <ImageIcon className="size-5" />
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
          <p className="text-xs text-muted-foreground">Up to {MAX_PRODUCT_IMAGES}, JPEG/PNG/WEBP, 5MB each.</p>
        </div>
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
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Adding..." : "Add product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditProductDialog({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const updateProduct = useUpdateProduct();
  const uploadImage = useUploadProductImage();
  const deleteImage = useDeleteProductImage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: product.name,
    description: product.description ?? "",
    price: product.price,
    lowStockThreshold: String(product.lowStockThreshold),
    isActive: product.isActive,
  });

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await uploadImage.mutateAsync({ productId: product.id, file });
      toast.success("Photo uploaded.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to upload photo.");
    }
  }

  async function handleRemoveImage(imageId: string) {
    try {
      await deleteImage.mutateAsync({ productId: product.id, imageId });
      toast.success("Photo removed.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove photo.");
    }
  }

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
        <div className="flex flex-col gap-1.5">
          <Label>Photos</Label>
          <div className="flex flex-wrap gap-2">
            {product.images.map((img) => {
              const url = resolveUploadUrl(img.url);
              return (
                <div key={img.id} className="relative size-16">
                  {url && <img src={url} alt="" className="size-16 rounded-md border object-cover" />}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(img.id)}
                    disabled={deleteImage.isPending}
                    aria-label="Remove photo"
                    className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              );
            })}
            {product.images.length < MAX_PRODUCT_IMAGES && (
              <button
                type="button"
                disabled={uploadImage.isPending}
                onClick={() => fileInputRef.current?.click()}
                className="flex size-16 items-center justify-center rounded-md border border-dashed text-muted-foreground hover:bg-accent disabled:opacity-50"
              >
                <ImageIcon className="size-5" />
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleImageSelected}
          />
          <p className="text-xs text-muted-foreground">Up to {MAX_PRODUCT_IMAGES}, JPEG/PNG/WEBP, 5MB each.</p>
        </div>
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
