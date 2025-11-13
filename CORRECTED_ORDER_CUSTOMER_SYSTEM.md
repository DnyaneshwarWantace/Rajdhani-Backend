# Corrected Order and Customer System Documentation

## Overview
This document describes the MongoDB backend implementation for the Order and Customer management system, corrected to match the exact Supabase data structure.

## Models

### Customer Model (`Customer.js`)
```javascript
{
  id: String (required, unique) - Customer ID with CUST_ prefix
  name: String (required) - Customer name
  email: String (required, unique) - Customer email
  phone: String (required) - Customer phone
  customer_type: String (enum: 'individual', 'business') - Customer type
  status: String (enum: 'active', 'inactive', 'suspended', 'new') - Customer status
  company_name: String - Business name (for business customers)
  gst_number: String - GST number
  permanent_address: Object - Permanent address details
  delivery_address: Object - Delivery address details
  credit_limit: Number - Credit limit
  outstanding_amount: Number - Outstanding amount
  total_orders: Number - Total orders count
  total_value: Number - Total order value
  last_order_date: Date - Last order date
  registration_date: Date - Registration date
  notes: String - Additional notes
  created_at: Date - Creation timestamp
  updated_at: Date - Update timestamp
}
```

### Order Model (`Order.js`)
```javascript
{
  id: String (required, unique) - Order ID with ORD_ prefix
  order_number: String (required, unique) - Order number
  customer_id: String (ref: Customer) - Customer reference
  customer_name: String (required) - Customer name
  customer_email: String - Customer email
  customer_phone: String - Customer phone
  order_date: Date (required) - Order date
  expected_delivery: Date - Expected delivery date
  
  // Pricing (stored as strings to match Supabase)
  subtotal: String (default: "0.00")
  gst_rate: String (default: "18.00")
  gst_amount: String (default: "0.00")
  gst_included: Boolean (default: true)
  discount_amount: String (default: "0.00")
  total_amount: String (required, default: "0.00")
  paid_amount: String (default: "0.00")
  outstanding_amount: String (default: "0.00")
  
  // Payment management
  payment_method: String (enum: 'cash', 'card', 'bank-transfer', 'credit', 'cheque', 'upi')
  payment_terms: String (default: '30 days')
  due_date: Date - Due date for credit payments
  
  // Order status and workflow
  status: String (enum: 'pending', 'accepted', 'in_production', 'ready', 'dispatched', 'delivered', 'cancelled')
  workflow_step: String (enum: 'accept', 'dispatch', 'delivered')
  priority: String (enum: 'low', 'medium', 'high', 'urgent')
  
  // Workflow timestamps
  accepted_at: Date
  dispatched_at: Date
  delivered_at: Date
  
  // Delivery information (stored as JSON string)
  delivery_address: String - JSON string of delivery address
  
  // Additional information
  special_instructions: String
  notes: String
  created_by: String (required)
  created_at: Date
  updated_at: Date
}
```

### OrderItem Model (`OrderItem.js`)
```javascript
{
  id: String (required, unique) - Order item ID with ORDITEM prefix
  order_id: String (required, ref: Order) - Order reference
  product_id: String (ref: Product) - Product reference (nullable)
  individual_product_id: String (ref: IndividualProduct) - Individual product reference (nullable)
  product_name: String (required) - Product name
  product_type: String (enum: 'product', 'raw_material', default: 'product')
  
  // Quantity and pricing (stored as strings)
  quantity: Number (required, min: 1)
  unit_price: String (required)
  total_price: String (required)
  quality_grade: String - Quality grade
  
  // Product specifications
  specifications: String - Product specifications
  
  // Individual product tracking
  selected_individual_products: Array - Selected individual products
  available_stock: Number - Available stock
  individual_stock_tracking: Boolean - Stock tracking flag
  
  // Raw material tracking
  raw_material_id: String (ref: RawMaterial)
  supplier_id: String (ref: Supplier)
  
  // Production tracking
  production_status: String (enum: 'pending', 'in_production', 'completed', 'shipped')
  production_notes: String
  
  created_at: Date
  updated_at: Date
}
```

## Key Features

### 1. **Flexible GST Management**
- **GST Rate**: Configurable GST rate (default 18%)
- **GST Inclusion**: Toggle between included/excluded GST
- **Dynamic Calculation**: Automatic recalculation when GST settings change
- **String Storage**: All monetary values stored as strings to match Supabase

### 2. **Payment Management**
- **Flexible Payments**: Orders can be created with any payment amount (including ₹0)
- **Payment Methods**: Support for cash, card, bank transfer, credit, cheque, UPI
- **Payment Terms**: Automatic payment terms based on payment amount
- **Outstanding Tracking**: Automatic calculation of outstanding amounts

### 3. **Individual Product Tracking**
- **Product Selection**: Track which specific individual products are allocated to orders
- **Status Management**: Individual products marked as 'sold' when order is dispatched
- **Stock Integration**: Integration with individual product inventory
- **QR Code Tracking**: Support for QR code-based product tracking

