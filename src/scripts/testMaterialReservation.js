import mongoose from 'mongoose';
import RawMaterial from '../models/RawMaterial.js';
import MaterialConsumption from '../models/MaterialConsumption.js';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Customer from '../models/Customer.js';
import { generateOrderId, generateOrderNumber, generateOrderItemId } from '../utils/idGenerator.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables - try multiple paths
const envPaths = [
  join(__dirname, '../../.env'),
  join(__dirname, '../../../.env'),
  '.env'
];

let envLoaded = false;
for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    envLoaded = true;
    break;
  }
}

const testMaterialReservation = async (materialId, customerId, quantity) => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check customer exists
    console.log(`🔍 Checking customer: ${customerId}`);
    const customer = await Customer.findOne({ id: customerId });
    if (!customer) {
      console.log(`❌ Customer with ID "${customerId}" not found.`);
      await mongoose.disconnect();
      return;
    }
    console.log(`✅ Customer found: ${customer.name}\n`);

    // Check material exists
    console.log(`🔍 Checking material: ${materialId}`);
    const material = await RawMaterial.findOne({ id: materialId });
    if (!material) {
      console.log(`❌ Material with ID "${materialId}" not found.`);
      await mongoose.disconnect();
      return;
    }
    console.log(`✅ Material found: ${material.name} (${material.current_stock} ${material.unit} available)\n`);

    // Show initial stock
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 INITIAL STOCK STATUS');
    console.log('═══════════════════════════════════════════════════════════');
    const initialConsumption = await MaterialConsumption.aggregate([
      {
        $match: {
          material_id: materialId,
          material_type: 'raw_material',
          status: 'active'
        }
      },
      {
        $group: {
          _id: '$consumption_status',
          total: { $sum: '$quantity_used' }
        }
      }
    ]);

    const initialBreakdown = {
      in_production: 0,
      reserved: 0,
      used: 0,
      sold: 0
    };

    initialConsumption.forEach(item => {
      const status = item._id || 'in_production';
      initialBreakdown[status] = item.total || 0;
    });

    console.log(`Current Stock:   ${material.current_stock} ${material.unit}`);
    console.log(`Reserved:        ${initialBreakdown.reserved} ${material.unit}`);
    console.log(`In Production:   ${initialBreakdown.in_production} ${material.unit}`);
    console.log(`Available:       ${material.current_stock - initialBreakdown.reserved - initialBreakdown.in_production} ${material.unit}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Generate order ID and order number
    const orderId = await generateOrderId();
    const orderNumber = await generateOrderNumber();
    
    // Calculate pricing
    const unitPrice = material.cost_per_unit;
    const subtotal = unitPrice * quantity;
    const gstRate = 18;
    const gstAmount = (subtotal * gstRate) / (100 + gstRate);
    const totalAmount = subtotal;
    
    // Create order
    console.log('📦 Creating order...');
    const orderData = {
      id: orderId,
      order_number: orderNumber,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_email: customer.email || '',
      customer_phone: customer.phone || '',
      order_date: new Date(),
      status: 'pending',
      subtotal: subtotal.toString(),
      gst_rate: gstRate.toString(),
      gst_amount: gstAmount.toString(),
      gst_included: true,
      discount_amount: '0.00',
      total_amount: totalAmount.toString(),
      paid_amount: '0.00',
      outstanding_amount: totalAmount.toString(),
      priority: 'medium',
      created_by: 'system'
    };

    const newOrder = await Order.create(orderData);
    console.log(`✅ Order created: ${orderNumber} (ID: ${orderId}, Status: ${newOrder.status})\n`);

    // Create order item
    const orderItemId = await generateOrderItemId();
    const orderItem = await OrderItem.create({
      id: orderItemId,
      order_id: orderId,
      product_id: '',
      raw_material_id: material.id,
      product_name: material.name,
      product_type: 'raw_material',
      quantity: quantity,
      unit: material.unit,
      unit_price: unitPrice.toString(),
      gst_rate: gstRate.toString(),
      gst_included: true,
      subtotal: subtotal.toString(),
      gst_amount: gstAmount.toString(),
      total_price: totalAmount.toString(),
      pricing_unit: 'unit',
      unit_value: unitPrice.toString()
    });
    console.log(`✅ Order item created: ${orderItemId} (${quantity} ${material.unit})\n`);

    // Check stock after order creation (should still be same - no reservation yet)
    console.log('📊 STOCK AFTER ORDER CREATION (Pending):');
    console.log('───────────────────────────────────────────────────────────');
    const afterCreateConsumption = await MaterialConsumption.aggregate([
      {
        $match: {
          material_id: materialId,
          material_type: 'raw_material',
          status: 'active'
        }
      },
      {
        $group: {
          _id: '$consumption_status',
          total: { $sum: '$quantity_used' }
        }
      }
    ]);

    const afterCreateBreakdown = {
      in_production: 0,
      reserved: 0,
      used: 0,
      sold: 0
    };

    afterCreateConsumption.forEach(item => {
      const status = item._id || 'in_production';
      afterCreateBreakdown[status] = item.total || 0;
    });

    console.log(`Reserved:        ${afterCreateBreakdown.reserved} ${material.unit}`);
    console.log(`Available:       ${material.current_stock - afterCreateBreakdown.reserved - afterCreateBreakdown.in_production} ${material.unit}`);
    console.log('───────────────────────────────────────────────────────────\n');

    // Update order status to accepted
    console.log('🔄 Updating order status to "accepted"...');
    const updatedOrder = await Order.findOneAndUpdate(
      { id: orderId },
      { 
        status: 'accepted',
        updated_at: new Date()
      },
      { new: true }
    );
    console.log(`✅ Order status updated to: ${updatedOrder.status}\n`);

    // Wait a moment for any async operations
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check stock after acceptance
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 STOCK AFTER ORDER ACCEPTANCE');
    console.log('═══════════════════════════════════════════════════════════');
    
    // Refresh material
    const updatedMaterial = await RawMaterial.findOne({ id: materialId });
    
    const afterAcceptConsumption = await MaterialConsumption.aggregate([
      {
        $match: {
          material_id: materialId,
          material_type: 'raw_material',
          status: 'active'
        }
      },
      {
        $group: {
          _id: '$consumption_status',
          total: { $sum: '$quantity_used' }
        }
      }
    ]);

    const afterAcceptBreakdown = {
      in_production: 0,
      reserved: 0,
      used: 0,
      sold: 0
    };

    afterAcceptConsumption.forEach(item => {
      const status = item._id || 'in_production';
      afterAcceptBreakdown[status] = item.total || 0;
    });

    const availableAfter = updatedMaterial.current_stock - afterAcceptBreakdown.reserved - afterAcceptBreakdown.in_production;

    console.log(`Current Stock:   ${updatedMaterial.current_stock} ${material.unit}`);
    console.log(`Reserved:        ${afterAcceptBreakdown.reserved} ${material.unit}`);
    console.log(`In Production:   ${afterAcceptBreakdown.in_production} ${material.unit}`);
    console.log(`Available:       ${availableAfter} ${material.unit}`);
    console.log('───────────────────────────────────────────────────────────');
    
    if (afterAcceptBreakdown.reserved >= quantity) {
      console.log(`✅ SUCCESS: ${quantity} ${material.unit} is now reserved!`);
    } else {
      console.log(`⚠️  WARNING: Expected ${quantity} ${material.unit} reserved, but found ${afterAcceptBreakdown.reserved} ${material.unit}`);
      console.log('   This might mean the reservation logic needs to be triggered.');
    }
    console.log('═══════════════════════════════════════════════════════════\n');

    // Check for consumption records
    const consumptionRecords = await MaterialConsumption.find({
      material_id: materialId,
      order_id: orderId,
      status: 'active'
    });

    if (consumptionRecords.length > 0) {
      console.log('📋 MaterialConsumption Records Created:');
      consumptionRecords.forEach(record => {
        console.log(`   - ID: ${record.id}`);
        console.log(`     Status: ${record.consumption_status}`);
        console.log(`     Quantity: ${record.quantity_used} ${record.unit}`);
      });
    } else {
      console.log('⚠️  No MaterialConsumption records found for this order.');
      console.log('   Reservation might be tracked differently or needs to be created.');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Get parameters from command line
const materialId = process.argv[2] || 'MAT-251224-121';
const customerId = process.argv[3] || 'CUST-global-016';
const quantity = parseFloat(process.argv[4]) || 50;

console.log(`\n🧪 Testing Material Reservation`);
console.log(`   Material: ${materialId}`);
console.log(`   Customer: ${customerId}`);
console.log(`   Quantity: ${quantity}\n`);

testMaterialReservation(materialId, customerId, quantity);

