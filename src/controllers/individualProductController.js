import IndividualProduct from '../models/IndividualProduct.js';
import Product from '../models/Product.js';
import { generateIndividualProductId, generateQRCode } from '../utils/idGenerator.js';
import { logIndividualProductGenerate, logIndividualProductDetailUpdate, logIndividualProductDetailsFill } from '../utils/detailedLogger.js';
import { escapeRegex } from '../utils/regexHelper.js';

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

    // Log individual product generation
    await logIndividualProductGenerate(req, product, quantity);

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

// Create a single individual product
export const createIndividualProduct = async (req, res) => {
  try {
    const {
      product_id,
      qr_code,
      serial_number,
      status = 'available',
      final_length,
      final_width,
      final_weight,
      quality_grade = 'A',
      inspector,
      location = 'Warehouse A - General Storage',
      notes,
      production_date,
      batch_number
    } = req.body;

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

    // Generate QR code and serial number if not provided
    const generatedQRCode = qr_code || await generateQRCode();
    const generatedSerialNumber = serial_number || `${product.id}_${Date.now()}`;

    // Get inspector name from request body, or use logged-in user's name, or fallback to email
    const inspectorName = inspector || 
                          (req.user?.full_name) || 
                          (req.user?.email) || 
                          'System';

    // Create individual product
    const individualProduct = new IndividualProduct({
      id: await generateIndividualProductId(),
      product_id: product.id,
      qr_code: generatedQRCode,
      serial_number: generatedSerialNumber,
      product_name: product.name,
      color: product.color,
      pattern: product.pattern,
      length: product.length,
      width: product.width,
      weight: product.weight,
      final_length: final_length || product.length,
      final_width: final_width || product.width,
      final_weight: final_weight || product.weight,
      batch_number: batch_number || `BATCH_${Date.now()}`,
      quality_grade: quality_grade,
      inspector: inspectorName,
      location: location,
      notes: notes || `Individual product created for ${product.name}`,
      production_date: production_date || new Date().toISOString().split('T')[0],
      completion_date: new Date().toISOString().split('T')[0],
      added_date: new Date().toISOString().split('T')[0],
      status: status
    });

    await individualProduct.save();

    // Update product's individual products count and current_stock
    product.individual_products_count += 1;
    
    // Sync current_stock with available individual products
    const availableCount = await IndividualProduct.countDocuments({
      product_id: product.id,
      status: 'available'
    });
    product.current_stock = availableCount;
    await product.save();

    // Log individual product generation
    await logIndividualProductGenerate(req, product, 1);

    res.status(201).json({
      success: true,
      data: individualProduct
    });
  } catch (error) {
    console.error('Error creating individual product:', error);
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
    const { status, limit = 50, offset = 0, batch_number, quality_grade, search, start_date, end_date } = req.query;

    let query = { product_id };

    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by batch_number if provided
    if (batch_number) {
      query.batch_number = batch_number;
    }

    // Filter by quality_grade if provided
    if (quality_grade && quality_grade !== 'all') {
      query.quality_grade = quality_grade;
    }

    // Filter by search term (QR code, ID, or inspector)
    if (search) {
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { qr_code: { $regex: escapedSearch, $options: 'i' } },
        { id: { $regex: escapedSearch, $options: 'i' } },
        { inspector: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    // Filter by date range (production_date, completion_date, or created_at)
    if (start_date || end_date) {
      const dateConditions = [];
      const dateQuery = {};
      
      if (start_date) {
        dateQuery.$gte = new Date(start_date);
      }
      if (end_date) {
        // Set end date to end of day
        const endDate = new Date(end_date);
        endDate.setHours(23, 59, 59, 999);
        dateQuery.$lte = endDate;
      }
      
      if (Object.keys(dateQuery).length > 0) {
        // Check if production_date, completion_date, or created_at falls within range
        dateConditions.push({ production_date: dateQuery });
        dateConditions.push({ completion_date: dateQuery });
        dateConditions.push({ created_at: dateQuery });
        
        // Combine with existing $or if present
        if (query.$or) {
          query.$and = [
            { $or: query.$or },
            { $or: dateConditions }
          ];
          delete query.$or;
        } else {
          query.$or = dateConditions;
        }
      }
    }

    const individualProducts = await IndividualProduct.find(query)
      .sort({ created_at: -1 })
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

    // Track which fields are being updated for detailed logging
    const fieldsBeingUpdated = {};
    const detailFields = ['length', 'width', 'height', 'weight', 'quality_grade', 'inspector', 'notes', 'location', 'serial_number'];

    detailFields.forEach(field => {
      if (updateData[field] !== undefined && individualProduct[field] !== updateData[field]) {
        fieldsBeingUpdated[field] = {
          old: individualProduct[field],
          new: updateData[field]
        };
      }
    });

    // Check if this is an initial detail fill (previously empty) or an update
    const isInitialFill = Object.keys(fieldsBeingUpdated).some(field =>
      !individualProduct[field] && updateData[field]
    );

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

    // Log detail updates or initial fills
    if (Object.keys(fieldsBeingUpdated).length > 0) {
      if (isInitialFill && Object.keys(fieldsBeingUpdated).every(f => !fieldsBeingUpdated[f].old)) {
        // All fields are new - this is an initial fill
        const filledFields = {};
        Object.keys(fieldsBeingUpdated).forEach(field => {
          filledFields[field] = fieldsBeingUpdated[field].new;
        });
        await logIndividualProductDetailsFill(req, individualProduct, filledFields);
      } else {
        // Log each field change separately for clarity
        for (const field of Object.keys(fieldsBeingUpdated)) {
          await logIndividualProductDetailUpdate(
            req,
            individualProduct,
            field,
            fieldsBeingUpdated[field].old,
            fieldsBeingUpdated[field].new
          );
        }
      }
    }

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

    // If product_id is provided, get stats for that specific product
    // Otherwise, get overall stats for all individual products
    const matchStage = product_id ? { $match: { product_id } } : { $match: {} };
    const countQuery = product_id ? { product_id } : {};

    const stats = await IndividualProduct.aggregate([
      matchStage,
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalCount = await IndividualProduct.countDocuments(countQuery);
    const availableCount = await IndividualProduct.countDocuments({
      ...countQuery,
      status: 'available'
    });
    const soldCount = await IndividualProduct.countDocuments({
      ...countQuery,
      status: 'sold'
    });
    const damagedCount = await IndividualProduct.countDocuments({
      ...countQuery,
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
