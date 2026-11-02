// ============================================================
// TrackFlow — Immutable Collection Operations
// ============================================================

import type {
  Product,
  Shipment,
  Carrier,
} from "../types/models";

// ------------------------------------------------------------
// Product operations
// ------------------------------------------------------------

/**
 * Returns a new array containing only the products whose stock
 * is less than or equal to their minimum stock threshold.
 *
 * The original array is NOT mutated.
 */
export function filterLowStockProducts(products: Product[]): Product[] {
  return products.filter(
    (product) => product.stockQuantity <= product.minStockThreshold,
  );
}

// ------------------------------------------------------------
// Shipment operations
// ------------------------------------------------------------

/**
 * Returns a **new** array sorted by declared value (cost),
 * without mutating the original.
 *
 * @param order - "asc" (default) for ascending, "desc" for descending.
 */
export function sortShipmentsByCost(
  shipments: Shipment[],
  order: "asc" | "desc" = "asc",
): Shipment[] {
  const sorted = [...shipments];

  sorted.sort((a, b) => {
    const diff = a.declaredValueUSD - b.declaredValueUSD;
    return order === "asc" ? diff : -diff;
  });

  return sorted;
}

// ------------------------------------------------------------
// Carrier operations
// ------------------------------------------------------------

/**
 * Returns a new array containing only the carriers that are active.
 *
 * The original array is NOT mutated.
 */
export function getActiveCarriers(carriers: Carrier[]): Carrier[] {
  return carriers.filter((carrier) => carrier.active);
}