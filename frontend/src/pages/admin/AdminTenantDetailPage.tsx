import { Link, useParams } from "react-router-dom";
import { useAdminTenantDetail } from "@/hooks/admin/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function money(n: number) {
  return `₦${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function AdminTenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { data: tenant, isLoading } = useAdminTenantDetail(tenantId);

  if (isLoading) return <p className="text-muted-foreground">Loading...</p>;
  if (!tenant) return <p className="text-muted-foreground">Business not found.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link to="/admin/businesses" className="text-sm text-muted-foreground hover:underline">
          ← All businesses
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{tenant.businessName}</h1>
        <p className="text-sm text-muted-foreground">
          Joined {new Date(tenant.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Transactions</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{tenant.transactionCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Revenue</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{money(tenant.gmv)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Paid to vendor</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{money(tenant.vendorPayouts)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Platform fee</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{money(tenant.platformRevenue)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff ({tenant.users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenant.users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>
                    {u.isActive ? <Badge variant="secondary">Active</Badge> : <Badge variant="destructive">Inactive</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent orders</CardTitle>
        </CardHeader>
        <CardContent>
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
              {tenant.recentOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No orders yet.
                  </TableCell>
                </TableRow>
              )}
              {tenant.recentOrders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>{o.customerName ?? "Walk-in"}</TableCell>
                  <TableCell>{o.status}</TableCell>
                  <TableCell className="text-right">{money(Number(o.total))}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(o.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent stock activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenant.recentStockAdjustments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No stock activity yet.
                  </TableCell>
                </TableRow>
              )}
              {tenant.recentStockAdjustments.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.product.name}</TableCell>
                  <TableCell>{s.reason}</TableCell>
                  <TableCell className="text-right">{s.delta > 0 ? `+${s.delta}` : s.delta}</TableCell>
                  <TableCell className="text-muted-foreground">{s.user?.name ?? "Online payment"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(s.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
