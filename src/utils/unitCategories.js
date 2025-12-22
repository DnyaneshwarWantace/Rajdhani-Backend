/**
 * Unit Categories and Validation
 * Defines allowed units for different measurement types
 */

// Weight Units
export const WEIGHT_UNITS = [
  // Metric
  { value: 'mg', label: 'Milligram (mg)', category: 'metric', type: 'weight' },
  { value: 'g', label: 'Gram (g)', category: 'metric', type: 'weight' },
  { value: 'kg', label: 'Kilogram (kg)', category: 'metric', type: 'weight' },
  { value: 'ton', label: 'Ton (ton)', category: 'metric', type: 'weight' },
  { value: 'quintal', label: 'Quintal (qtl)', category: 'metric', type: 'weight' },

  // Imperial
  { value: 'oz', label: 'Ounce (oz)', category: 'imperial', type: 'weight' },
  { value: 'lb', label: 'Pound (lb)', category: 'imperial', type: 'weight' },

  // Specialized
  { value: 'gsm', label: 'GSM (g/m²)', category: 'specialized', type: 'weight' },
];

// Length Units
export const LENGTH_UNITS = [
  // Metric
  { value: 'mm', label: 'Millimeter (mm)', category: 'metric', type: 'length' },
  { value: 'cm', label: 'Centimeter (cm)', category: 'metric', type: 'length' },
  { value: 'm', label: 'Meter (m)', category: 'metric', type: 'length' },
  { value: 'km', label: 'Kilometer (km)', category: 'metric', type: 'length' },

  // Imperial
  { value: 'in', label: 'Inch (in)', category: 'imperial', type: 'length' },
  { value: 'ft', label: 'Foot (ft)', category: 'imperial', type: 'length' },
  { value: 'yd', label: 'Yard (yd)', category: 'imperial', type: 'length' },
  { value: 'mile', label: 'Mile (mile)', category: 'imperial', type: 'length' },
];

// Width Units (same as length but separate for clarity)
export const WIDTH_UNITS = [
  // Metric
  { value: 'mm', label: 'Millimeter (mm)', category: 'metric', type: 'width' },
  { value: 'cm', label: 'Centimeter (cm)', category: 'metric', type: 'width' },
  { value: 'm', label: 'Meter (m)', category: 'metric', type: 'width' },

  // Imperial
  { value: 'in', label: 'Inch (in)', category: 'imperial', type: 'width' },
  { value: 'ft', label: 'Foot (ft)', category: 'imperial', type: 'width' },
];

// Area Units
export const AREA_UNITS = [
  { value: 'sqm', label: 'Square Meter (m²)', category: 'metric', type: 'area' },
  { value: 'sqcm', label: 'Square Centimeter (cm²)', category: 'metric', type: 'area' },
  { value: 'sqft', label: 'Square Foot (ft²)', category: 'imperial', type: 'area' },
  { value: 'sqyd', label: 'Square Yard (yd²)', category: 'imperial', type: 'area' },
  { value: 'acre', label: 'Acre', category: 'imperial', type: 'area' },
  { value: 'hectare', label: 'Hectare (ha)', category: 'metric', type: 'area' },
];

// Count/Piece Units
export const COUNT_UNITS = [
  // Basic
  { value: 'piece', label: 'Piece (pc)', category: 'count', type: 'count' },
  { value: 'pcs', label: 'Pieces (pcs)', category: 'count', type: 'count' },
  { value: 'unit', label: 'Unit', category: 'count', type: 'count' },
  { value: 'item', label: 'Item', category: 'count', type: 'count' },

  // Packaging
  { value: 'set', label: 'Set', category: 'packaging', type: 'count' },
  { value: 'box', label: 'Box', category: 'packaging', type: 'count' },
  { value: 'carton', label: 'Carton', category: 'packaging', type: 'count' },
  { value: 'pack', label: 'Pack', category: 'packaging', type: 'count' },
  { value: 'bundle', label: 'Bundle', category: 'packaging', type: 'count' },
  { value: 'bag', label: 'Bag', category: 'packaging', type: 'count' },
  { value: 'case', label: 'Case', category: 'packaging', type: 'count' },
  { value: 'pallet', label: 'Pallet', category: 'packaging', type: 'count' },

  // Specialized
  { value: 'roll', label: 'Roll', category: 'specialized', type: 'count' },
  { value: 'sheet', label: 'Sheet', category: 'specialized', type: 'count' },
  { value: 'dozen', label: 'Dozen', category: 'specialized', type: 'count' },
  { value: 'gross', label: 'Gross (144 pcs)', category: 'specialized', type: 'count' },
  { value: 'pair', label: 'Pair', category: 'specialized', type: 'count' },
];

