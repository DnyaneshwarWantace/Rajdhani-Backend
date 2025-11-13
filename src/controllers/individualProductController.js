import IndividualProduct from '../models/IndividualProduct.js';
import Product from '../models/Product.js';
import { generateIndividualProductId, generateQRCode } from '../utils/idGenerator.js';

// Create individual products in bulk
export const createIndividualProducts = async (req, res) => {
  try {
    const { product_id, quantity, batch_number, quality_grade, inspector, notes } = req.body;

    // Validate product exists and has individual tracking enabled
    const product = await Product.findOne({ id: product_id });
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    if (!product.individual_stock_tracking) {
      return res.status(400).json({
        success: false,
        error: 'Individual stock tracking is not enabled for this product'
      });
    }

    if (quantity <= 0 || quantity > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be between 1 and 1000'
      });
    }

    const individualProducts = [];
    const createdProducts = [];

    // Create individual products
    for (let i = 0; i < quantity; i++) {
      const serialNumber = `${product.id}_${Date.now()}_${i + 1}`;
      const qrCode = await generateQRCode();
      
      const individualProduct = new IndividualProduct({
        id: await generateIndividualProductId(),
        product_id: product.id,
        qr_code: qrCode,
        serial_number: serialNumber,
        product_name: product.name,
        color: product.color,
        pattern: product.pattern,
        length: product.length,
        width: product.width,
        weight: product.weight,
        final_length: product.length,
        final_width: product.width,
        final_weight: product.weight,
        batch_number: batch_number || `BATCH_${Date.now()}`,
        quality_grade: quality_grade || 'A',
        inspector: inspector || null, // Use inspector from request, or null if not provided
        notes: notes || `Item ${i + 1} of ${quantity} - Auto-created from product entry`,
        production_date: new Date().toISOString().split('T')[0],
        completion_date: new Date().toISOString().split('T')[0],
        added_date: new Date().toISOString().split('T')[0],
        location: 'Warehouse A - General Storage',
        status: 'available'
      });

      individualProducts.push(individualProduct);
    }

    // Save all individual products
    await IndividualProduct.insertMany(individualProducts);

    // Update product's individual products count and current_stock
    product.individual_products_count += quantity;
    
    // Sync current_stock with available individual products
    const availableCount = await IndividualProduct.countDocuments({
      product_id: product.id,
      status: 'available'
    });
    product.current_stock = availableCount;
    
    await product.save();

    res.status(201).json({
      success: true,
      data: {
        created_count: quantity,
        product_id: product.id,
        product_name: product.name,
        batch_number: batch_number || `BATCH_${Date.now()}`,
        individual_products: individualProducts.map(ip => ({
          id: ip.id,
          qr_code: ip.qr_code,
          serial_number: ip.serial_number,
          status: ip.status
        }))
      }
    });
  } catch (error) {
    console.error('Error creating individual products:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get all individual products with optional filtering
export const getAllIndividualProducts = async (req, res) => {
  try {
    const { status, product_id, quality_grade } = req.query;
    
    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (product_id) filter.product_id = product_id;
    if (quality_grade) filter.quality_grade = quality_grade;
    
    const individualProducts = await IndividualProduct.find(filter)
      .sort({ created_at: -1 });
    
    res.json({
      success: true,
      data: individualProducts,
      count: individualProducts.length
    });
  } catch (error) {
    console.error('Error fetching all individual products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch individual products'
    });
  }
};

// Get individual products by product ID
export const getIndividualProductsByProduct = async (req, res) => {
  try {
    const { product_id } = req.params;
    const { status, limit = 50, offset = 0, batch_number } = req.query;

    let query = { product_id };

    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by batch_number if provided
    if (batch_number) {
      query.batch_number = batch_number;
    }

    const individualProducts = await IndividualProduct.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const count = await IndividualProduct.countDocuments(query);

    res.json({
      success: true,
      data: individualProducts,
      count
    });
  } catch (error) {
    console.error('Error fetching individual products:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get individual product by ID
export const getIndividualProductById = async (req, res) => {
  try {
    const individualProduct = await IndividualProduct.findOne({ id: req.params.id });

    if (!individualProduct) {
      return res.status(404).json({
        success: false,
        error: 'Individual product not found'
      });
    }

    res.json({
      success: true,
      data: individualProduct
    });
  } catch (error) {
    console.error('Error fetching individual product:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get individual product by QR code
export const getIndividualProductByQR = async (req, res) => {
  try {
    const { qr_code } = req.params;
    const individualProduct = await IndividualProduct.findOne({ qr_code });

    if (!individualProduct) {
      return res.status(404).json({
        success: false,
        error: 'Individual product not found'
      });
    }

    res.json({
      success: true,
      data: individualProduct
    });
  } catch (error) {
    console.error('Error fetching individual product by QR:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update individual product
export const updateIndividualProduct = async (req, res) => {
  try {
    const updateData = req.body;
    const individualProduct = await IndividualProduct.findOne({ id: req.params.id });

    if (!individualProduct) {
      return res.status(404).json({
        success: false,
        error: 'Individual product not found'
      });
    }

    // If status is being changed to 'sold', add sale information
    if (updateData.status === 'sold') {
      updateData.sold_date = new Date();
      if (!updateData.sale_price) {
        // Get base product selling price
        const product = await Product.findOne({ id: individualProduct.product_id });
        updateData.sale_price = product.selling_price;
      }
    }

    Object.assign(individualProduct, updateData);
    await individualProduct.save();

    // Sync current_stock if status changed
    if (updateData.status) {
      const product = await Product.findOne({ id: individualProduct.product_id });
      if (product && product.individual_stock_tracking) {
        const availableCount = await IndividualProduct.countDocuments({
          product_id: product.id,
          status: 'available'
        });
        product.current_stock = availableCount;
        await product.save();
      }
    }

    res.json({
      success: true,
      data: individualProduct
    });
  } catch (error) {
    console.error('Error updating individual product:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Update individual product status
export const updateIndividualProductStatus = async (req, res) => {
  try {
    const { status, notes, location } = req.body;
    const individualProduct = await IndividualProduct.findOne({ id: req.params.id });

    if (!individualProduct) {
      return res.status(404).json({
        success: false,
        error: 'Individual product not found'
      });
    }

    const validStatuses = ['available', 'sold', 'damaged', 'returned', 'in_production', 'quality_check'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Update status and related fields
    individualProduct.status = status;
    if (notes) individualProduct.notes = notes;
    if (location) individualProduct.current_location = location;

    // Add sale information if status is 'sold'
    if (status === 'sold') {
      individualProduct.sold_date = new Date();
      if (!individualProduct.sale_price) {
        const product = await Product.findOne({ id: individualProduct.product_id });
        individualProduct.sale_price = product.selling_price;
      }
    }

    await individualProduct.save();

    // Sync current_stock with parent product
    const product = await Product.findOne({ id: individualProduct.product_id });
    if (product && product.individual_stock_tracking) {
      const availableCount = await IndividualProduct.countDocuments({
        product_id: product.id,
        status: 'available'
      });
      product.current_stock = availableCount;
      await product.save();
    }

    res.json({
      success: true,
      data: individualProduct,
      message: `Individual product status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating individual product status:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Add defect to individual product
export const addDefect = async (req, res) => {
  try {
    const { type, description, reported_by } = req.body;
    const individualProduct = await IndividualProduct.findOne({ id: req.params.id });

    if (!individualProduct) {
      return res.status(404).json({
        success: false,
        error: 'Individual product not found'
      });
    }

    const defect = {
      type,
      description,
      reported_by,
      reported_date: new Date(),
      fixed: false
    };

    individualProduct.defects.push(defect);
    await individualProduct.save();

    res.json({
      success: true,
      data: individualProduct,
      message: 'Defect added successfully'
    });
  } catch (error) {
    console.error('Error adding defect:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Fix defect
export const fixDefect = async (req, res) => {
  try {
    const { defect_index, fixed_by } = req.body;
    const individualProduct = await IndividualProduct.findOne({ id: req.params.id });

    if (!individualProduct) {
      return res.status(404).json({
        success: false,
        error: 'Individual product not found'
      });
    }

    if (defect_index < 0 || defect_index >= individualProduct.defects.length) {
      return res.status(400).json({
        success: false,
        error: 'Invalid defect index'
      });
    }

    individualProduct.defects[defect_index].fixed = true;
    individualProduct.defects[defect_index].fixed_by = fixed_by;
    individualProduct.defects[defect_index].fixed_date = new Date();

    await individualProduct.save();

    res.json({
      success: true,
      data: individualProduct,
      message: 'Defect marked as fixed'
    });
  } catch (error) {
    console.error('Error fixing defect:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get individual product statistics
export const getIndividualProductStats = async (req, res) => {
  try {
    const { product_id } = req.params;

    const stats = await IndividualProduct.aggregate([
      { $match: { product_id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalCount = await IndividualProduct.countDocuments({ product_id });
    const availableCount = await IndividualProduct.countDocuments({ 
      product_id, 
      status: 'available' 
    });
    const soldCount = await IndividualProduct.countDocuments({ 
      product_id, 
      status: 'sold' 
    });
    const damagedCount = await IndividualProduct.countDocuments({ 
      product_id, 
      status: 'damaged' 
    });

    const statusBreakdown = stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        total_individual_products: totalCount,
        available: availableCount,
        sold: soldCount,
        damaged: damagedCount,
        status_breakdown: statusBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching individual product stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete individual product
export const deleteIndividualProduct = async (req, res) => {
  try {
    const individualProduct = await IndividualProduct.findOne({ id: req.params.id });

    if (!individualProduct) {
      return res.status(404).json({
        success: false,
        error: 'Individual product not found'
      });
    }

    // Update parent product count and current_stock
    const product = await Product.findOne({ id: individualProduct.product_id });
    if (product) {
      product.individual_products_count = Math.max(0, product.individual_products_count - 1);
      
      // Sync current_stock with available individual products
      if (product.individual_stock_tracking) {
        const availableCount = await IndividualProduct.countDocuments({
          product_id: product.id,
          status: 'available',
          id: { $ne: req.params.id } // Exclude the one being deleted
        });
        product.current_stock = availableCount;
      }
      
      await product.save();
    }

    await IndividualProduct.findOneAndDelete({ id: req.params.id });

    res.json({
      success: true,
      message: 'Individual product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting individual product:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
