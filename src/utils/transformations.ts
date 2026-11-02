// ============================================================
// TrackFlow — Data Transformation & Aggregation Functions
// ============================================================

import type {
  Product,
  Shipment,
  Carrier,
} from "../types/models";

// ------------------------------------------------------------
// Product aggregation
// ------------------------------------------------------------

/**
 * Calculates the total inventory value by multiplying
 * unit cost by stock quantity for every product.
 */
export function calculateTotalInventoryValue(products: Product[]): number {
  return products.reduce(
    (total, product) => total + product.unitCostUSD * product.stockQuantity,
    0,
  );
}

// ------------------------------------------------------------
// Shipment aggregation
// ------------------------------------------------------------

/**
 * Summarises shipment costs: total, average, and count.
 *
 * Returns zero values when the list is empty to avoid
 * division by zero.
 */
export function summarizeShipmentCosts(
  shipments: Shipment[],
): { totalCost: number; averageCost: number; count: number } {
  if (shipments.length === 0) {
    return { totalCost: 0, averageCost: 0, count: 0 };
  }

  const totalCost = shipments.reduce(
    (sum, shipment) => sum + shipment.declaredValueUSD,
    0,
  );

  return {
    totalCost,
    averageCost: totalCost / shipments.length,
    count: shipments.length,
  };
}

// ------------------------------------------------------------
// Carrier transformation
// ------------------------------------------------------------

/**
 * Extracts the names of all carriers into a plain string array.
 */
export function mapCarrierNames(carriers: Carrier[]): string[] {
  return carriers.map((carrier) => carrier.name);
}