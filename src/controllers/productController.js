import Product from '../models/Product.js';
import IndividualProduct from '../models/IndividualProduct.js';
import DropdownOption from '../models/DropdownOption.js';
import { generateProductId, generateQRCode } from '../utils/idGenerator.js';

// Create a new product
export const createProduct = async (req, res) => {
  try {
    const productData = {
      ...req.body,
      id: await generateProductId(),
      qr_code: await generateQRCode()
    };

    // Validate dropdown values
    const validCategories = await DropdownOption.find({ 
      category: 'category', 
      is_active: true 
    }).select('value');
    const validSubcategories = await DropdownOption.find({ 
      category: 'subcategory', 
      is_active: true 
    }).select('value');
    const validUnits = await DropdownOption.find({ 
      category: 'unit', 
      is_active: true 
    }).select('value');
    const validColors = await DropdownOption.find({ 
      category: 'color', 
      is_active: true 
    }).select('value');
    const validPatterns = await DropdownOption.find({ 
      category: 'pattern', 
      is_active: true 
    }).select('value');
    const validLengthUnits = await DropdownOption.find({ 
      category: 'length_unit', 
      is_active: true 
    }).select('value');
    const validWidthUnits = await DropdownOption.find({ 
      category: 'width_unit', 
      is_active: true 
    }).select('value');

    const categoryValues = validCategories.map(c => c.value);
    const subcategoryValues = validSubcategories.map(s => s.value);
    const unitValues = validUnits.map(u => u.value);
    const colorValues = validColors.map(c => c.value);
    const patternValues = validPatterns.map(p => p.value);
    const lengthUnitValues = validLengthUnits.map(u => u.value);
    const widthUnitValues = validWidthUnits.map(u => u.value);

    // Validate required dropdown fields
    if (!categoryValues.includes(productData.category)) {
      return res.status(400).json({
        success: false,
        error: `Invalid category. Must be one of: ${categoryValues.join(', ')}`
      });
    }

    if (!unitValues.includes(productData.unit)) {
      return res.status(400).json({
        success: false,
        error: `Invalid unit. Must be one of: ${unitValues.join(', ')}`
      });
    }

    // Validate required dimensions for SQM calculation
    if (!productData.length || !productData.width || !productData.length_unit || !productData.width_unit) {
      return res.status(400).json({
        success: false,
        error: 'Length, width, length_unit, and width_unit are required for SQM calculation'
      });
    }

    // Validate dimension units against dropdown options
    if (!lengthUnitValues.includes(productData.length_unit)) {
      return res.status(400).json({
        success: false,
        error: `Invalid length unit. Must be one of: ${lengthUnitValues.join(', ')}`
      });
    }

    if (!widthUnitValues.includes(productData.width_unit)) {
      return res.status(400).json({
        success: false,
        error: `Invalid width unit. Must be one of: ${widthUnitValues.join(', ')}`
      });
    }

    // Validate optional dropdown fields (only if they have a non-empty value)
    if (productData.color && productData.color.trim() !== '' && !colorValues.includes(productData.color)) {
      return res.status(400).json({
        success: false,
        error: `Invalid color. Must be one of: ${colorValues.join(', ')}`
      });
    }

    if (productData.pattern && productData.pattern.trim() !== '' && patternValues.length > 0 && !patternValues.includes(productData.pattern)) {
      return res.status(400).json({
        success: false,
        error: `Invalid pattern. Must be one of: ${patternValues.join(', ')}`
      });
    }

    // Remove empty optional fields
    if (!productData.color || productData.color.trim() === '') {
      delete productData.color;
    }
    if (!productData.pattern || productData.pattern.trim() === '') {
      delete productData.pattern;
    }
    if (!productData.subcategory || productData.subcategory.trim() === '') {
      delete productData.subcategory;
    }

    const product = new Product(productData);
    await product.save();

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get all products with filtering
export const getProducts = async (req, res) => {
  try {
    const { 
      search, 
      category, 
      status, 
      individual_stock_tracking,
      limit = 50, 
      offset = 0 
    } = req.query;

    let query = {};

    // Apply filters
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { color: { $regex: search, $options: 'i' } },
        { pattern: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (individual_stock_tracking !== undefined) {
      query.individual_stock_tracking = individual_stock_tracking === 'true';
    }

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const count = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
      count
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get product by ID
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // If individual stock tracking is enabled, get individual products count
    if (product.individual_stock_tracking) {
      const individualCount = await IndividualProduct.countDocuments({ 
        product_id: product.id,
        status: 'available'
      });
      product.individual_products_count = individualCount;
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const updateData = req.body;
    const product = await Product.findOne({ id: req.params.id });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Validate dropdown values if they're being updated
    if (updateData.category || updateData.subcategory || updateData.unit || updateData.color || updateData.pattern) {
      const validCategories = await DropdownOption.find({ 
        category: 'category', 
        is_active: true 
      }).select('value');
      const validSubcategories = await DropdownOption.find({ 
        category: 'subcategory', 
        is_active: true 
      }).select('value');
      const validUnits = await DropdownOption.find({ 
        category: 'unit', 
        is_active: true 
      }).select('value');
      const validColors = await DropdownOption.find({ 
        category: 'color', 
        is_active: true 
      }).select('value');
      const validPatterns = await DropdownOption.find({ 
        category: 'pattern', 
        is_active: true 
      }).select('value');

      const categoryValues = validCategories.map(c => c.value);
      const subcategoryValues = validSubcategories.map(s => s.value);
      const unitValues = validUnits.map(u => u.value);
      const colorValues = validColors.map(c => c.value);
      const patternValues = validPatterns.map(p => p.value);

      if (updateData.category && !categoryValues.includes(updateData.category)) {
        return res.status(400).json({
          success: false,
          error: `Invalid category. Must be one of: ${categoryValues.join(', ')}`
        });
      }

      if (updateData.subcategory && updateData.subcategory.trim() !== '' && subcategoryValues.length > 0 && !subcategoryValues.includes(updateData.subcategory)) {
        return res.status(400).json({
          success: false,
          error: `Invalid subcategory. Must be one of: ${subcategoryValues.join(', ')}`
        });
      }

      if (updateData.unit && !unitValues.includes(updateData.unit)) {
        return res.status(400).json({
          success: false,
          error: `Invalid unit. Must be one of: ${unitValues.join(', ')}`
        });
      }

      if (updateData.color && !colorValues.includes(updateData.color)) {
        return res.status(400).json({
          success: false,
          error: `Invalid color. Must be one of: ${colorValues.join(', ')}`
        });
      }

      if (updateData.pattern && !patternValues.includes(updateData.pattern)) {
        return res.status(400).json({
          success: false,
          error: `Invalid pattern. Must be one of: ${patternValues.join(', ')}`
        });
      }
    }

    Object.assign(product, updateData);
    await product.save();

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Check if product has individual products
    if (product.individual_stock_tracking) {
      const individualCount = await IndividualProduct.countDocuments({ product_id: product.id });
      if (individualCount > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot delete product. ${individualCount} individual product(s) are associated with this product.`
        });
      }
    }

    await Product.findOneAndDelete({ id: req.params.id });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get product statistics
export const getProductStats = async (req, res) => {
  try {
    // Use MongoDB aggregation for much faster stats calculation
    const [productStatusStats, individualProductStats, stockValueStats] = await Promise.all([
      // Get product counts by status and tracking type
      Product.aggregate([
        {
          $facet: {
            statusCounts: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 }
                }
              }
            ],
            trackingCounts: [
              {
                $group: {
                  _id: '$individual_stock_tracking',
                  count: { $sum: 1 }
                }
              }
            ],
            stockValue: [
              {
                $group: {
                  _id: null,
                  total: {
                    $sum: {
                      $multiply: [
                        { $ifNull: ['$current_stock', 0] },
                        { $ifNull: ['$selling_price', 0] }
                      ]
                    }
                  }
                }
              }
            ]
          }
        }
      ]),
      // Get individual product stats
      IndividualProduct.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      // Get low stock and out of stock counts
      Product.aggregate([
        {
          $facet: {
            lowStock: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $gt: ['$current_stock', 0] },
                      { $lte: ['$current_stock', '$reorder_point'] }
                    ]
                  }
                }
              },
              { $count: 'count' }
            ],
            outOfStock: [
              {
                $match: {
                  current_stock: 0
                }
              },
              { $count: 'count' }
            ]
          }
        }
      ])
    ]);

    // Parse aggregation results
    const statusCounts = {};
    productStatusStats[0].statusCounts.forEach(s => {
      statusCounts[s._id] = s.count;
    });

    const trackingCounts = {};
    productStatusStats[0].trackingCounts.forEach(t => {
      trackingCounts[t._id] = t.count;
    });

    const individualCounts = {};
    individualProductStats.forEach(ip => {
      individualCounts[ip._id] = ip.count;
    });

    const totalStockValue = productStatusStats[0].stockValue[0]?.total || 0;
    const lowStockCount = stockValueStats[0].lowStock[0]?.count || 0;
    const outOfStockCount = stockValueStats[0].outOfStock[0]?.count || 0;

    const totalProducts = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

    const stats = {
      total_products: totalProducts,
      active_products: statusCounts.active || 0,
      inactive_products: statusCounts.inactive || 0,
      discontinued_products: statusCounts.discontinued || 0,
      individual_tracking_products: trackingCounts.true || 0,
      total_individual_products: Object.values(individualCounts).reduce((sum, count) => sum + count, 0),
      available_individual_products: individualCounts.available || 0,
      sold_individual_products: individualCounts.sold || 0,
      damaged_individual_products: individualCounts.damaged || 0,
      total_stock_value: totalStockValue,
      low_stock_products: lowStockCount,
      out_of_stock_products: outOfStockCount
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching product stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get dropdown data for product creation
export const getProductDropdownData = async (req, res) => {
  try {
    const categories = await DropdownOption.find({ 
      category: 'category', 
      is_active: true 
    }).sort({ display_order: 1 });

    const units = await DropdownOption.find({ 
      category: 'unit', 
      is_active: true 
    }).sort({ display_order: 1 });

    const colors = await DropdownOption.find({ 
      category: 'color', 
      is_active: true 
    }).sort({ display_order: 1 });

    const patterns = await DropdownOption.find({ 
      category: 'pattern', 
      is_active: true 
    }).sort({ display_order: 1 });

    const lengthUnits = await DropdownOption.find({ 
      category: 'length_units', 
      is_active: true 
    }).sort({ display_order: 1 });

    const widthUnits = await DropdownOption.find({ 
      category: 'width_units', 
      is_active: true 
    }).sort({ display_order: 1 });

    const weightUnits = await DropdownOption.find({ 
      category: 'weight_units', 
      is_active: true 
    }).sort({ display_order: 1 });

    res.json({
      success: true,
      data: {
        categories: categories.map(c => ({ value: c.value, label: c.value })),
        units: units.map(u => ({ value: u.value, label: u.value })),
        colors: colors.map(c => ({ value: c.value, label: c.value })),
        patterns: patterns.map(p => ({ value: p.value, label: p.value })),
        length_units: lengthUnits.map(u => ({ value: u.value, label: u.value })),
        width_units: widthUnits.map(u => ({ value: u.value, label: u.value })),
        weight_units: weightUnits.map(u => ({ value: u.value, label: u.value }))
      }
    });
  } catch (error) {
    console.error('Error fetching product dropdown data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Toggle individual stock tracking
export const toggleIndividualStockTracking = async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // If enabling individual tracking, check if there are existing individual products
    if (!product.individual_stock_tracking) {
      const existingIndividualProducts = await IndividualProduct.countDocuments({ product_id: product.id });
      if (existingIndividualProducts > 0) {
        return res.status(400).json({
          success: false,
          error: 'Individual products already exist for this product. Cannot disable individual tracking.'
        });
      }
    }

    product.individual_stock_tracking = !product.individual_stock_tracking;
    await product.save();

    res.json({
      success: true,
      data: product,
      message: `Individual stock tracking ${product.individual_stock_tracking ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    console.error('Error toggling individual stock tracking:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Sync current_stock with available individual products count
export const syncProductStock = async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    if (product.individual_stock_tracking) {
      // Count available individual products
      const availableCount = await IndividualProduct.countDocuments({
        product_id: product.id,
        status: 'available'
      });

      product.current_stock = availableCount;
      await product.save();

      res.json({
        success: true,
        data: product,
        message: `Synced current_stock to ${availableCount} based on available individual products`
      });
    } else {
      res.json({
        success: true,
        data: product,
        message: 'Product does not use individual stock tracking'
      });
    }
  } catch (error) {
    console.error('Error syncing product stock:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
