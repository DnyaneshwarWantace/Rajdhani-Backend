import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function checkOrderItems() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('Rajdhani');
    
    // Check the specific order
    const order = await db.collection('orders').findOne({ id: 'ORD-251028-006' });
    console.log('Order found:', order ? 'Yes' : 'No');
    if (order) {
      console.log('Order ID:', order.id);
      console.log('Order Number:', order.order_number);
    }
    
    // Check order items for this order
    const orderItems = await db.collection('orderitems').find({ order_id: 'ORD-251028-006' }).toArray();
    console.log('Order items found:', orderItems.length);
    
    if (orderItems.length > 0) {
      console.log('Order items:', orderItems);
    } else {
      // Check all order items to see what's there
      const allOrderItems = await db.collection('orderitems').find({}).toArray();
      console.log('Total order items in database:', allOrderItems.length);
      if (allOrderItems.length > 0) {
        console.log('Sample order item:', allOrderItems[0]);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkOrderItems();
