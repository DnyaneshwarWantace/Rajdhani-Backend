# Rajdhani Backend - MongoDB API

Complete MongoDB backend for Rajdhani production management system with full relationship handling.

## Setup

1. **Install MongoDB** (choose one):
   ```bash
   # macOS Local
   brew install mongodb-community
   brew services start mongodb-community

   # Or use MongoDB Atlas (cloud) - recommended
   ```

2. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment**:
   Update `.env` file:
   ```
   PORT=5000
   # For local MongoDB
   MONGODB_URI=mongodb://localhost:27017/rajdhani

   # For MongoDB Atlas (cloud)
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rajdhani?retryWrites=true&w=majority
   ```

4. **Start the server**:
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

## Database Structure & Relationships

### Collections

1. **suppliers** - Supplier information
2. **raw_materials** - Raw materials with supplier reference
3. **purchase_orders** - Purchase orders linking suppliers and materials

### Relationships

```
Supplier (1) ──→ (N) RawMaterial
    │
    └──→ (N) PurchaseOrder
              │
              └──→ Updates RawMaterial stock
```

## API Endpoints

### Raw Materials (`/api/raw-materials`)

- `POST /` - Create new raw material
- `GET /` - Get all raw materials (with filters)
  - Query params: `search`, `category`, `status`, `supplier_id`, `limit`, `offset`
- `GET /stats` - Get inventory statistics
- `GET /reorder` - Get materials requiring reorder
- `GET /:id` - Get raw material by ID
- `PUT /:id` - Update raw material
- `DELETE /:id` - Delete raw material

### Suppliers (`/api/suppliers`)

- `POST /` - Create new supplier
- `GET /` - Get all suppliers
  - Query params: `search`, `status`
- `GET /:id` - Get supplier by ID
- `GET /:id/stats` - Get supplier statistics (materials, orders, performance)
- `PUT /:id` - Update supplier
- `DELETE /:id` - Delete supplier (only if no materials associated)

### Purchase Orders (`/api/purchase-orders`)

- `POST /` - Create new purchase order
- `GET /` - Get all purchase orders (with filters)
  - Query params: `search`, `status`, `supplier_id`, `limit`, `offset`
- `GET /:id` - Get purchase order by ID
- `PUT /:id` - Update purchase order (handles status changes)
- `DELETE /:id` - Delete purchase order

## Business Logic

### Purchase Order Status Flow

1. **pending** → Order created
   - Raw material created with 0 stock

2. **approved** → Order approved
   - Raw material status → `in-transit`
   - Supplier `total_orders` incremented

3. **shipped** → Order shipped
   - Material remains `in-transit`

4. **delivered** → Order delivered
   - Raw material stock updated (added)
   - Material status recalculated (`in-stock`, `low-stock`, `out-of-stock`)
   - Supplier performance rating updated

5. **cancelled** → Order cancelled
   - Material status reverted to appropriate state

### Automatic Calculations

- **Raw Material Status**: Auto-calculated based on stock levels
  - `out-of-stock`: stock = 0
  - `low-stock`: stock ≤ min_threshold
  - `overstock`: stock > max_capacity
  - `in-stock`: otherwise
  - `in-transit`: order approved but not delivered

- **Total Value**: `current_stock × cost_per_unit` (auto-calculated)

- **Supplier Performance**: Updated on each delivered order

## Frontend Integration

1. **Add to frontend `.env`**:
   ```
   VITE_API_URL=http://localhost:5000/api
   ```

2. **Use new services**:
   ```typescript
   import { RawMaterialService } from '@/services/api/rawMaterialService';
   import { SupplierService } from '@/services/api/supplierService';
   import { PurchaseOrderService } from '@/services/api/purchaseOrderService';
   ```

## Testing with curl

```bash
# Create supplier
curl -X POST http://localhost:5000/api/suppliers \
  -H "Content-Type: application/json" \
  -d '{"id":"SUP001","name":"ABC Textiles","phone":"1234567890"}'

# Create raw material
curl -X POST http://localhost:5000/api/raw-materials \
  -H "Content-Type: application/json" \
  -d '{"id":"RM001","name":"Cotton","category":"Fabric","current_stock":100,"unit":"kg","min_threshold":20,"max_capacity":500,"reorder_point":30,"supplier_id":"SUP001","supplier_name":"ABC Textiles","cost_per_unit":50}'

# Create purchase order
curl -X POST http://localhost:5000/api/purchase-orders \
  -H "Content-Type: application/json" \
  -d '{"id":"PO001","order_number":"PO-001","supplier_id":"SUP001","supplier_name":"ABC Textiles","order_date":"2025-10-23","total_amount":5000,"status":"pending","material_details":{"materialName":"Cotton","quantity":100,"unit":"kg","costPerUnit":50}}'

# Update order to delivered
curl -X PUT http://localhost:5000/api/purchase-orders/PO001 \
  -H "Content-Type: application/json" \
  -d '{"status":"delivered"}'
```

## Current Status

✅ Raw materials CRUD with supplier references
✅ Supplier management with relationship tracking
✅ Purchase orders with automatic stock updates
✅ Status flow automation (pending → approved → delivered)
✅ Supplier performance tracking
✅ Inventory statistics
✅ Reorder point tracking
