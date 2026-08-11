import { useState } from "react";
import { useSalesReport } from "@/hooks/useReports";
import type { SalesReport } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseDateOnly(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** A single human-readable label for the report's period, e.g. "Today",
 * "August 2026", or "Aug 4 – Aug 10, 2026" — used instead of showing raw
 * ISO from/to dates (which look like a bug when they're the same date). */
function formatPeriod(report: SalesReport): string {
  const from = parseDateOnly(report.from);

  if (report.range === "day") {
    const isToday = report.from === new Date().toISOString().slice(0, 10);
    return isToday ? "Today" : from.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  }

  if (report.range === "month") {
    return from.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }

  const to = parseDateOnly(report.to);
  const sameYear = from.getFullYear() === to.getFullYear();
  const fromLabel = from.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const toLabel = to.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
  return `${fromLabel} – ${toLabel}, ${to.getFullYear()}`;
}

export function ReportsPage() {
  const [range, setRange] = useState<"day" | "week" | "month">("day");
  const { data: report, isLoading } = useSalesReport(range);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sales Reports</h1>
          {report && <p className="text-sm text-muted-foreground">{formatPeriod(report)}</p>}
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as typeof range)}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}

      {!isLoading && report && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Revenue</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {money(report.totalRevenue)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Items sold</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{report.itemsSold}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Orders</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{report.orderCount}</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top products</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.topProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No sales in this period.
                      </TableCell>
                    </TableRow>
                  )}
                  {report.topProducts.map((p) => (
                    <TableRow key={p.productId}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="text-right">{p.qty}</TableCell>
                      <TableCell className="text-right">{money(p.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
