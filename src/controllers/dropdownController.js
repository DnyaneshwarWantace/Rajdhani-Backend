import DropdownOption from '../models/DropdownOption.js';
import { generateId } from '../utils/idGenerator.js';
import { logDropdownCreate, logDropdownUpdate, logDropdownDelete } from '../utils/detailedLogger.js';
import {
  getUnitsByType,
  getUnitsByCategory,
  ALL_UNITS,
  WEIGHT_UNITS,
  LENGTH_UNITS,
  WIDTH_UNITS,
  AREA_UNITS,
  COUNT_UNITS,
  VOLUME_UNITS
} from '../utils/unitCategories.js';

// Get all dropdown options
export const getAllDropdownOptions = async (req, res) => {
  try {
    const { category, is_active } = req.query;

    let query = {};

    if (category) {
      query.category = category;
    }

    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }

    const options = await DropdownOption.find(query)
      .sort({ category: 1, display_order: 1 })
      .lean();

    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('Error fetching dropdown options:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get options by category
export const getOptionsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { is_active = 'true' } = req.query;

    const query = {
      category,
      is_active: is_active === 'true'
    };

    let options = await DropdownOption.find(query)
      .sort({ display_order: 1 })
      .lean();

    // Always include "NA" for material_color, even if not in database
    if (category === 'material_color') {
      const hasNA = options.some(opt => opt.value === 'NA');
      if (!hasNA) {
        options.unshift({
          id: 'HARDCODED_NA',
          category: 'material_color',
          value: 'NA',
          display_order: 0,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }

    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error(`Error fetching ${req.params.category} options:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get multiple categories at once
export const getMultipleCategories = async (req, res) => {
  try {
    const { categories } = req.query; // comma-separated list

    if (!categories) {
      return res.status(400).json({
        success: false,
        error: 'Categories parameter is required'
      });
    }

    const categoryList = categories.split(',').map(c => c.trim());

    const options = await DropdownOption.find({
      category: { $in: categoryList },
      is_active: true
    })
      .sort({ category: 1, display_order: 1 })
      .lean();

    // Group by category
    const grouped = {};
    categoryList.forEach(category => {
      grouped[category] = options.filter(opt => opt.category === category);
    });

    res.json({
      success: true,
      data: grouped
    });
  } catch (error) {
    console.error('Error fetching multiple categories:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get product dropdown data (all product-related categories)
export const getProductDropdownData = async (req, res) => {
  try {
    const productCategories = [
      'unit', 'color', 'pattern', 'weight',
      'category', 'subcategory', 'length', 'width',
      'weight_units', 'length_units', 'width_units'
    ];

    const options = await DropdownOption.find({
      category: { $in: productCategories },
      is_active: true
    })
      .sort({ category: 1, display_order: 1 })
      .lean();

    // Group by category
    const result = {
      units: options.filter(opt => opt.category === 'unit'),
      colors: options.filter(opt => opt.category === 'color'),
      patterns: options.filter(opt => opt.category === 'pattern'),
      weights: options.filter(opt => opt.category === 'weight'),
      categories: options.filter(opt => opt.category === 'category'),
      subcategories: options.filter(opt => opt.category === 'subcategory'),
      lengths: options.filter(opt => opt.category === 'length'),
      widths: options.filter(opt => opt.category === 'width'),
      weight_units: options.filter(opt => opt.category === 'weight_units'),
      length_units: options.filter(opt => opt.category === 'length_units'),
      width_units: options.filter(opt => opt.category === 'width_units')
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching product dropdown data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get material dropdown data
export const getMaterialDropdownData = async (req, res) => {
  try {
    const materialCategories = ['material_category', 'material_unit'];

    const options = await DropdownOption.find({
      category: { $in: materialCategories },
      is_active: true
    })
      .sort({ category: 1, display_order: 1 })
      .lean();

    const result = {
      material_categories: options.filter(opt => opt.category === 'material_category'),
      material_units: options.filter(opt => opt.category === 'material_unit')
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching material dropdown data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get production dropdown data
export const getProductionDropdownData = async (req, res) => {
  try {
    const productionCategories = ['priority', 'quality_rating', 'waste_type'];

    const options = await DropdownOption.find({
      category: { $in: productionCategories },
      is_active: true
    })
      .sort({ category: 1, display_order: 1 })
      .lean();

    const result = {
      priorities: options.filter(opt => opt.category === 'priority'),
      quality_ratings: options.filter(opt => opt.category === 'quality_rating'),
      waste_types: options.filter(opt => opt.category === 'waste_type')
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching production dropdown data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Valid length/width units mapping (normalized to standard values)
const VALID_LENGTH_UNITS = {
  // Feet variations
  'feet': 'feet',
  'foot': 'feet',
  'ft': 'feet',
  'Feet': 'feet',
  'Foot': 'feet',
  'FT': 'feet',
  
  // Meter variations
  'meter': 'm',
  'meters': 'm',
  'metre': 'm',
  'metres': 'm',
  'm': 'm',
  'M': 'm',
  'Meter': 'm',
  'Meters': 'm',
  'Metre': 'm',
  'Metres': 'm',
  
  // Centimeter variations
  'centimeter': 'cm',
  'centimeters': 'cm',
  'centimetre': 'cm',
  'centimetres': 'cm',
  'cm': 'cm',
  'CM': 'cm',
  'Centimeter': 'cm',
  'Centimeters': 'cm',
  'Centimetre': 'cm',
  'Centimetres': 'cm',
  
  // Millimeter variations
  'millimeter': 'mm',
  'millimeters': 'mm',
  'millimetre': 'mm',
  'millimetres': 'mm',
  'mm': 'mm',
  'MM': 'mm',
  'Millimeter': 'mm',
  'Millimeters': 'mm',
  'Millimetre': 'mm',
  'Millimetres': 'mm',
  
  // Inch variations
  'inch': 'inch',
  'inches': 'inch',
  'in': 'inch',
  'Inch': 'inch',
  'Inches': 'inch',
  'IN': 'inch',
  'INCH': 'inch',
  
  // Yard variations
  'yard': 'yard',
  'yards': 'yard',
  'yd': 'yard',
  'Yard': 'yard',
  'Yards': 'yard',
  'YD': 'yard',
  
  // Kilometer variations
  'kilometer': 'km',
  'kilometers': 'km',
  'kilometre': 'km',
  'kilometres': 'km',
  'km': 'km',
  'KM': 'km',
  'Kilometer': 'km',
  'Kilometers': 'km',
  'Kilometre': 'km',
  'Kilometres': 'km',
};

// Valid weight units mapping (normalized to standard values)
const VALID_WEIGHT_UNITS = {
  // GSM variations
  'gsm': 'GSM',
  'GSM': 'GSM',
  'Gsm': 'GSM',
  'g/sm': 'GSM',
  'g/m²': 'GSM',
  'g/m2': 'GSM',
  'grams per square meter': 'GSM',
  'grams per square metre': 'GSM',
  
  // Kilogram variations
  'kilogram': 'kg',
  'kilograms': 'kg',
  'kilogramme': 'kg',
  'kilogrammes': 'kg',
  'kg': 'kg',
  'KG': 'kg',
  'Kg': 'kg',
  'kilo': 'kg',
  'Kilo': 'kg',
  'KILO': 'kg',
  
  // Gram variations
  'gram': 'g',
  'grams': 'g',
  'gramme': 'g',
  'grammes': 'g',
  'g': 'g',
  'G': 'g',
  'Gram': 'g',
  'Grams': 'g',
  'Gramme': 'g',
  'Grammes': 'g',
  
  // Pound variations
  'pound': 'lbs',
  'pounds': 'lbs',
  'lb': 'lbs',
  'lbs': 'lbs',
  'LBS': 'lbs',
  'Lb': 'lbs',
  'Lbs': 'lbs',
  'LB': 'lbs',
  'Pound': 'lbs',
  'Pounds': 'lbs',
  
  // Ounce variations
  'ounce': 'oz',
  'ounces': 'oz',
  'oz': 'oz',
  'OZ': 'oz',
  'Oz': 'oz',
  'Ounce': 'oz',
  'Ounces': 'oz',
  
  // Ton variations
  'ton': 'ton',
  'tons': 'ton',
  'tonne': 'ton',
  'tonnes': 'ton',
  'Ton': 'ton',
  'Tons': 'ton',
  'Tonne': 'ton',
  'Tonnes': 'ton',
  'TON': 'ton',
  'TONNE': 'ton',
  
  // Milligram variations
  'milligram': 'mg',
  'milligrams': 'mg',
  'milligramme': 'mg',
  'milligrammes': 'mg',
  'mg': 'mg',
  'MG': 'mg',
  'Mg': 'mg',
  'Milligram': 'mg',
  'Milligrams': 'mg',
};

// Validate and normalize length/width unit
const validateLengthWidthUnit = (value, category) => {
  // Only validate for length_unit, width_unit, length_units, width_units categories
  const lengthWidthCategories = ['length_unit', 'width_unit', 'length_units', 'width_units'];
  
  if (!lengthWidthCategories.includes(category)) {
    return { valid: true, normalized: value.trim() };
  }
  
  const trimmedValue = value.trim().toLowerCase();
  
  // Check if the value matches any valid unit (case-insensitive)
  if (VALID_LENGTH_UNITS[trimmedValue]) {
    return { 
      valid: true, 
      normalized: VALID_LENGTH_UNITS[trimmedValue] 
    };
  }
  
  // If not found, return error with list of valid units
  const validUnits = [...new Set(Object.values(VALID_LENGTH_UNITS))].sort();
  return {
    valid: false,
    error: `Invalid ${category.replace('_', ' ')}. Valid units are: ${validUnits.join(', ')}. You entered: "${value}". Common variations like "meter"/"m", "centimeter"/"cm" are accepted.`
  };
};

// Validate and normalize weight unit
const validateWeightUnit = (value, category) => {
  // Only validate for weight_unit, weight_units categories
  const weightCategories = ['weight_unit', 'weight_units'];
  
  if (!weightCategories.includes(category)) {
    return { valid: true, normalized: value.trim() };
  }
  
  const trimmedValue = value.trim().toLowerCase();
  
  // Check if the value matches any valid unit (case-insensitive)
  if (VALID_WEIGHT_UNITS[trimmedValue]) {
    return { 
      valid: true, 
      normalized: VALID_WEIGHT_UNITS[trimmedValue] 
    };
  }
  
  // If not found, return error with list of valid units
  const validUnits = [...new Set(Object.values(VALID_WEIGHT_UNITS))].sort();
  return {
    valid: false,
    error: `Invalid ${category.replace('_', ' ')}. Valid units are: ${validUnits.join(', ')}. You entered: "${value}". Common variations like "kilogram"/"kg", "gram"/"g", "GSM" are accepted.`
  };
};

// Create new dropdown option
export const createDropdownOption = async (req, res) => {
  try {
    const { category, value, display_order } = req.body;

    if (!category || !value) {
      return res.status(400).json({
        success: false,
        error: 'Category and value are required'
      });
    }

    // Validate length/width units
    let unitValidation = validateLengthWidthUnit(value, category);
    if (!unitValidation.valid) {
      // If not a length/width unit, check if it's a weight unit
      unitValidation = validateWeightUnit(value, category);
      if (!unitValidation.valid) {
        return res.status(400).json({
          success: false,
          error: unitValidation.error
        });
      }
    }

    // Use normalized value for units
    const finalValue = unitValidation.normalized || value.trim();

    // Check if option already exists (using normalized value for length/width)
    const existing = await DropdownOption.findOne({ 
      category, 
      value: finalValue 
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `This option already exists in the category. ${unitValidation.normalized && unitValidation.normalized !== value.trim() ? `Note: "${value}" was normalized to "${unitValidation.normalized}".` : ''}`
      });
    }

    const dropdownOption = new DropdownOption({
      id: await generateId('OPT'),
      category,
      value: finalValue,
      display_order: display_order || 999,
      is_active: true
    });

    await dropdownOption.save();

    // Log dropdown creation
    await logDropdownCreate(req, dropdownOption);

    res.status(201).json({
      success: true,
      data: dropdownOption,
      message: unitValidation.normalized && unitValidation.normalized !== value.trim() 
        ? `Unit "${value}" was normalized to "${unitValidation.normalized}"` 
        : undefined
    });
  } catch (error) {
    console.error('Error creating dropdown option:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Update dropdown option
export const updateDropdownOption = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Try by MongoDB _id first if it looks like an ObjectId, then by custom id
    let option = null;
    
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      // Looks like MongoDB ObjectId, try _id first
      try {
        option = await DropdownOption.findById(id);
      } catch (err) {
        console.log('Not a valid ObjectId:', err.message);
      }
    }
    
    // If not found by _id, try custom id field
    if (!option) {
      option = await DropdownOption.findOne({ id });
    }

    if (!option) {
      return res.status(404).json({
        success: false,
        error: 'Dropdown option not found'
      });
    }

    // Check for duplicate if value or category is being updated
    if (updates.value || updates.category) {
      const checkCategory = updates.category || option.category;
      const checkValue = updates.value || option.value;

      // Validate length/width/weight units if updating value or category
      let unitValidation = validateLengthWidthUnit(checkValue, checkCategory);
      if (!unitValidation.valid) {
        // If not a length/width unit, check if it's a weight unit
        unitValidation = validateWeightUnit(checkValue, checkCategory);
        if (!unitValidation.valid) {
          return res.status(400).json({
            success: false,
            error: unitValidation.error
          });
        }
      }

      // Use normalized value for units
      const finalValue = unitValidation.normalized || checkValue.trim();

      const existing = await DropdownOption.findOne({
        category: checkCategory,
        value: finalValue,
        id: { $ne: id }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          error: `This option already exists in the category. ${unitValidation.normalized && unitValidation.normalized !== checkValue.trim() ? `Note: "${checkValue}" was normalized to "${unitValidation.normalized}".` : ''}`
        });
      }

      // Update the value to normalized version if it's a length/width unit
      if (updates.value && unitValidation.normalized && unitValidation.normalized !== checkValue.trim()) {
        updates.value = unitValidation.normalized;
      }
    }

    const oldOption = { ...option.toObject() };
    Object.assign(option, updates);
    option.updated_at = new Date();

    await option.save();

    // Log dropdown update
    const changes = {};
    Object.keys(updates).forEach(key => {
      if (oldOption[key] !== option[key]) {
        changes[key] = { old: oldOption[key], new: option[key] };
      }
    });
    await logDropdownUpdate(req, option, changes);

    res.json({
      success: true,
      data: option
    });
  } catch (error) {
    console.error('Error updating dropdown option:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Toggle active status
export const toggleActiveStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Try by MongoDB _id first if it looks like an ObjectId, then by custom id
    let option = null;
    
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      // Looks like MongoDB ObjectId, try _id first
      try {
        option = await DropdownOption.findById(id);
      } catch (err) {
        console.log('Not a valid ObjectId:', err.message);
      }
    }
    
    // If not found by _id, try custom id field
    if (!option) {
      option = await DropdownOption.findOne({ id });
    }

    if (!option) {
      return res.status(404).json({
        success: false,
        error: 'Dropdown option not found'
      });
    }

    const oldStatus = option.is_active;
    option.is_active = !option.is_active;
    option.updated_at = new Date();

    await option.save();

    // Log dropdown update (status change)
    await logDropdownUpdate(req, option, { is_active: { old: oldStatus, new: option.is_active } });

    res.json({
      success: true,
      data: option
    });
  } catch (error) {
    console.error('Error toggling active status:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Delete dropdown option
export const deleteDropdownOption = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the option first to check if it's protected
    // Try by MongoDB _id first if it looks like an ObjectId, then by custom id
    let option = null;
    
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      // Looks like MongoDB ObjectId, try _id first
      try {
        option = await DropdownOption.findById(id);
      } catch (err) {
        console.log('Not a valid ObjectId:', err.message);
      }
    }
    
    // If not found by _id, try custom id field
    if (!option) {
      option = await DropdownOption.findOne({ id });
    }

    if (!option) {
      return res.status(404).json({
        success: false,
        error: 'Dropdown option not found'
      });
    }

    // Prevent deletion of "NA" option for material_color
    if (option.category === 'material_color' && option.value === 'NA') {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete "NA" option - it is a system default'
      });
    }

    // Log dropdown deletion before deleting
    await logDropdownDelete(req, option);

    // Delete by _id to ensure we delete the correct document
    await DropdownOption.findByIdAndDelete(option._id);

    res.json({
      success: true,
      message: 'Dropdown option deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting dropdown option:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all unique categories
export const getAllCategories = async (req, res) => {
  try {
    const categories = await DropdownOption.distinct('category');

    res.json({
      success: true,
      data: categories.sort()
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get predefined units by type
export const getUnitsByTypeEndpoint = async (req, res) => {
  try {
    const { type } = req.params;

    const validTypes = ['weight', 'length', 'width', 'area', 'count', 'volume'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid unit type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const units = getUnitsByType(type);

    res.json({
      success: true,
      data: units,
      type
    });
  } catch (error) {
    console.error('Error fetching units by type:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all predefined units
export const getAllUnitsEndpoint = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        all: ALL_UNITS,
        weight: WEIGHT_UNITS,
        length: LENGTH_UNITS,
        width: WIDTH_UNITS,
        area: AREA_UNITS,
        count: COUNT_UNITS,
        volume: VOLUME_UNITS
      }
    });
  } catch (error) {
    console.error('Error fetching all units:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
