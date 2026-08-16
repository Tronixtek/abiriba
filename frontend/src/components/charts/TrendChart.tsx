import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface TrendPoint {
  date: string; // "YYYY-MM-DD"
  value: number;
}

const WIDTH = 600;
const HEIGHT = 180;
const PADDING = { top: 12, right: 12, bottom: 24, left: 8 };

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const normalized = max / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function formatDateShort(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function TrendChart({
  title,
  data,
  formatValue = (n) => n.toLocaleString(),
}: {
  title: string;
  data: TrendPoint[];
  formatValue?: (n: number) => string;
}) {
  const [showTable, setShowTable] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const maxValue = niceMax(Math.max(...data.map((d) => d.value), 0));

  const points = useMemo(
    () =>
      data.map((d, i) => {
        const x = PADDING.left + (data.length === 1 ? plotWidth / 2 : (i / (data.length - 1)) * plotWidth);
        const y = PADDING.top + plotHeight - (maxValue === 0 ? 0 : (d.value / maxValue) * plotHeight);
        return { ...d, x, y };
      }),
    [data, maxValue, plotWidth, plotHeight]
  );

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? 0} ${PADDING.top + plotHeight} L ${points[0]?.x ?? 0} ${PADDING.top + plotHeight} Z`;

  const gridlineValues = [0, maxValue / 2, maxValue];
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const last = points[points.length - 1];
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || points.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const relativeX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relativeX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setShowTable((v) => !v)}>
          {showTable ? "Show chart" : "View as table"}
        </Button>
      </CardHeader>
      <CardContent>
        <p className="mb-2 text-2xl font-semibold">{formatValue(total)}</p>

        {showTable ? (
          <div className="max-h-48 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d) => (
                  <TableRow key={d.date}>
                    <TableCell>{formatDateShort(d.date)}</TableCell>
                    <TableCell className="text-right">{formatValue(d.value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="relative">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="w-full touch-none"
              onPointerMove={handlePointerMove}
              onPointerLeave={() => setHoverIndex(null)}
            >
              {gridlineValues.map((v) => {
                const y = PADDING.top + plotHeight - (maxValue === 0 ? 0 : (v / maxValue) * plotHeight);
                return (
                  <g key={v}>
                    <line
                      x1={PADDING.left}
                      x2={WIDTH - PADDING.right}
                      y1={y}
                      y2={y}
                      stroke="var(--border)"
                      strokeWidth={1}
                    />
                    <text x={0} y={y - 3} fontSize={10} fill="var(--muted-foreground)">
                      {Math.round(v).toLocaleString()}
                    </text>
                  </g>
                );
              })}

              {points.length > 1 && (
                <path d={areaPath} fill="var(--chart-1)" fillOpacity={0.1} stroke="none" />
              )}
              {points.length > 1 && (
                <path d={linePath} fill="none" stroke="var(--chart-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              )}

              {last && (
                <>
                  <circle cx={last.x} cy={last.y} r={4} fill="var(--chart-1)" stroke="var(--card)" strokeWidth={2} />
                  <text
                    x={last.x}
                    y={last.y - 10}
                    fontSize={11}
                    fontWeight={600}
                    textAnchor="end"
                    fill="var(--foreground)"
                  >
                    {formatValue(last.value)}
                  </text>
                </>
              )}

              {hovered && (
                <>
                  <line
                    x1={hovered.x}
                    x2={hovered.x}
                    y1={PADDING.top}
                    y2={PADDING.top + plotHeight}
                    stroke="var(--muted-foreground)"
                    strokeWidth={1}
                  />
                  <circle cx={hovered.x} cy={hovered.y} r={4} fill="var(--chart-1)" stroke="var(--card)" strokeWidth={2} />
                </>
              )}

              <text x={points[0]?.x ?? 0} y={HEIGHT - 6} fontSize={10} fill="var(--muted-foreground)" textAnchor="start">
                {data[0] ? formatDateShort(data[0].date) : ""}
              </text>
              <text x={WIDTH - PADDING.right} y={HEIGHT - 6} fontSize={10} fill="var(--muted-foreground)" textAnchor="end">
                {data[data.length - 1] ? formatDateShort(data[data.length - 1].date) : ""}
              </text>
            </svg>

            {hovered && (
              <div
                className={cn(
                  "pointer-events-none absolute top-0 -translate-x-1/2 rounded-md border bg-popover px-2 py-1 text-xs shadow-sm",
                  hovered.x / WIDTH > 0.8 ? "-translate-x-full" : hovered.x / WIDTH < 0.2 ? "translate-x-0" : "-translate-x-1/2"
                )}
                style={{ left: `${(hovered.x / WIDTH) * 100}%` }}
              >
                <p className="text-muted-foreground">{formatDateShort(hovered.date)}</p>
                <p className="font-semibold text-popover-foreground">{formatValue(hovered.value)}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
