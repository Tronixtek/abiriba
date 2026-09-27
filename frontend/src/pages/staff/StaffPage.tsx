import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useCreateStaffUser, useStaff } from "@/hooks/useStaff";
import type { Role } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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

export function StaffPage() {
  const { data: staff = [], isLoading } = useStaff();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Staff</h1>
        <AddStaffDialog />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!isLoading && staff.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                No staff yet.
              </TableCell>
            </TableRow>
          )}
          {staff.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell className="text-muted-foreground">{s.email}</TableCell>
              <TableCell>
                <Badge variant={s.role === "OWNER" ? "default" : "secondary"}>{s.role}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AddStaffDialog() {
  const { role: callerRole } = useAuth();
  const [open, setOpen] = useState(false);
  const createStaffUser = useCreateStaffUser();
  const [form, setForm] = useState<{
    name: string;
    email: string;
    password: string;
    role: Extract<Role, "MANAGER" | "STAFF">;
  }>({
    name: "",
    email: "",
    password: "",
    role: "STAFF",
  });

  async function handleSubmit() {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 6) {
      toast.error("Name, email, and a password of at least 6 characters are required.");
      return;
    }
    try {
      await createStaffUser.mutateAsync({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      toast.success("Staff account created.");
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: "STAFF" });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create staff account.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add staff</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add staff account</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Initial password</Label>
            <PasswordInput
              id="password"
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Role</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={form.role === "STAFF" ? "default" : "outline"}
                size="sm"
                onClick={() => setForm({ ...form, role: "STAFF" })}
              >
                Staff
              </Button>
              {callerRole === "OWNER" && (
                <Button
                  type="button"
                  variant={form.role === "MANAGER" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setForm({ ...form, role: "MANAGER" })}
                >
                  Manager
                </Button>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={createStaffUser.isPending}>
            {createStaffUser.isPending ? "Creating..." : "Create account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
