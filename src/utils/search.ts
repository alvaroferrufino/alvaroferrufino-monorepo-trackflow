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