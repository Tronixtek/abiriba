import { useLowStockProducts } from "@/hooks/useProducts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function LowStockPage() {
  const { data: products = [], isLoading } = useLowStockProducts();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Low Stock</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Current stock</TableHead>
            <TableHead className="text-right">Threshold</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!isLoading && products.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Nothing is low on stock right now.
              </TableCell>
            </TableRow>
          )}
          {products.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell className="text-muted-foreground">{p.sku}</TableCell>
              <TableCell className="text-right">{p.quantity}</TableCell>
              <TableCell className="text-right">{p.lowStockThreshold}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
