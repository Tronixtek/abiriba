import { prisma } from "../../db/prismaClient.js";
import { AppError } from "../../utils/AppError.js";
import { geocodeAddress } from "../../utils/geo.js";

const SETTINGS_SELECT = {
  marketplaceEnabled: true,
  country: true,
  state: true,
  lga: true,
  city: true,
  street: true,
  streetNumber: true,
  latitude: true,
  longitude: true,
  locationUpdatedAt: true,
} as const;

export async function getMarketplaceSettings(tenantId: string) {
  return prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: SETTINGS_SELECT });
}

function pick(paramVal: string | undefined, currentVal: string | null): string | undefined {
  return paramVal !== undefined ? paramVal : (currentVal ?? undefined);
}

export async function updateMarketplaceSettings(params: {
  tenantId: string;
  marketplaceEnabled: boolean;
  country?: string;
  state?: string;
  lga?: string;
  city?: string;
  street?: string;
  streetNumber?: string;
  latitude?: number;
  longitude?: number;
}) {
  const current = await prisma.tenant.findUniqueOrThrow({
    where: { id: params.tenantId },
    select: {
      country: true,
      state: true,
      lga: true,
      city: true,
      street: true,
      streetNumber: true,
      latitude: true,
      longitude: true,
    },
  });

  const sharingLocationNow = params.latitude !== undefined && params.longitude !== undefined;
  const addressFieldsChanged =
    (params.country !== undefined && params.country !== current.country) ||
    (params.state !== undefined && params.state !== current.state) ||
    (params.lga !== undefined && params.lga !== current.lga) ||
    (params.city !== undefined && params.city !== current.city) ||
    (params.street !== undefined && params.street !== current.street) ||
    (params.streetNumber !== undefined && params.streetNumber !== current.streetNumber);

  const effectiveState = pick(params.state, current.state);
  const effectiveLga = pick(params.lga, current.lga);
  const effectiveCity = pick(params.city, current.city);
  const hasAddress = Boolean(effectiveState && effectiveLga && effectiveCity);
  const missingCoords = current.latitude === null || current.longitude === null;

  let latitude: number | undefined;
  let longitude: number | undefined;
  let locationUpdatedAt: Date | undefined;
  let geocodeWarning = false;

  if (sharingLocationNow) {
    // Device GPS is strictly more accurate than a geocoded address — skip
    // geocoding entirely when it's available.
    latitude = params.latitude;
    longitude = params.longitude;
    locationUpdatedAt = new Date();
  } else if (hasAddress && (addressFieldsChanged || missingCoords)) {
    // Re-attempt even when nothing changed this save, as long as we still
    // don't have coordinates on file — otherwise a vendor whose address
    // failed to geocode once (e.g. before a fix to this logic, or a
    // transient Nominatim hiccup) has no way to retry short of editing and
    // reverting a field.
    const mergedCountry = pick(params.country, current.country) ?? "Nigeria";
    const mergedState = pick(params.state, current.state);
    const mergedLga = pick(params.lga, current.lga);
    const mergedCity = pick(params.city, current.city);
    const mergedStreet = pick(params.street, current.street);
    const mergedStreetNumber = pick(params.streetNumber, current.streetNumber);

    // Nominatim (free-text geocoding) rarely resolves a full, informal
    // Nigerian street address in one shot — house numbers and compound
    // names usually aren't mapped at that precision. Try progressively
    // coarser candidates (full address → drop street → city/state only →
    // state only) until one resolves, rather than giving up after the
    // first, most-specific attempt fails.
    const candidates = Array.from(
      new Set(
        [
          [mergedStreetNumber, mergedStreet, mergedCity, mergedLga, mergedState, mergedCountry],
          [mergedCity, mergedLga, mergedState, mergedCountry],
          [mergedCity, mergedState, mergedCountry],
          [mergedState, mergedCountry],
        ]
          .map((parts) => parts.filter(Boolean).join(", "))
          .filter(Boolean)
      )
    );

    for (const candidate of candidates) {
      const geocoded = await geocodeAddress(candidate);
      if (geocoded) {
        latitude = geocoded.latitude;
        longitude = geocoded.longitude;
        locationUpdatedAt = new Date();
        break;
      }
    }
    if (latitude === undefined) {
      geocodeWarning = true;
    }
  }

  const effectiveLat = latitude ?? (current.latitude !== null ? Number(current.latitude) : undefined);
  const effectiveLng = longitude ?? (current.longitude !== null ? Number(current.longitude) : undefined);
  const hasCoords = effectiveLat !== undefined && effectiveLng !== undefined;

  if (params.marketplaceEnabled && !(hasAddress && hasCoords)) {
    throw new AppError(
      400,
      "Add your state, LGA, and city, and either share your device location or a full address, before enabling the marketplace."
    );
  }

  const updated = await prisma.tenant.update({
    where: { id: params.tenantId },
    data: {
      marketplaceEnabled: params.marketplaceEnabled,
      country: params.country,
      state: params.state,
      lga: params.lga,
      city: params.city,
      street: params.street,
      streetNumber: params.streetNumber,
      latitude,
      longitude,
      locationUpdatedAt,
    },
    select: SETTINGS_SELECT,
  });

  return { ...updated, geocodeWarning };
}
