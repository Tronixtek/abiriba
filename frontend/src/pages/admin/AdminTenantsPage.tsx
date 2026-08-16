import { Link } from "react-router-dom";
import { useAdminTenants } from "@/hooks/admin/useAdminData";
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

export function AdminTenantsPage() {
  const { data: tenants = [], isLoading } = useAdminTenants();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Businesses</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead className="text-right">Users</TableHead>
            <TableHead className="text-right">Products</TableHead>
            <TableHead className="text-right">Orders</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Platform fee</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!isLoading && tenants.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                No businesses yet.
              </TableCell>
            </TableRow>
          )}
          {tenants.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">
                <Link to={`/admin/businesses/${t.id}`} className="hover:underline">
                  {t.businessName}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {t.ownerName ? `${t.ownerName} (${t.ownerEmail})` : "—"}
              </TableCell>
              <TableCell className="text-right">{t.userCount}</TableCell>
              <TableCell className="text-right">{t.productCount}</TableCell>
              <TableCell className="text-right">{t.orderCount}</TableCell>
              <TableCell className="text-right">{money(t.gmv)}</TableCell>
              <TableCell className="text-right">{money(t.platformRevenue)}</TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(t.createdAt).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
