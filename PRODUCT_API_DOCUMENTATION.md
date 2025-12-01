# 🏭 **PRODUCT MANAGEMENT API DOCUMENTATION**
## Complete Product & Individual Product Tracking System

### 📋 **Base URL**
```
https://rajdhani.wantace.com/api
```

---

## 🏭 **PRODUCTS API (Base Products)**

### **Create Product**
```http
POST /api/products
Content-Type: application/json

{
  "name": "Premium Carpet - Floral Design",
  "category": "Carpet",
  "length": "10",
  "length_unit": "feet",
  "width": "8",
  "width_unit": "feet",
  "thickness": "5",
  "thickness_unit": "mm",
  "weight": "800",
  "weight_unit": "GSM",
  "color": "Red",
  "pattern": "Floral",
  "unit": "pieces",
  "base_price": 5000,
  "selling_price": 7500,
  "reorder_point": 5,
  "individual_stock_tracking": true,
  "has_recipe": true
}
```

### **Get All Products**
```http
GET /api/products?search=premium&category=Carpet&status=active&individual_stock_tracking=true&limit=50&offset=0
```

### **Get Product by ID**
```http
GET /api/products/{id}
```

### **Update Product**
```http
PUT /api/products/{id}
Content-Type: application/json

{
  "name": "Updated Product Name",
  "selling_price": 8000,
  "status": "active"
}
```

### **Toggle Individual Stock Tracking**
```http
PATCH /api/products/{id}/toggle-individual-tracking
```

### **Get Product Statistics**
```http
GET /api/products/stats
```

### **Get Product Dropdown Data**
```http
GET /api/products/dropdown-data
```

### **Delete Product**
```http
DELETE /api/products/{id}
```

---

## 📦 **INDIVIDUAL PRODUCTS API**

### **Create Individual Products (Bulk)**
```http
POST /api/individual-products/bulk
Content-Type: application/json

{
  "product_id": "PROD_123",
  "quantity": 10,
  "batch_number": "BATCH_2024_001",
  "quality_grade": "A+",
  "notes": "High quality batch"
}
```

### **Get Individual Products by Product ID**
```http
GET /api/individual-products/product/{product_id}?status=available&limit=50&offset=0
```

### **Get Individual Product by ID**
```http
GET /api/individual-products/{id}
```

### **Get Individual Product by QR Code**
```http
GET /api/individual-products/qr/{qr_code}
```

### **Update Individual Product**
```http
PUT /api/individual-products/{id}
Content-Type: application/json

{
  "status": "sold",
  "sold_to": "Customer Name",
  "sale_price": 7500,
  "current_location": "shipped"
}
```

### **Update Individual Product Status**
```http
PATCH /api/individual-products/{id}/status
Content-Type: application/json

{
  "status": "sold",
  "notes": "Sold to customer",
  "location": "shipped"
}
```

### **Add Defect to Individual Product**
```http
POST /api/individual-products/{id}/defects
Content-Type: application/json

{
  "type": "minor",
  "description": "Small stain on corner",
  "reported_by": "Quality Inspector"
}
```

### **Fix Defect**
```http
PATCH /api/individual-products/{id}/defects/{defect_index}/fix
Content-Type: application/json

{
  "fixed_by": "Repair Technician"
}
```

### **Get Individual Product Statistics**
```http
GET /api/individual-products/stats/{product_id}
```

### **Delete Individual Product**
```http
DELETE /api/individual-products/{id}
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

### **Bulk Creation Response**
```json
{
  "success": true,
  "data": {
    "created_count": 10,
    "product_id": "PROD_123",
    "product_name": "Premium Carpet",
    "batch_number": "BATCH_2024_001",
    "individual_products": [
      {
        "id": "IP_456",
        "qr_code": "QR_789",
        "serial_number": "PROD_123_1703123456789_1",
        "status": "available"
      }
      // ... more products
    ]
  }
}
```

---

## 🎯 **BUSINESS WORKFLOWS**

### **1. Product Creation Workflow**
```javascript
// 1. Get dropdown data for form
GET /api/products/dropdown-data

// 2. Create base product
POST /api/products
{
  "name": "Premium Carpet",
  "category": "Carpet",
  "length": "10",
  "length_unit": "feet",
  "width": "8",
  "width_unit": "feet",
  "color": "Red",
  "pattern": "Floral",
  "unit": "pieces",
  "individual_stock_tracking": true
}

