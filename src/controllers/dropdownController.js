import DropdownOption from '../models/DropdownOption.js';
import { generateId } from '../utils/idGenerator.js';
import { logDropdownCreate, logDropdownUpdate, logDropdownDelete } from '../utils/detailedLogger.js';

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

    // Check if option already exists
    const existing = await DropdownOption.findOne({ category, value: value.trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'This option already exists in the category'
      });
    }

    const dropdownOption = new DropdownOption({
      id: await generateId('OPT'),
      category,
      value: value.trim(),
      display_order: display_order || 999,
      is_active: true
    });

    await dropdownOption.save();

    // Log dropdown creation
    await logDropdownCreate(req, dropdownOption);

    res.status(201).json({
      success: true,
      data: dropdownOption
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

    const option = await DropdownOption.findOne({ id });

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

      const existing = await DropdownOption.findOne({
        category: checkCategory,
        value: checkValue.trim(),
        id: { $ne: id }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'This option already exists in the category'
        });
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

    const option = await DropdownOption.findOne({ id });

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
    const option = await DropdownOption.findOne({ id });

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

    await DropdownOption.findOneAndDelete({ id });

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