// Volume Units
export const VOLUME_UNITS = [
  // Metric
  { value: 'ml', label: 'Milliliter (ml)', category: 'metric', type: 'volume' },
  { value: 'l', label: 'Liter (L)', category: 'metric', type: 'volume' },
  { value: 'cbm', label: 'Cubic Meter (m³)', category: 'metric', type: 'volume' },

  // Imperial
  { value: 'floz', label: 'Fluid Ounce (fl oz)', category: 'imperial', type: 'volume' },
  { value: 'gal', label: 'Gallon (gal)', category: 'imperial', type: 'volume' },
  { value: 'cbft', label: 'Cubic Foot (ft³)', category: 'imperial', type: 'volume' },
];

// All Units Combined
export const ALL_UNITS = [
  ...WEIGHT_UNITS,
  ...LENGTH_UNITS,
  ...AREA_UNITS,
  ...COUNT_UNITS,
  ...VOLUME_UNITS,
];

/**
 * Validate if a unit is allowed for a specific field type
 * @param {string} unit - Unit to validate
 * @param {string} fieldType - Field type (weight, length, width, area, count, volume)
 * @returns {boolean} - True if unit is valid for field type
 */
export const isValidUnitForField = (unit, fieldType) => {
  if (!unit || !fieldType) return false;

  const fieldTypeMap = {
    'weight': WEIGHT_UNITS,
    'length': LENGTH_UNITS,
    'width': WIDTH_UNITS,
    'area': AREA_UNITS,
    'count': COUNT_UNITS,
    'volume': VOLUME_UNITS,
  };

  const allowedUnits = fieldTypeMap[fieldType];
  if (!allowedUnits) return false;

  return allowedUnits.some(u => u.value === unit);
};

/**
 * Get unit details
 * @param {string} unit - Unit value
 * @returns {object|null} - Unit details or null
 */
export const getUnitDetails = (unit) => {
  return ALL_UNITS.find(u => u.value === unit) || null;
};

/**
 * Get units by type
 * @param {string} type - Unit type (weight, length, width, area, count, volume)
 * @returns {array} - Array of units
 */
export const getUnitsByType = (type) => {
  const typeMap = {
    'weight': WEIGHT_UNITS,
    'length': LENGTH_UNITS,
    'width': WIDTH_UNITS,
    'area': AREA_UNITS,
    'count': COUNT_UNITS,
    'volume': VOLUME_UNITS,
  };

  return typeMap[type] || [];
};

/**
 * Get units by category
 * @param {string} category - Unit category (metric, imperial, specialized, packaging, count)
 * @returns {array} - Array of units
 */
export const getUnitsByCategory = (category) => {
  return ALL_UNITS.filter(u => u.category === category);
};

// Unit conversion rates (base unit conversion to meters/kilograms)
export const UNIT_CONVERSION_RATES = {
  // Length to meters
  'mm': 0.001,
  'cm': 0.01,
  'm': 1,
  'km': 1000,
  'in': 0.0254,
  'ft': 0.3048,
  'yd': 0.9144,
  'mile': 1609.344,

  // Weight to kilograms
  'mg': 0.000001,
  'g': 0.001,
  'kg': 1,
  'ton': 1000,
  'quintal': 100,
  'oz': 0.0283495,
  'lb': 0.453592,

  // Area to square meters
  'sqm': 1,
  'sqcm': 0.0001,
  'sqft': 0.092903,
  'sqyd': 0.836127,
  'acre': 4046.86,
  'hectare': 10000,

  // Volume to liters
  'ml': 0.001,
  'l': 1,
  'cbm': 1000,
  'floz': 0.0295735,
  'gal': 3.78541,
  'cbft': 28.3168,
};

export default {
  WEIGHT_UNITS,
  LENGTH_UNITS,
  WIDTH_UNITS,
  AREA_UNITS,
  COUNT_UNITS,
  VOLUME_UNITS,
  ALL_UNITS,
  isValidUnitForField,
  getUnitDetails,
  getUnitsByType,
  getUnitsByCategory,
  UNIT_CONVERSION_RATES,
};