// 3. Enable individual tracking (if not done during creation)
PATCH /api/products/{id}/toggle-individual-tracking
```

### **2. Individual Product Creation Workflow**
```javascript
// 1. Create individual products in bulk
POST /api/individual-products/bulk
{
  "product_id": "PROD_123",
  "quantity": 50,
  "batch_number": "BATCH_2024_001",
  "quality_grade": "A+"
}

// 2. Check created individual products
GET /api/individual-products/product/PROD_123?status=available
```

### **3. Product Sales Workflow**
```javascript
// 1. Get available individual products
GET /api/individual-products/product/PROD_123?status=available

// 2. Mark individual product as sold
PATCH /api/individual-products/{id}/status
{
  "status": "sold",
  "sold_to": "Customer Name",
  "sale_price": 7500
}
```

### **4. Quality Control Workflow**
```javascript
// 1. Add defect to individual product
POST /api/individual-products/{id}/defects
{
  "type": "minor",
  "description": "Small stain",
  "reported_by": "Quality Inspector"
}

// 2. Fix defect
PATCH /api/individual-products/{id}/defects/0/fix
{
  "fixed_by": "Repair Technician"
}
```

---

## 🔧 **DROPDOWN INTEGRATION**

### **Product Dropdown Categories**
- **Categories**: Carpet, Rug, Mat, Runner, Tile
- **Units**: pieces, rolls, sets, sqm, sqft
- **Colors**: Red, Blue, Green, Yellow, Black, White, Gray, Brown, Beige, Cream, Navy, Maroon, Multi-Color
- **Patterns**: Plain, Floral, Geometric, Striped, Abstract, Traditional, Modern, Oriental, Checkered, Damask
- **Length Units**: feet, m, cm, inch, yard
- **Width Units**: feet, m, cm, inch
- **Thickness Units**: mm, cm, inch, micron
- **Weight Units**: GSM, kg, g, ton

### **Individual Product Statuses**
- **available**: Ready for sale
- **sold**: Sold to customer
- **damaged**: Has defects
- **returned**: Returned by customer
- **in_production**: Being manufactured
- **quality_check**: Under quality inspection

---

## 📈 **AUTOMATIC FEATURES**

✅ **Auto-generated IDs** for all products and individual products
✅ **Auto-generated QR codes** for individual products
✅ **Auto-generated serial numbers** with timestamps
✅ **Automatic stock counting** for individual products
✅ **Automatic status tracking** with timestamps
✅ **Automatic sale price** inheritance from base product
✅ **Automatic batch numbering** with timestamps
✅ **Dropdown validation** for all product fields

---

## 🚨 **VALIDATION RULES**

### **Product Validation**
- **Name**: Required, unique
- **Category**: Must be from dropdown
- **Length/Width**: Required for sqm calculation
- **Units**: Must be from dropdown
- **Colors/Patterns**: Must be from dropdown (if provided)

### **Individual Product Validation**
- **Product ID**: Must exist and have individual tracking enabled
- **Quantity**: 1-1000 for bulk creation
- **Status**: Must be valid status
- **QR Code**: Auto-generated, unique

---

## 📊 **STATISTICS & ANALYTICS**

### **Product Statistics**
- Total products count
- Active/inactive/discontinued breakdown
- Individual tracking enabled products
- Low stock products
- Total stock value

### **Individual Product Statistics**
- Total individual products per product
- Status breakdown (available, sold, damaged, etc.)
- Sales performance
- Quality metrics

---

## 🔄 **INTEGRATION WITH EXISTING SYSTEMS**

### **Raw Materials Integration**
- Products can have recipes (raw materials)
- Stock movements tracked for production
- Cost calculation from raw materials

### **Supplier Integration**
- Products can be linked to suppliers
- Supplier performance affects product quality
- Purchase orders for raw materials

### **Stock Management Integration**
- Automatic stock updates
- Reorder point alerts
- Inventory tracking

---

## 🎉 **READY TO USE**

Your complete product management system is now ready with:

✅ **Base Product Management** with dropdown validation
✅ **Individual Product Tracking** with QR codes
✅ **Bulk Product Creation** for efficient operations
✅ **Quality Control** with defect tracking
✅ **Sales Management** with status tracking
✅ **Statistics & Analytics** for business insights
✅ **Complete API Documentation** for easy integration

**Total API Endpoints: 20+ covering all product operations!** 🚀
