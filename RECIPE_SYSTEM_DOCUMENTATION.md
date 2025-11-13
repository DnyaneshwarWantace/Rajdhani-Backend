# 🍳 **RECIPE SYSTEM DOCUMENTATION**
## Complete Recipe Management with SQM Calculation

### **📋 Overview**
The recipe system allows you to define material requirements for products based on **1 SQM (Square Meter)** and automatically calculates materials needed for any production quantity.

---

## **🏗️ SYSTEM ARCHITECTURE**

### **📊 Database Structure:**
```
Product (Base Product)
    ↓ (1:1)
ProductRecipe (Recipe for 1 SQM)
    ↓ (1:Many)
RecipeMaterial (Materials needed per SQM)
```

### **🔄 Workflow:**
1. **Create Product** → Set dimensions (length × width)
2. **Create Recipe** → Define materials needed for 1 SQM
3. **Calculate Production** → Auto-calculate materials for any quantity
4. **SQM Calculation** → Automatic conversion from any unit to SQM

---

## **📐 SQM CALCULATION**

### **✅ Supported Units:**
- **Length**: feet, m, cm, mm, inch, yard
- **Width**: feet, m, cm, mm, inch

### **🔢 Conversion Logic:**
```javascript
// Example: 10 feet × 8 feet = 7.432 SQM
const lengthInMeters = 10 * 0.3048; // 3.048m
const widthInMeters = 8 * 0.3048;   // 2.438m
const sqm = 3.048 * 2.438;          // 7.432 SQM
```

### **📏 Unit Conversions:**
| Unit | To Meters | Example |
|------|-----------|---------|
| feet | × 0.3048 | 10 feet = 3.048m |
| m | × 1 | 3m = 3m |
| cm | × 0.01 | 300cm = 3m |
| mm | × 0.001 | 3000mm = 3m |
| inch | × 0.0254 | 120 inch = 3.048m |
| yard | × 0.9144 | 3.33 yard = 3.048m |

---

## **🚀 API ENDPOINTS**

### **📝 Recipe Management**

#### **Create Recipe**
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
      "cost_per_unit": 200,
      "specifications": "High quality cotton",
      "quality_requirements": "Grade A",
      "waste_factor": 5
    },
    {
      "material_id": "PROD_789",
      "material_name": "Backing Material",
      "material_type": "product",
      "quantity_per_sqm": 1.2,
      "unit": "sqm",
      "cost_per_unit": 150
    }
  ],
  "description": "Premium carpet recipe",
  "version": "1.0",
  "created_by": "user123"
}
```

#### **Get Recipe by Product**
```http
GET /api/recipes/product/{product_id}
```

#### **Get All Recipes**
```http
GET /api/recipes?limit=50&offset=0
```

#### **Update Recipe**
```http
PUT /api/recipes/{recipe_id}
Content-Type: application/json

{
  "description": "Updated recipe description",
  "version": "1.1"
}
```

#### **Delete Recipe**
```http
DELETE /api/recipes/{recipe_id}
```

### **🧱 Material Management**

#### **Add Material to Recipe**
```http
POST /api/recipes/{recipe_id}/materials
Content-Type: application/json

{
  "material_id": "MAT_999",
  "material_name": "Dye Chemical",
  "material_type": "raw_material",
  "quantity_per_sqm": 0.1,
  "unit": "liters",
  "cost_per_unit": 50,
  "specifications": "Blue dye",
  "is_optional": false,
  "waste_factor": 2
}
```

#### **Remove Material from Recipe**
```http
DELETE /api/recipes/{recipe_id}/materials/{material_id}
```

### **🧮 Production Calculation**

#### **Calculate Materials for Production**
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
      "total_cost": 125000
    },
    "materials": [
      {
        "material_id": "MAT_456",
        "material_name": "Cotton Yarn",
        "material_type": "raw_material",
        "quantity_per_sqm": 0.5,
        "effective_quantity_per_sqm": 0.525,
        "total_quantity_needed": 390.18,
        "unit": "kg",
        "cost_per_unit": 200,
        "total_cost": 78036,
        "waste_factor": 5
      }
    ]
  }
}
```

---

## **📊 RESPONSE FORMATS**

