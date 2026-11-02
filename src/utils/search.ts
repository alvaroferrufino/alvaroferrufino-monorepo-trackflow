// ============================================================
// TrackFlow — Search & Filter Functions
// ============================================================

import type {
  Product,
  Shipment,
  Carrier,
} from "../types/models";

// ------------------------------------------------------------
// Product search
// ------------------------------------------------------------

/**
 * Finds a product by its SKU (exact match).
 * Returns the product or `undefined` if not found.
 */
export function findProductBySku(
  products: Product[],
  sku: string,
): Product | undefined {
  return products.find((product) => product.sku === sku);
}

/**
 * Performs a binary search on a list of products sorted by SKU (ascending).
 *
 * @param products - Array of products **already sorted** by `sku` (ascending).
 * @param targetSku - The SKU to search for.
 * @returns The index of the product if found, or `-1` if not found or the array is empty.
 */
export function binarySearchBySku(
  products: Product[],
  targetSku: string,
): number {
  if (products.length === 0) {
    return -1;
  }

  let left = 0;
  let right = products.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midSku = products[mid].sku;

    if (midSku === targetSku) {
      return mid;
    }

    if (midSku < targetSku) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1;
}

// ------------------------------------------------------------
// Shipment search
// ------------------------------------------------------------

/**
 * Searches shipments whose destination city partially matches
 * the given query (case-insensitive).
 *
 * @param destinationQuery - Text to search against the destination city.
 */
export function searchShipmentsByDestination(
  shipments: Shipment[],
  destinationQuery: string,
): Shipment[] {
  const query = destinationQuery.toLowerCase();

  return shipments.filter((shipment) =>
    shipment.destination.city.toLowerCase().includes(query),
  );
}

// ------------------------------------------------------------
// Carrier filter
// ------------------------------------------------------------

/**
 * Filters carriers whose max weight capacity is greater than
 * or equal to the given minimum weight.
 *
 * @param minWeight - Minimum weight in kilograms.
 */
export function filterCarriersByMinCapacity(
  carriers: Carrier[],
  minWeight: number,
): Carrier[] {
  return carriers.filter(
    (carrier) => carrier.maxWeightKg >= minWeight,
  );
}