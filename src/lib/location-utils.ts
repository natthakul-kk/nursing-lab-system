/**
 * Utilities for formatting item and asset storage locations cleanly
 * for on-site staff pick guidance (Pick-to-Light / Location Finder)
 */

export interface LocationInfo {
  location?: string | null;
  storageLocation?: {
    code?: string;
    name?: string;
    roomName?: string | null;
    floor?: string | null;
    building?: string | null;
  } | null;
}

export function formatLocationDisplay(target?: LocationInfo | null, fallback = 'ห้องปฏิบัติการพยาบาล'): string {
  if (!target) return fallback;

  // 1. Structured StorageLocation object
  if (target.storageLocation) {
    const sl = target.storageLocation;
    const parts: string[] = [];

    // Main location / Cabinet / Shelf
    if (sl.name) {
      parts.push(sl.name);
    } else if (sl.code) {
      parts.push(`จุดเก็บ [${sl.code}]`);
    }

    // Room / Floor
    const subParts: string[] = [];
    if (sl.roomName) subParts.push(sl.roomName);
    else if (sl.floor) subParts.push(sl.floor);

    if (subParts.length > 0) {
      parts.push(`(${subParts.join(', ')})`);
    }

    // Additional specific location note if provided on the asset/item itself
    if (target.location && target.location.trim() && !parts.join(' ').includes(target.location.trim())) {
      parts.push(`- ${target.location.trim()}`);
    }

    if (parts.length > 0) {
      return parts.join(' ').trim();
    }
  }

  // 2. Direct location text string
  if (target.location && target.location.trim()) {
    return target.location.trim();
  }

  return fallback;
}