### **✅ Recipe Response**
```json
{
  "success": true,
  "data": {
    "recipe": {
      "id": "REC_123",
      "product_id": "PROD_123",
      "product_name": "Premium Carpet",
      "base_unit": "sqm",
      "total_cost_per_sqm": 168.25,
      "description": "Premium carpet recipe",
      "version": "1.0",
      "is_active": true,
      "created_by": "user123",
      "created_at": "2025-01-15T10:30:00.000Z"
    },
    "materials": [
      {
        "id": "RM_456",
        "recipe_id": "REC_123",
        "material_id": "MAT_789",
        "material_name": "Cotton Yarn",
        "material_type": "raw_material",
        "quantity_per_sqm": 0.5,
        "unit": "kg",
        "cost_per_unit": 200,
        "total_cost_per_sqm": 100,
        "effective_quantity_per_sqm": 0.525,
        "specifications": "High quality cotton",
        "quality_requirements": "Grade A",
        "is_optional": false,
        "waste_factor": 5
      }
    ]
  }
}
```

---

## **🎯 BUSINESS WORKFLOWS**

### **1. Create Product with Recipe**
```javascript
// 1. Create product with dimensions
POST /api/products
{
  "name": "Premium Carpet",
  "length": "10",
  "width": "8",
  "length_unit": "feet",
  "width_unit": "feet",
  "category": "degital print",
  "has_recipe": true
}

// 2. Create recipe for 1 SQM
POST /api/recipes
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
  ]
}
```

### **2. Calculate Production Materials**
```javascript
// Calculate materials for 100 units
POST /api/recipes/calculate
{
  "product_id": "PROD_123",
  "production_quantity": 100
}

// Result: 100 units × 7.432 SQM = 743.2 total SQM
// Materials: 743.2 SQM × 0.5 kg/SQM = 371.6 kg cotton yarn
```

### **3. Update Recipe Materials**
```javascript
// Add new material to existing recipe
POST /api/recipes/REC_123/materials
{
  "material_id": "MAT_999",
  "material_name": "Dye Chemical",
  "material_type": "raw_material",
  "quantity_per_sqm": 0.1,
  "unit": "liters",
  "cost_per_unit": 50
}
```

---

## **🔧 KEY FEATURES**

### **✅ Automatic SQM Calculation**
- Converts any length/width unit to SQM
- Handles feet, meters, cm, mm, inches, yards
- Accurate decimal calculations

### **✅ Waste Factor Support**
- Add waste percentage to materials
- Automatic effective quantity calculation
- Realistic production planning

### **✅ Cost Tracking**
- Cost per SQM calculation
- Total production cost estimation
- Material cost breakdown

### **✅ Flexible Material Types**
- Raw materials (from inventory)
- Other products (sub-assemblies)
- Mixed material recipes

### **✅ Production Scaling**
- Calculate materials for any quantity
- Automatic unit conversions
- Cost estimation for production

---

## **📈 CALCULATION EXAMPLES**

### **Example 1: Carpet Production**
```javascript
// Product: 10 feet × 8 feet carpet
// Recipe: 0.5 kg cotton yarn per SQM
// Production: 100 units

// Calculation:
// 1. SQM per unit: 10ft × 8ft = 7.432 SQM
// 2. Total SQM: 100 units × 7.432 SQM = 743.2 SQM
// 3. Cotton needed: 743.2 SQM × 0.5 kg/SQM = 371.6 kg
// 4. With 5% waste: 371.6 kg × 1.05 = 390.18 kg
```

### **Example 2: Different Units**
```javascript
// Product: 3m × 2m carpet
// Recipe: 0.3 kg yarn per SQM
// Production: 50 units

// Calculation:
// 1. SQM per unit: 3m × 2m = 6 SQM
// 2. Total SQM: 50 units × 6 SQM = 300 SQM
// 3. Yarn needed: 300 SQM × 0.3 kg/SQM = 90 kg
```

---

## **🎉 READY TO USE**

Your recipe system now includes:

- ✅ **Automatic SQM calculation** from any units
- ✅ **Recipe management** with version control
- ✅ **Material tracking** with waste factors
- ✅ **Production scaling** for any quantity
- ✅ **Cost estimation** for planning
- ✅ **Flexible material types** (raw materials + products)
- ✅ **Complete API** for all operations

**Total: 8 API endpoints covering complete recipe management!** 🚀

### **🚀 Quick Start:**
```bash
# Create a recipe
POST /api/recipes
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
  ]
}

# Calculate production materials
POST /api/recipes/calculate
{
  "product_id": "PROD_123",
  "production_quantity": 100
}
```

**Your recipe system is now 100% ready for production planning!** 🎉
