import { useState } from "react";
import { useCreateCustomer, useCustomers } from "@/hooks/useCustomers";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ApiError } from "@/lib/apiClient";

export function CustomersPage() {
  const { data: customers = [], isLoading } = useCustomers();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <AddCustomerDialog />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!isLoading && customers.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                No customers yet.
              </TableCell>
            </TableRow>
          )}
          {customers.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AddCustomerDialog() {
  const [open, setOpen] = useState(false);
  const createCustomer = useCreateCustomer();
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    try {
      await createCustomer.mutateAsync({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });
      toast.success("Customer added.");
      setOpen(false);
      setForm({ name: "", email: "", phone: "" });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add customer.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add customer</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add customer</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email (optional — needed for email receipts)</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={createCustomer.isPending}>
            {createCustomer.isPending ? "Adding..." : "Add customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
