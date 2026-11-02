// ============================================================
// TrackFlow — Business Validation Functions
// ============================================================

import type {
  Product,
  Shipment,
  Carrier,
} from "../types/models";

// ------------------------------------------------------------
// Reusable validation result type
// ------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function isNotEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
  );
}

function isNumberBetween(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && value >= min && value <= max;
}

// ------------------------------------------------------------
// Product validation
// ------------------------------------------------------------

export function validateProduct(product: Partial<Product>): ValidationResult {
  const errors: string[] = [];

  if (product.name !== undefined && !isNotEmptyString(product.name)) {
    errors.push("Product name must be a non-empty string.");
  }

  if (product.sku !== undefined && !isNotEmptyString(product.sku)) {
    errors.push("Product SKU must be a non-empty string.");
  }

  if (product.weightKg !== undefined && !isPositiveNumber(product.weightKg)) {
    errors.push("Product weight must be a number greater than 0.");
  }

  if (product.unitCostUSD !== undefined && !isPositiveNumber(product.unitCostUSD)) {
    errors.push("Product price must be a number greater than 0.");
  }

  if (product.stockQuantity !== undefined && !isNonNegativeInteger(product.stockQuantity)) {
    errors.push("Product stock must be a non-negative integer.");
  }

  if (product.minStockThreshold !== undefined && !isNonNegativeInteger(product.minStockThreshold)) {
    errors.push("Product min stock threshold must be a non-negative integer.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ------------------------------------------------------------
// Shipment validation
// ------------------------------------------------------------

export function validateShipment(shipment: Partial<Shipment>): ValidationResult {
  const errors: string[] = [];

  if (shipment.id !== undefined && !isNotEmptyString(shipment.id)) {
    errors.push("Shipment ID must be a non-empty string.");
  }

  if (shipment.origin !== undefined && !isNotEmptyString(shipment.origin)) {
    errors.push("Shipment origin must be a non-empty string.");
  }

  if (shipment.destination !== undefined && !shipment.destination) {
    errors.push("Shipment destination must be a non-empty object.");
  }

  if (shipment.carrier !== undefined && shipment.carrier !== null && !isNotEmptyString(shipment.carrier)) {
    errors.push("Shipment carrier ID must be a non-empty string.");
  }

  if (shipment.quantity !== undefined && !isPositiveNumber(shipment.quantity)) {
    errors.push("Shipment quantity must be a number greater than 0.");
  }

  if (shipment.declaredValueUSD !== undefined && !isPositiveNumber(shipment.declaredValueUSD)) {
    errors.push("Shipment cost must be a number greater than 0.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ------------------------------------------------------------
// Carrier validation
// ------------------------------------------------------------

export function validateCarrier(carrier: Partial<Carrier>): ValidationResult {
  const errors: string[] = [];

  if (carrier.id !== undefined && !isNotEmptyString(carrier.id)) {
    errors.push("Carrier ID must be a non-empty string.");
  }

  if (carrier.name !== undefined && !isNotEmptyString(carrier.name)) {
    errors.push("Carrier name must be a non-empty string.");
  }

  if (carrier.maxWeightKg !== undefined && !isPositiveNumber(carrier.maxWeightKg)) {
    errors.push("Carrier max weight capacity must be a number greater than 0.");
  }

  if (carrier.baseRateUSD !== undefined && !isPositiveNumber(carrier.baseRateUSD)) {
    errors.push("Carrier base tariff must be a number greater than 0.");
  }

  if (carrier.onTimeRate !== undefined && !isNumberBetween(carrier.onTimeRate, 0, 100)) {
    errors.push("Carrier on-time delivery rate must be between 0 and 100.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}