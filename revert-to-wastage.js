import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Rajdhani';

async function revertToWastageStage() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Get all production batches
    const batches = await db.collection('production_batches').find({}).toArray();
    console.log(`\n📦 Found ${batches.length} production batches`);

    for (const batch of batches) {
      console.log(`\n🔄 Processing batch: ${batch.id}`);
      console.log(`   Current status: ${batch.status}`);

      // Update batch status to in_production
      await db.collection('production_batches').updateOne(
        { _id: batch._id },
        { 
          $set: { 
            status: 'in_production',
            updated_at: new Date()
          } 
        }
      );

      // Find the flow for this batch
      const flow = await db.collection('production_flows').findOne({
        $or: [
          { id: batch.id },
          { production_product_id: batch.id }
        ]
      });

      if (flow) {
        console.log(`   ✅ Found flow: ${flow.id}`);

        // Update flow status to active
        await db.collection('production_flows').updateOne(
          { _id: flow._id },
          { 
            $set: { 
              status: 'active',
              updated_at: new Date()
            } 
          }
        );

        // Get all flow steps for this flow
        const steps = await db.collection('production_flow_steps').find({
          flow_id: flow.id
        }).toArray();

        console.log(`   📋 Found ${steps.length} flow steps`);

        for (const step of steps) {
          console.log(`      - ${step.step_type}: ${step.status}`);
          
          // Mark machine steps as completed, wastage as pending
          if (step.step_type === 'machine_operation') {
            await db.collection('production_flow_steps').updateOne(
              { _id: step._id },
              { 
                $set: { 
                  status: 'completed',
                  updated_at: new Date()
                } 
              }
            );
            console.log(`      ✅ Set machine step to completed`);
          } else if (step.step_type === 'wastage_tracking') {
            await db.collection('production_flow_steps').updateOne(
              { _id: step._id },
              { 
                $set: { 
                  status: 'pending',
                  updated_at: new Date()
                } 
              }
            );
            console.log(`      ⏸️  Set wastage step to pending`);
          }
        }
      } else {
        console.log(`   ⚠️  No flow found for batch ${batch.id}`);
      }

      console.log(`   ✅ Batch ${batch.id} reverted to wastage stage`);
    }

    console.log('\n✅ All batches reverted to wastage stage!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

revertToWastageStage();
