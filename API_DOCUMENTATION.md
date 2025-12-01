# 🏭 Rajdhani Backend API Documentation
## Raw Materials, Suppliers & Stock Management System

### 📋 **Base URL**
```
https://rajdhani.wantace.com/api
```

---

## 🏭 **SUPPLIERS API**

### **Create Supplier**
```http
POST /api/suppliers
Content-Type: application/json

{
  "name": "ABC Textiles Ltd",
  "contact_person": "John Doe",
  "email": "john@abctextiles.com",
  "phone": "+91-9876543210",
  "address": "123 Industrial Area",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "gst_number": "27ABCDE1234F1Z5"
}
```

### **Get All Suppliers**
```http
GET /api/suppliers?search=ABC&status=active&limit=50&offset=0
```

### **Get Supplier by ID**
```http
GET /api/suppliers/{id}
```

### **Update Supplier**
```http
PUT /api/suppliers/{id}
Content-Type: application/json

{
  "name": "Updated Name",
  "performance_rating": 8.5
}
```

### **Get Supplier Statistics**
```http
GET /api/suppliers/{id}/stats
```

### **Delete Supplier**
```http
DELETE /api/suppliers/{id}
```

---

## 📦 **RAW MATERIALS API**

### **Create Raw Material**
```http
POST /api/raw-materials
Content-Type: application/json

{
  "name": "Cotton Fabric - Premium",
  "type": "fabric",
  "category": "cotton",
  "current_stock": 1000,
  "unit": "meters",
  "min_threshold": 100,
  "max_capacity": 5000,
  "reorder_point": 200,
  "cost_per_unit": 150,
  "supplier_name": "ABC Textiles Ltd"
}
```

### **Get All Raw Materials**
```http
GET /api/raw-materials?search=cotton&type=fabric&category=cotton&status=in-stock&supplier_id=SUP_123&limit=50&offset=0
```

### **Get Raw Material by ID**
```http
GET /api/raw-materials/{id}
```

### **Update Raw Material**
```http
PUT /api/raw-materials/{id}
Content-Type: application/json

{
  "current_stock": 1500,
  "cost_per_unit": 160
}
```

### **Adjust Stock**
```http
POST /api/raw-materials/{id}/adjust-stock
Content-Type: application/json

{
  "quantity": 500,
  "reason": "purchase",
  "operator": "warehouse_manager",
  "notes": "Stock received from supplier"
}
```

### **Get Stock History**
```http
GET /api/raw-materials/{id}/history?limit=50&offset=0
```

### **Get Stock Status Overview**
```http
GET /api/raw-materials/status
```

### **Get Inventory Statistics**
```http
GET /api/raw-materials/stats
```

### **Get Materials Requiring Reorder**
```http
GET /api/raw-materials/reorder
```

### **Delete Raw Material**
```http
DELETE /api/raw-materials/{id}
```

---

## 🛒 **PURCHASE ORDERS API**

### **Create Purchase Order**
```http
POST /api/purchase-orders
Content-Type: application/json

{
  "supplier_id": "SUP_123",
  "supplier_name": "ABC Textiles Ltd",
  "expected_delivery": "2024-02-15",
  "items": [
    {
      "material_id": "MAT_456",
      "material_name": "Cotton Fabric - Premium",
      "quantity": 2000,
      "unit": "meters",
      "unit_price": 150,
      "specifications": "White, 180 GSM, A+ Grade"
    }
  ],
  "pricing": {
    "tax_rate": 18,
    "discount_amount": 5000
  },
  "delivery": {
    "address": {
      "street": "456 Factory Road",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001"
    },
    "contact_person": "Warehouse Manager",
    "phone": "+91-9876543210"
  }
}
```

### **Get All Purchase Orders**
```http
GET /api/purchase-orders?search=PO-2024&status=pending&supplier_id=SUP_123&limit=50&offset=0
```

### **Get Purchase Order by ID**
```http
GET /api/purchase-orders/{id}
```

### **Update Purchase Order**
```http
PUT /api/purchase-orders/{id}
Content-Type: application/json

{
  "status": "approved",
  "notes": "Approved by manager"
}
```

### **Approve Purchase Order**
```http
POST /api/purchase-orders/{id}/approve
Content-Type: application/json

{
  "approved_by": "manager_name",
  "notes": "Approved for delivery"
}
```

### **Mark as Delivered**
```http
POST /api/purchase-orders/{id}/deliver
```

### **Update Order Status**
```http
PUT /api/purchase-orders/{orderId}/status
Content-Type: application/json

{
  "newStatus": "shipped"
}
```

### **Get Purchase Order Statistics**
```http
GET /api/purchase-orders/stats
```

### **Delete Purchase Order**
```http
DELETE /api/purchase-orders/{id}
```

---

## 📊 **RESPONSE FORMATS**

### **Success Response**
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully"
}
```

### **Error Response**
```json
{
  "success": false,
  "error": "Error message description"
}
```

### **Paginated Response**
```json
{
  "success": true,
  "data": [
    // Array of items
  ],
  "count": 150,
  "limit": 50,
  "offset": 0
}
```

---

## 🔧 **ENVIRONMENT SETUP**

### **Required Environment Variables**
```env
MONGODB_URI=mongodb://localhost:27017/rajdhani
PORT=5000
NODE_ENV=development
```

### **Installation & Setup**
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

### **Health Check**
```http
GET /health
```

---

## 📈 **BUSINESS WORKFLOWS**

### **1. Supplier Management Workflow**
1. **Create Supplier** → `POST /api/suppliers`
2. **Update Performance** → `PUT /api/suppliers/{id}`
3. **View Statistics** → `GET /api/suppliers/{id}/stats`

### **2. Raw Material Management Workflow**
1. **Create Material** → `POST /api/raw-materials`
2. **Monitor Stock** → `GET /api/raw-materials/status`
3. **Adjust Stock** → `POST /api/raw-materials/{id}/adjust-stock`
4. **View History** → `GET /api/raw-materials/{id}/history`

### **3. Purchase Order Workflow**
1. **Create Order** → `POST /api/purchase-orders`
2. **Approve Order** → `POST /api/purchase-orders/{id}/approve`
3. **Mark Delivered** → `POST /api/purchase-orders/{id}/deliver`
4. **Stock Auto-Updated** → Automatic stock movement tracking

### **4. Stock Management Workflow**
1. **Check Reorder Alerts** → `GET /api/raw-materials/reorder`
2. **Create Purchase Order** → `POST /api/purchase-orders`
3. **Receive Delivery** → `POST /api/purchase-orders/{id}/deliver`
4. **Stock Automatically Updated** → Stock movements recorded

---

## 🚨 **ERROR CODES**

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid data |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error |

---

## 📝 **NOTES**

- All timestamps are in ISO format
- All monetary values are in the base currency
- Stock movements are automatically tracked
- Purchase order totals are automatically calculated
- Supplier performance is automatically updated
- All IDs are auto-generated with prefixes (SUP_, MAT_, PO_, SM_)

---

## 🔄 **AUTOMATIC FEATURES**

✅ **Auto-generated IDs** for all entities
✅ **Automatic stock status** calculation
✅ **Automatic total value** calculation
✅ **Automatic purchase order** totals
✅ **Automatic stock movement** tracking
✅ **Automatic supplier performance** updates
✅ **Automatic reorder point** alerts
