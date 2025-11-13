import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function createTestOrderWithItems() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('Rajdhani');
    
    // Create a test order item
    const testOrderItem = {
      id: 'ORDITEM-TEST-001',
      order_id: 'ORD-251028-006',
      product_id: 'PRO-251028-016',
      product_name: 'Test Product',
      product_type: 'product',
      quantity: 2,
      unit_price: '7000',
      total_price: '14000',
      quality_grade: 'A',
      specifications: null,
      selected_individual_products: []
    };
    
    const result = await db.collection('orderitems').insertOne(testOrderItem);
    console.log('Order item created:', result.insertedId);
    
    // Check if it was created
    const orderItems = await db.collection('orderitems').find({ order_id: 'ORD-251028-006' }).toArray();
    console.log('Order items now:', orderItems.length);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

createTestOrderWithItems();
