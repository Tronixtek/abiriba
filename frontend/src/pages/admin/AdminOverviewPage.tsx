import { useState } from "react";
import { useAdminStats, useAdminTrends } from "@/hooks/admin/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendChart } from "@/components/charts/TrendChart";

function money(n: number) {
  return `₦${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const RANGE_OPTIONS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
] as const;

export function AdminOverviewPage() {
  const { data: stats, isLoading } = useAdminStats();
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const { data: trends = [] } = useAdminTrends(Number(range));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Platform overview</h1>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}

      {stats && (
        <>
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Total revenue generated for Abiriba</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{money(stats.platformRevenue)}</CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Businesses</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{stats.tenantCount}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Active users</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{stats.activeUserCount}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Transactions</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{stats.transactionCount}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Items sold</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{stats.itemsSold}</CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Gross merchandise value</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{money(stats.gmv)}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Paid out to vendors</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{money(stats.vendorPayouts)}</CardContent>
            </Card>
          </div>
        </>
      )}

      <div className="mt-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Growth trends</h2>
        <Tabs value={range} onValueChange={(v) => setRange(v as typeof range)}>
          <TabsList>
            {RANGE_OPTIONS.map((o) => (
              <TabsTrigger key={o.value} value={o.value}>
                {o.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TrendChart
          title="New businesses"
          data={trends.map((t) => ({ date: t.date, value: t.newTenants }))}
        />
        <TrendChart
          title="Transactions"
          data={trends.map((t) => ({ date: t.date, value: t.transactions }))}
        />
        <TrendChart
          title="Platform revenue"
          data={trends.map((t) => ({ date: t.date, value: t.platformRevenue }))}
          formatValue={money}
        />
      </div>
    </div>
  );
}