### 4. **Order Workflow**
- **Status Progression**: pending → accepted → in_production → ready → dispatched → delivered
- **Workflow Steps**: accept → dispatch → delivered
- **Automatic Timestamps**: Automatic timestamp updates for status changes
- **Individual Product Allocation**: Required before dispatch

### 5. **Customer Management**
- **Customer Types**: Individual and business customers
- **Address Management**: Separate permanent and delivery addresses
- **Credit Management**: Credit limits and outstanding amount tracking
- **Order History**: Automatic tracking of customer order statistics

## API Endpoints

### Customer Endpoints
```
POST   /api/customers                    - Create customer
GET    /api/customers                    - Get all customers (with filtering)
GET    /api/customers/stats              - Get customer statistics
GET    /api/customers/:id                - Get customer by ID
GET    /api/customers/:id/orders         - Get customer orders
PUT    /api/customers/:id                - Update customer
PATCH  /api/customers/:id/status         - Update customer status
PATCH  /api/customers/:id/credit-limit   - Update credit limit
DELETE /api/customers/:id                - Delete customer
```

### Order Endpoints
```
POST   /api/orders                       - Create order
GET    /api/orders                       - Get all orders (with filtering)
GET    /api/orders/stats                 - Get order statistics
GET    /api/orders/:id                   - Get order by ID
PUT    /api/orders/:id                   - Update order
PATCH  /api/orders/:id/status            - Update order status
PATCH  /api/orders/:id/payment           - Update order payment
PATCH  /api/orders/:id/gst               - Update order GST settings
DELETE /api/orders/:id                   - Delete order
```

### Order Item Endpoints
```
POST   /api/orders/:order_id/items                    - Add item to order
PUT    /api/orders/items/:item_id                      - Update order item
PATCH  /api/orders/items/:item_id/individual-products - Update individual product selections
DELETE /api/orders/items/:item_id                      - Remove order item
```

## Data Flow

### 1. **Order Creation Flow**
1. Customer selection/creation
2. Product selection with quantity and pricing
3. Individual product selection (if applicable)
4. GST configuration (rate and inclusion)
5. Payment amount specification
6. Delivery address setup
7. Order creation with automatic calculations

### 2. **Order Processing Flow**
1. **Pending**: Order created, awaiting approval
2. **Accepted**: Order approved, individual products can be selected
3. **In Production**: Production started (if required)
4. **Ready**: Order ready for dispatch
5. **Dispatched**: Order dispatched, individual products marked as sold
6. **Delivered**: Order delivered to customer

### 3. **Individual Product Selection**
1. Order items require individual product selection
2. Available individual products filtered by product ID
3. Products selected and allocated to order items
4. Order ready for dispatch when all items have required individual products
5. Individual products marked as 'sold' when order is dispatched

## Business Logic

### 1. **GST Calculation**
```javascript
// GST calculation based on inclusion setting
if (gst_included) {
  gst_amount = (subtotal * gst_rate) / 100;
} else {
  gst_amount = 0;
}
total_amount = subtotal + gst_amount - discount_amount;
```

### 2. **Payment Method Assignment**
```javascript
if (paid_amount >= total_amount) {
  payment_method = 'cash';
  payment_terms = 'Paid in full';
} else if (paid_amount > 0) {
  payment_method = 'credit';
  payment_terms = 'Partial payment';
} else {
  payment_method = 'credit';
  payment_terms = '30 days';
}
```

### 3. **Individual Product Status Updates**
- **Allocated**: When selected for an order
- **Reserved**: When order is accepted
- **Sold**: When order is dispatched
- **Shipped**: When order is delivered

## Integration Points

### 1. **Product System Integration**
- Order items reference products
- Individual product tracking
- Stock level management
- Production workflow integration

### 2. **Customer System Integration**
- Customer order history
- Outstanding amount tracking
- Credit limit management
- Customer statistics updates

### 3. **Raw Material System Integration**
- Raw material selling through orders
- Supplier integration
- Stock management for raw materials

## Error Handling

### 1. **Validation Errors**
- Required field validation
- Data type validation
- Business rule validation
- Reference integrity validation

### 2. **Business Logic Errors**
- Insufficient stock validation
- Credit limit validation
- Individual product availability validation
- Order status transition validation

### 3. **Database Errors**
- Duplicate key errors
- Reference constraint errors
- Transaction rollback handling

## Performance Considerations

### 1. **Indexing Strategy**
- Customer email and phone indexes
- Order status and date indexes
- Product and individual product indexes
- Order item order_id indexes

### 2. **Query Optimization**
- Efficient filtering and pagination
- Aggregation for statistics
- Population of related documents
- Caching for frequently accessed data

### 3. **Data Consistency**
- Atomic operations for order creation
- Transaction handling for complex operations
- Automatic calculation updates
- Status synchronization

## Security Considerations

### 1. **Data Validation**
- Input sanitization
- SQL injection prevention
- XSS protection
- Data type validation

### 2. **Access Control**
- Authentication requirements
- Authorization checks
- Role-based access control
- API rate limiting

### 3. **Data Protection**
- Sensitive data encryption
- Audit trail maintenance
- Data backup strategies
- Privacy compliance

This corrected system now perfectly matches the Supabase data structure while providing all the necessary functionality for order and customer management in the MongoDB backend.
