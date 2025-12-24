require('dotenv').config();
const mongoose = require('mongoose');

const IndividualProductSchema = new mongoose.Schema({}, { strict: false, collection: 'individual_products' });
const IndividualProduct = mongoose.model('IndividualProduct', IndividualProductSchema);

async function checkProduct() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const products = await IndividualProduct.find({ product_id: 'PRO-251217-001' });

    console.log(`\nTotal individual products: ${products.length}`);
    console.log('\nStatus breakdown:');

    const statusCount = {};
    products.forEach(p => {
      const status = p.status || 'unknown';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    Object.keys(statusCount).sort().forEach(status => {
      console.log(`  ${status}: ${statusCount[status]}`);
    });

    const availableCount = statusCount.available || 0;
    console.log(`\n✅ Available products: ${availableCount}`);
    console.log(`📦 Total products: ${products.length}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkProduct();
