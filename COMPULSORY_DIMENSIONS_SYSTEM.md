# 📏 **COMPULSORY DIMENSIONS SYSTEM**
## Automatic SQM Calculation with Required Length & Width

### **📋 Overview**
The system now **enforces compulsory length and width** for all products to enable automatic SQM calculation for recipes. This ensures accurate material calculations based on product dimensions.

---

## **🔒 COMPULSORY FIELDS**

### **✅ Required Product Fields:**
```javascript
{
  "name": "Premium Carpet",
  "category": "degital print",
  "length": "10",           // ✅ COMPULSORY
  "length_unit": "feet",    // ✅ COMPULSORY
  "width": "8",             // ✅ COMPULSORY  
  "width_unit": "feet",     // ✅ COMPULSORY
  "unit": "GSM",
  "individual_stock_tracking": true
}
```

### **❌ Validation Errors:**
```javascript
// Missing length
{
  "error": "Length is required for SQM calculation"
}

// Missing width
{
  "error": "Width is required for SQM calculation"
}

// Missing length_unit
{
  "error": "Length unit is required for SQM calculation"
}

// Missing width_unit
{
  "error": "Width unit is required for SQM calculation"
}

// Invalid units
{
  "error": "Invalid length unit. Must be one of: feet, m, cm, mm, inch, yard"
}
```

---

## **📐 AUTOMATIC SQM CALCULATION**

### **✅ Built-in Virtual Fields:**
Every product now automatically includes:

```javascript
{
  "id": "PROD_123",
  "name": "Premium Carpet",
  "length": "10",
  "width": "8", 
  "length_unit": "feet",
  "width_unit": "feet",
  "sqm": 7.432,                    // ✅ Auto-calculated
  "dimensions_display": "10 feet × 8 feet"  // ✅ Auto-formatted
}
```

### **🔢 SQM Calculation Logic:**
```javascript
// Example: 10 feet × 8 feet
// 1. Convert to meters: 10 × 0.3048 = 3.048m, 8 × 0.3048 = 2.438m
// 2. Calculate SQM: 3.048 × 2.438 = 7.432 SQM
// 3. Round to 4 decimal places: 7.4320
```

### **📏 Supported Units:**
| Unit | Conversion Factor | Example |
|------|------------------|---------|
| **feet** | × 0.3048 | 10 feet = 3.048m |
| **m** | × 1 | 3m = 3m |
| **cm** | × 0.01 | 300cm = 3m |
| **mm** | × 0.001 | 3000mm = 3m |
| **inch** | × 0.0254 | 120 inch = 3.048m |
| **yard** | × 0.9144 | 3.33 yard = 3.048m |

---

## **🚀 API EXAMPLES**

### **✅ Create Product (Compulsory Dimensions)**
```http
POST /api/products
Content-Type: application/json

{
  "name": "Premium Carpet",
  "category": "degital print",
  "length": "10",
  "length_unit": "feet",
  "width": "8", 
  "width_unit": "feet",
  "color": "Blue",
  "pattern": "Abstract",
  "unit": "GSM",
  "individual_stock_tracking": true,
  "min_stock_level": 10,
  "max_stock_level": 1000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "PROD_123",
    "name": "Premium Carpet",
    "length": "10",
    "width": "8",
    "length_unit": "feet",
    "width_unit": "feet",
    "sqm": 7.432,
    "dimensions_display": "10 feet × 8 feet",
    "category": "degital print",
    "color": "Blue",
    "pattern": "Abstract",
    "unit": "GSM",
    "individual_stock_tracking": true,
    "has_recipe": false,
    "status": "in-stock"
  }
}
```

### **✅ Create Recipe (Auto SQM)**
```http
POST /api/recipes
Content-Type: application/json

{
  "product_id": "PROD_123",
  "materials": [
    {
      "material_id": "MAT_456",
      "material_name": "Cotton Yarn",
      "material_type": "raw_material",
      "quantity_per_sqm": 0.5,
      "unit": "kg",
      "cost_per_unit": 200
    }
  ],
  "description": "Premium carpet recipe",
  "created_by": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recipe": {
      "id": "REC_123",
      "product_id": "PROD_123",
      "product_name": "Premium Carpet",
      "base_unit": "sqm",
      "total_cost_per_sqm": 100
    },
    "materials": [
      {
        "id": "RM_456",
        "material_id": "MAT_456",
        "material_name": "Cotton Yarn",
        "quantity_per_sqm": 0.5,
        "unit": "kg",
        "cost_per_unit": 200,
        "total_cost_per_sqm": 100
      }
    ],
    "product_sqm": 7.432,
    "total_cost_per_sqm": 100
  }
}
```

