import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/apiClient";
import { useTenantSettings, useUpdateTenantSettings } from "@/hooks/useTenantSettings";
import { NIGERIAN_CITIES } from "@/lib/nigerianCities";
import { NIGERIAN_STATES } from "@/lib/nigerianStates";
import { NIGERIAN_LGAS } from "@/lib/nigerianLgas";

const OTHER_CITY = "__other__";

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function MarketplacePage() {
  const { data: settings, isLoading } = useTenantSettings();
  const update = useUpdateTenantSettings();

  const [country, setCountry] = useState("Nigeria");
  const [stateVal, setStateVal] = useState("");
  const [lga, setLga] = useState("");
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [useOtherCity, setUseOtherCity] = useState(false);
  const [locating, setLocating] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!settings) return;
    setCountry(settings.country ?? "Nigeria");
    setStateVal(settings.state ?? "");
    setLga(settings.lga ?? "");
    const settledCity = settings.city ?? "";
    setCity(settledCity);
    setUseOtherCity(settledCity !== "" && !NIGERIAN_CITIES.includes(settledCity));
    setStreet(settings.street ?? "");
    setStreetNumber(settings.streetNumber ?? "");
  }, [settings]);

  const lgaOptions = stateVal ? (NIGERIAN_LGAS[stateVal] ?? []) : [];

  function handleStateSelect(value: string) {
    setStateVal(value);
    const options = NIGERIAN_LGAS[value] ?? [];
    if (!options.includes(lga)) {
      setLga("");
    }
  }

  function handleCitySelect(value: string) {
    if (value === OTHER_CITY) {
      setUseOtherCity(true);
      setCity("");
    } else {
      setUseOtherCity(false);
      setCity(value);
    }
  }

  // Enabling only needs state/LGA/city — coordinates come either from device
  // GPS (if shared) or from geocoding this address server-side on save, so
  // the frontend doesn't need to know in advance which one will supply them.
  const hasAddress = stateVal.trim() !== "" && lga.trim() !== "" && city.trim() !== "";
  const canEnable = hasAddress;
  const hasUnsavedChanges =
    pendingCoords !== null ||
    country.trim() !== (settings?.country ?? "Nigeria") ||
    stateVal.trim() !== (settings?.state ?? "") ||
    lga.trim() !== (settings?.lga ?? "") ||
    city.trim() !== (settings?.city ?? "") ||
    street.trim() !== (settings?.street ?? "") ||
    streetNumber.trim() !== (settings?.streetNumber ?? "");

  function handleShareLocation() {
    if (!navigator.geolocation) {
      toast.error("Your browser doesn't support location sharing.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setPendingCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        toast.success("Location captured — save to apply it.");
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error(
            "Location permission denied. Check your browser's site settings (and on macOS, System Settings → Privacy & Security → Location Services) and allow it for this site. You can also just fill in your address below instead."
          );
        } else if (err.code === err.TIMEOUT) {
          toast.error("Getting your location timed out. Try again — this sometimes needs a second attempt.");
        } else {
          toast.error(
            "Your device couldn't determine its location right now (position unavailable). Try again, or just fill in your address below instead."
          );
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSave(nextEnabled: boolean) {
    try {
      const result = await update.mutateAsync({
        marketplaceEnabled: nextEnabled,
        country: country.trim() || undefined,
        state: stateVal.trim() || undefined,
        lga: lga.trim() || undefined,
        city: city.trim() || undefined,
        street: street.trim() || undefined,
        streetNumber: streetNumber.trim() || undefined,
        latitude: pendingCoords?.latitude,
        longitude: pendingCoords?.longitude,
      });
      setPendingCoords(null);
      if (result.geocodeWarning) {
        toast.warning(
          "Saved, but we couldn't pin your exact address on the map. Try adding more detail (like a street name), or share your device location instead."
        );
      } else {
        toast.success("Marketplace settings saved.");
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save settings.");
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h1 className="font-heading text-xl font-semibold">Marketplace</h1>
        <p className="text-sm text-muted-foreground">
          List your shop so nearby customers searching for a product can find you.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="streetNumber">Street number</Label>
              <Input
                id="streetNumber"
                value={streetNumber}
                onChange={(e) => setStreetNumber(e.target.value)}
                placeholder="e.g. 12B"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="street">Street</Label>
              <Input
                id="street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="e.g. Real Road"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="state">State</Label>
            <Select value={stateVal} onValueChange={handleStateSelect}>
              <SelectTrigger id="state" className="w-full">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {NIGERIAN_STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lga">LGA</Label>
            <Select value={lga} onValueChange={setLga} disabled={!stateVal}>
              <SelectTrigger id="lga" className="w-full">
                <SelectValue placeholder={stateVal ? "Select LGA" : "Select a state first"} />
              </SelectTrigger>
              <SelectContent>
                {lgaOptions.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">City</Label>
            <Select value={useOtherCity ? OTHER_CITY : city} onValueChange={handleCitySelect}>
              <SelectTrigger id="city" className="w-full">
                <SelectValue placeholder="Select your city" />
              </SelectTrigger>
              <SelectContent>
                {NIGERIAN_CITIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
                <SelectItem value={OTHER_CITY}>Other (type manually)</SelectItem>
              </SelectContent>
            </Select>
            {useOtherCity && (
              <Input
                className="mt-1"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Type your city/town"
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="country">Country</Label>
            <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exact location (optional but recommended)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            Your address above is used to find your shop's location automatically. Sharing your device's exact
            location instead gives more accurate distance results for customers.
          </p>
          <Button type="button" variant="outline" onClick={handleShareLocation} disabled={locating}>
            {locating ? "Getting location…" : "Share my shop's exact location"}
          </Button>
          {pendingCoords ? (
            <p className="text-xs text-muted-foreground">Location captured — save below to apply it.</p>
          ) : settings?.locationUpdatedAt ? (
            <p className="text-xs text-muted-foreground">
              Location saved — captured {timeAgo(settings.locationUpdatedAt)}. Moved shops? Tap the button again.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">No exact location shared yet — your address will be used instead.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={() => handleSave(settings?.marketplaceEnabled ?? false)}
          disabled={update.isPending || !hasUnsavedChanges}
        >
          {update.isPending ? "Saving…" : "Save address"}
        </Button>
        {hasUnsavedChanges && <span className="text-xs text-muted-foreground">You have unsaved changes.</span>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Marketplace listing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings?.marketplaceEnabled ?? false}
              disabled={update.isPending || hasUnsavedChanges || (!canEnable && !(settings?.marketplaceEnabled ?? false))}
              onChange={(e) => handleSave(e.target.checked)}
            />
            Show my shop in marketplace search
          </label>
          {hasUnsavedChanges ? (
            <p className="text-xs text-muted-foreground">Save your address above first, then you can toggle this.</p>
          ) : (
            !canEnable &&
            !settings?.marketplaceEnabled && (
              <p className="text-xs text-muted-foreground">Add your state, LGA, and city before enabling this.</p>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
