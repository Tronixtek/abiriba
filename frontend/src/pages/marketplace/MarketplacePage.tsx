import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search } from "lucide-react";
import { api } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/brand/Logo";
import type { MarketplaceVendorResult } from "@/types";

const ALL_CITIES = "all";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatAddress(vendor: MarketplaceVendorResult): string {
  const streetLine = [vendor.streetNumber, vendor.street].filter(Boolean).join(" ");
  return [streetLine, vendor.city, vendor.state].filter(Boolean).join(", ");
}

export function MarketplacePage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [city, setCity] = useState(ALL_CITIES);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const { data: cities } = useQuery({
    queryKey: ["marketplace-cities"],
    queryFn: () => api.get<string[]>("/public/marketplace/cities"),
  });

  const trimmedQuery = submittedQuery.trim();
  const {
    data: results,
    isLoading,
    isFetched,
  } = useQuery({
    queryKey: ["marketplace-search", trimmedQuery, city, coords],
    queryFn: () => {
      const params = new URLSearchParams({ q: trimmedQuery });
      if (city !== ALL_CITIES) params.set("city", city);
      if (coords) {
        params.set("lat", String(coords.lat));
        params.set("lng", String(coords.lng));
      }
      return api.get<MarketplaceVendorResult[]>(`/public/marketplace/search?${params.toString()}`);
    },
    enabled: trimmedQuery.length >= 2,
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmittedQuery(query);
  }

  function handleUseLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link to="/" className="mb-6 inline-block">
        <Logo size="sm" />
      </Link>

      <h1 className="font-heading text-2xl font-semibold">Find products near you</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Search for a product and see which nearby shops currently stock it.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a product…"
          className="flex-1"
        />
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Any city" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CITIES}>Any city</SelectItem>
            {cities?.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit">
          <Search className="size-4" />
          Search
        </Button>
      </form>

      <div className="mt-2 flex items-center gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={handleUseLocation} disabled={locating}>
          <MapPin className="size-4" />
          {coords ? "Using your location" : locating ? "Getting location…" : "Use my location"}
        </Button>
        {!coords && <span className="text-xs text-muted-foreground">for distance-sorted results</span>}
      </div>

      <div className="mt-6 space-y-3">
        {submittedQuery.length > 0 && trimmedQuery.length < 2 && (
          <p className="text-sm text-muted-foreground">Keep typing — search needs at least 2 characters.</p>
        )}
        {isLoading && <p className="text-sm text-muted-foreground">Searching…</p>}
        {isFetched && results?.length === 0 && (
          <p className="text-sm text-muted-foreground">No nearby shops have that in stock right now.</p>
        )}
        {results?.map((vendor) => (
          <Card key={vendor.slug}>
            <CardContent className="flex items-start justify-between gap-4">
              <div>
                <Link to={`/store/${vendor.slug}`} className="font-heading font-medium hover:underline">
                  {vendor.businessName}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {formatAddress(vendor)}
                  {vendor.distanceKm != null && ` · ${vendor.distanceKm.toFixed(1)} km away`}
                </p>
                <ul className="mt-2 space-y-0.5 text-sm">
                  {vendor.products.map((p) => (
                    <li key={p.name}>
                      {p.name} — ₦{money(p.displayPrice)}
                    </li>
                  ))}
                </ul>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to={`/store/${vendor.slug}`}>Visit shop</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