### **✅ Calculate Production Materials**
```http
POST /api/recipes/calculate
Content-Type: application/json

{
  "product_id": "PROD_123",
  "production_quantity": 100
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": "PROD_123",
      "name": "Premium Carpet",
      "length": "10",
      "width": "8",
      "length_unit": "feet",
      "width_unit": "feet",
      "sqm_per_unit": 7.432
    },
    "production": {
      "quantity": 100,
      "total_sqm": 743.2,
      "total_cost": 74320
    },
    "materials": [
      {
        "material_id": "MAT_456",
        "material_name": "Cotton Yarn",
        "quantity_per_sqm": 0.5,
        "total_quantity_needed": 371.6,
        "unit": "kg",
        "total_cost": 74320
      }
    ]
  }
}
```

---

## **🔧 VALIDATION RULES**

### **✅ Product Creation Validation:**
```javascript
// 1. Length is required and cannot be empty
if (!productData.length || productData.length.trim() === '') {
  return error('Length is required for SQM calculation');
}

// 2. Width is required and cannot be empty  
if (!productData.width || productData.width.trim() === '') {
  return error('Width is required for SQM calculation');
}

// 3. Length unit is required and must be valid
if (!productData.length_unit || !validLengthUnits.includes(productData.length_unit)) {
  return error('Invalid length unit. Must be one of: feet, m, cm, mm, inch, yard');
}

// 4. Width unit is required and must be valid
if (!productData.width_unit || !validWidthUnits.includes(productData.width_unit)) {
  return error('Invalid width unit. Must be one of: feet, m, cm, mm, inch');
}
```

### **✅ Model-Level Validation:**
```javascript
// Product model enforces:
length: {
  type: String,
  required: [true, 'Length is required for SQM calculation'],
  validate: {
    validator: function(v) {
      return v && v.trim().length > 0;
    },
    message: 'Length cannot be empty'
  }
}
```

---

## **📊 CALCULATION EXAMPLES**

### **Example 1: Feet to SQM**
```javascript
// Product: 10 feet × 8 feet carpet
// Calculation: 10 × 0.3048 = 3.048m, 8 × 0.3048 = 2.438m
// SQM: 3.048 × 2.438 = 7.432 SQM
```

### **Example 2: Mixed Units**
```javascript
// Product: 3m × 2 feet carpet  
// Calculation: 3m = 3m, 2 × 0.3048 = 0.6096m
// SQM: 3 × 0.6096 = 1.829 SQM
```

### **Example 3: Small Units**
```javascript
// Product: 300cm × 200cm carpet
// Calculation: 300 × 0.01 = 3m, 200 × 0.01 = 2m  
// SQM: 3 × 2 = 6 SQM
```

---

## **🎯 BUSINESS BENEFITS**

### **✅ Automatic Calculations:**
- No manual SQM calculations needed
- Consistent unit conversions
- Accurate material planning

### **✅ Data Integrity:**
- Compulsory dimensions prevent incomplete products
- Validation ensures valid units
- Automatic SQM calculation eliminates errors

### **✅ Recipe Accuracy:**
- Recipes based on actual product dimensions
- Material calculations scale correctly
- Cost estimates are precise

### **✅ User Experience:**
- Clear error messages for missing fields
- Automatic SQM display in responses
- Formatted dimension display

---

## **🚀 READY TO USE**

Your system now enforces:

- ✅ **Compulsory length and width** for all products
- ✅ **Automatic SQM calculation** with virtual fields
- ✅ **Unit validation** for length and width
- ✅ **Recipe accuracy** based on actual dimensions
- ✅ **Production scaling** with precise calculations
- ✅ **Error prevention** through validation

**Total: 8 API endpoints with compulsory dimension validation!** 🚀

### **🎯 Quick Start:**
```bash
# Create product (dimensions required)
POST /api/products
{
  "name": "Premium Carpet",
  "length": "10",
  "length_unit": "feet", 
  "width": "8",
  "width_unit": "feet",
  "category": "degital print"
}

# Create recipe (uses auto SQM)
POST /api/recipes
{
  "product_id": "PROD_123",
  "materials": [...]
}

# Calculate production (scales by SQM)
POST /api/recipes/calculate
{
  "product_id": "PROD_123",
  "production_quantity": 100
}
```

**Your recipe system now has compulsory dimensions with automatic SQM calculation!** 🎉
