import IndividualProduct from '../models/IndividualProduct.js';
import ProductionBatch from '../models/ProductionBatch.js';
import Product from '../models/Product.js';

/**
 * Get product demand analytics by month
 * Shows which products were sold most in each month
 */
export const getProductDemandByMonth = async (req, res) => {
  try {
    console.log('📊 getProductDemandByMonth called by user:', req.user?.email);
    const { months = 6 } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    // Get sold individual products grouped by product and month
    const soldProducts = await IndividualProduct.aggregate([
      {
        $match: {
          status: 'sold',
          updated_at: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            product_id: '$product_id',
            product_name: '$product_name',
            year: { $year: '$updated_at' },
            month: { $month: '$updated_at' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1, count: -1 }
      },
      {
        $limit: 50 // Top 50 product-month combinations
      }
    ]);

    res.json({
      success: true,
      data: soldProducts
    });
  } catch (error) {
    console.error('Error fetching product demand by month:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get most produced products
 * Shows which products have been produced most (COMPLETED production only)
 * Counts actual individual products created, not planned quantities
 */
export const getMostProducedProducts = async (req, res) => {
  try {
    console.log('📊 getMostProducedProducts called by user:', req.user?.email);
    const { limit = 10, months } = req.query;

    const matchCondition = {};

    // Add date filter if months specified
    if (months) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - parseInt(months));
      matchCondition.production_date = { $gte: startDate.toISOString().split('T')[0] };
    }

    // Count actual individual products created (completed production)
    const producedProducts = await IndividualProduct.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: {
            product_id: '$product_id',
            product_name: '$product_name'
          },
          total_quantity: { $sum: 1 },
          available: {
            $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
          },
          in_production: {
            $sum: { $cond: [{ $eq: ['$status', 'in_production'] }, 1, 0] }
          },
          sold: {
            $sum: { $cond: [{ $eq: ['$status', 'sold'] }, 1, 0] }
          },
          used: {
            $sum: { $cond: [{ $eq: ['$status', 'used'] }, 1, 0] }
          },
          damaged: {
            $sum: { $cond: [{ $eq: ['$status', 'damaged'] }, 1, 0] }
          }
        }
      },
      { $sort: { total_quantity: -1 } },
      { $limit: parseInt(limit) }
    ]);

    // Also get batch count and full product details for each product
    const productsWithDetails = await Promise.all(
      producedProducts.map(async (prod) => {
        const batchCount = await ProductionBatch.countDocuments({
          product_id: prod._id.product_id,
          status: 'completed'
        });

        // Get full product details
        const productDetails = await Product.findOne({ id: prod._id.product_id });

        return {
          ...prod,
          batch_count: batchCount,
          product_details: productDetails ? {
            category: productDetails.category,
            subcategory: productDetails.subcategory,
            length: productDetails.length,
            length_unit: productDetails.length_unit,
            width: productDetails.width,
            width_unit: productDetails.width_unit,
            weight: productDetails.weight,
            weight_unit: productDetails.weight_unit,
            color: productDetails.color,
            pattern: productDetails.pattern,
            unit: productDetails.unit
          } : null
        };
      })
    );

    console.log(`✅ Found ${productsWithDetails.length} produced products`);

    res.json({
      success: true,
      data: productsWithDetails
    });
  } catch (error) {
    console.error('Error fetching most produced products:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get monthly sales analytics
 * Shows sales trends month by month
 */
export const getMonthlySalesAnalytics = async (req, res) => {
  try {
    const { months = 12 } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    const monthlySales = await IndividualProduct.aggregate([
      {
        $match: {
          status: 'sold',
          updated_at: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$updated_at' },
            month: { $month: '$updated_at' }
          },
          total_sold: { $sum: 1 },
          products: { $addToSet: '$product_name' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Transform to include month names
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedData = monthlySales.map(item => ({
      year: item._id.year,
      month: item._id.month,
      month_name: monthNames[item._id.month - 1],
      label: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      total_sold: item.total_sold,
      unique_products: item.products.length
    }));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Error fetching monthly sales analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get monthly production analytics
 * Shows production trends month by month
 */
export const getMonthlyProductionAnalytics = async (req, res) => {
  try {
    const { months = 12 } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    const monthlyProduction = await ProductionBatch.aggregate([
      {
        $match: {
          created_at: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' }
          },
          total_batches: { $sum: 1 },
          total_quantity: { $sum: '$planned_quantity' },
          completed_batches: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          products: { $addToSet: '$product_name' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Transform to include month names
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedData = monthlyProduction.map(item => ({
      year: item._id.year,
      month: item._id.month,
      month_name: monthNames[item._id.month - 1],
      label: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      total_batches: item.total_batches,
      total_quantity: item.total_quantity,
      completed_batches: item.completed_batches,
      unique_products: item.products.length
    }));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Error fetching monthly production analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
