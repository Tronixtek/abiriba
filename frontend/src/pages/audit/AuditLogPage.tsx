import { useAuditLog } from "@/hooks/useAuditLog";
import type { StockAdjustment } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function reasonVariant(reason: StockAdjustment["reason"]): "default" | "secondary" | "destructive" {
  if (reason === "SALE") return "default";
  return "secondary";
}

export function AuditLogPage() {
  const { data: adjustments = [], isLoading } = useAuditLog();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Stock Adjustment Audit Log</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="text-right">Change</TableHead>
            <TableHead>Note</TableHead>
            <TableHead>When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!isLoading && adjustments.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No stock movements recorded yet.
              </TableCell>
            </TableRow>
          )}
          {adjustments.map((a) => (
            <TableRow key={a.id}>
              <TableCell>{a.product.name}</TableCell>
              <TableCell>
                <Badge variant={reasonVariant(a.reason)}>{a.reason}</Badge>
              </TableCell>
              <TableCell className="text-right">{a.delta > 0 ? `+${a.delta}` : a.delta}</TableCell>
              <TableCell className="text-muted-foreground">{a.note || "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(a.createdAt).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
