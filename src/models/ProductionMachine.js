import mongoose from 'mongoose';

const ProductionMachineSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  machine_name: { type: String, required: true },
  machine_type: { type: String, required: true },
  model_number: { type: String },
  serial_number: { type: String },
  manufacturer: { type: String },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'broken', 'retired'],
    default: 'active'
  },
  location: { type: String },
  department: { type: String },
  capacity_per_hour: { type: Number },
  capacity_unit: { type: String },
  current_operator: { type: String },
  last_maintenance_date: { type: Date },
  next_maintenance_date: { type: Date },
  maintenance_interval_days: { type: Number, default: 30 },
  operating_hours: { type: Number, default: 0 },
  total_operating_hours: { type: Number, default: 0 },
  efficiency_percentage: { type: Number, default: 100 },
  energy_consumption: { type: Number, default: 0 },
  energy_unit: { type: String, default: 'kWh' },
  maintenance_cost: { type: Number, default: 0 },
  hourly_rate: { type: Number, default: 0 },
  specifications: {
    power_rating: { type: String },
    voltage: { type: String },
    dimensions: { type: String },
    weight: { type: String },
    operating_temperature: { type: String },
    humidity_range: { type: String }
  },
  capabilities: [{
    process_type: { type: String, required: true },
    product_types: [{ type: String }],
    max_throughput: { type: Number },
    throughput_unit: { type: String },
    quality_grade: { type: String }
  }],
  maintenance_history: [{
    maintenance_type: { type: String, required: true },
    description: { type: String },
    performed_by: { type: String },
    performed_at: { type: Date },
    cost: { type: Number, default: 0 },
    parts_replaced: [{ type: String }],
    notes: { type: String }
  }],
  production_history: [{
    production_id: { type: String, required: true },
    batch_id: { type: String },
    product_name: { type: String },
    start_time: { type: Date },
    end_time: { type: Date },
    quantity_produced: { type: Number },
    efficiency: { type: Number },
    quality_grade: { type: String },
    operator: { type: String }
  }],
  alerts: [{
    alert_type: { type: String, required: true },
    message: { type: String, required: true },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['active', 'acknowledged', 'resolved'],
      default: 'active'
    },
    created_at: { type: Date, default: Date.now },
    acknowledged_by: { type: String },
    acknowledged_at: { type: Date },
    resolved_by: { type: String },
    resolved_at: { type: Date }
  }],
  notes: { type: String },
  created_by: { type: String, default: 'system' },
  updated_by: { type: String, default: 'system' }
}, {
  timestamps: true,
  collection: 'production_machines'
});

// Indexes for efficient querying
ProductionMachineSchema.index({ machine_name: 1 });
ProductionMachineSchema.index({ machine_type: 1 });
ProductionMachineSchema.index({ status: 1 });
ProductionMachineSchema.index({ location: 1 });
ProductionMachineSchema.index({ current_operator: 1 });
ProductionMachineSchema.index({ created_at: -1 });

const ProductionMachine = mongoose.model('ProductionMachine', ProductionMachineSchema);
export default ProductionMachine;
