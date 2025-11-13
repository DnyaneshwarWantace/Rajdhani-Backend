# Corrected Customer System Documentation

## Overview
This document describes the corrected MongoDB Customer model and controller to match the exact Supabase data structure.

## Customer Model Structure

### Fields Matching Supabase Data
```javascript
{
  id: String (required, unique) - Customer ID with CUST_ prefix
  name: String (required) - Customer name
  email: String (required, unique) - Customer email
  phone: String (required) - Customer phone
  
  // Basic address fields (for backward compatibility)
  address: String - Basic address
  city: String - City
  state: String - State
  pincode: String - Pincode
  
  // Customer type and status
  customer_type: String (enum: 'individual', 'business') - Customer type
  status: String (enum: 'active', 'inactive', 'suspended', 'new') - Customer status
  
  // Business information
  company_name: String - Business name (for business customers)
  gst_number: String - GST number
  
  // Address information (stored as JSON strings to match Supabase)
  permanent_address: String - JSON string of permanent address
  delivery_address: String - JSON string of delivery address
  
  // Financial information (stored as strings to match Supabase)
  credit_limit: String (default: "0.00")
  outstanding_amount: String (default: "0.00")
  
  // Order tracking
  total_orders: Number (default: 0)
  total_value: String (default: "0.00")
  last_order_date: Date - Last order date
  registration_date: Date - Registration date
  
  // Additional information
  notes: String - Additional notes
  
  // Timestamps
  created_at: Date - Creation timestamp
  updated_at: Date - Update timestamp
}
```

## Key Corrections Made

### 1. **String-Based Financial Fields**
- **Before**: `credit_limit`, `outstanding_amount`, `total_value` were Numbers
- **After**: All financial fields are stored as Strings to match Supabase
- **Reason**: Supabase stores these as strings with decimal formatting

### 2. **Address Structure**
- **Before**: Separate object fields for permanent and delivery addresses
- **After**: JSON strings to match Supabase structure
- **Reason**: Supabase stores addresses as JSON strings

### 3. **Basic Address Fields**
- **Added**: `address`, `city`, `state`, `pincode` fields for backward compatibility
- **Reason**: Some customers have basic address info in these fields

### 4. **Customer Statistics Updates**
- **Fixed**: Customer statistics now properly handle string values
- **Updated**: Order creation properly updates customer `total_value` as string
- **Fixed**: Statistics calculations parse string values correctly

## API Endpoints

### Customer Management
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

## Data Examples

### Individual Customer
```javascript
{
  "id": "CUST-001",
  "name": "Dnyaneshwar",
  "email": "dnyan@gmail.com",
  "phone": "5546775668",
  "address": "a",
  "city": "pune",
  "state": "maharastra",
  "pincode": "412207",
  "customer_type": "individual",
  "status": "active",
  "total_orders": 1,
  "total_value": "23600.00",
  "last_order_date": "2025-10-13",
  "registration_date": "2025-10-13",
  "gst_number": "767767556444",
  "company_name": null,
  "credit_limit": "0.00",
  "outstanding_amount": "23600.00",
  "permanent_address": null,
  "delivery_address": null
}
```

### Business Customer
```javascript
{
  "id": "CUST-251013-001",
  "name": "Rajdhani Syntex",
  "email": "rajdhanidigi@gmail.com",
  "phone": "9811651500",
  "address": "",
  "city": "Gurgaon",
  "state": "Haryana",
  "pincode": "122001",
  "customer_type": "business",
  "status": "active",
  "total_orders": 2,
  "total_value": "57750.00",
  "last_order_date": "2025-10-13",
  "registration_date": "2025-10-13",
  "gst_number": "06AACCR8131N1Z4",
  "company_name": "Rajdhani Syntex",
  "credit_limit": "0.00",
  "outstanding_amount": "57750.00",
  "permanent_address": null,
  "delivery_address": null
}
```

### Customer with Address Objects
```javascript
{
  "id": "CUST-251005-148",
  "name": "John Doe",
  "email": "john.doe.1759612580136@example.com",
  "phone": "+1234567890",
  "address": "123 Main Street, Downtown",
  "city": "New York",
  "state": "NY",
  "pincode": "10001",
  "customer_type": "individual",
  "status": "active",
  "total_orders": 0,
  "total_value": "0.00",
  "last_order_date": null,
  "registration_date": "2025-10-04",
  "gst_number": "29ABCDE1234F1Z5",
  "company_name": null,
  "credit_limit": "0.00",
  "outstanding_amount": "0.00",
  "permanent_address": "{\"city\": \"New York\", \"state\": \"NY\", \"street\": \"123 Main Street\", \"country\": \"USA\", \"pincode\": \"10001\"}",
  "delivery_address": "{\"city\": \"New York\", \"state\": \"NY\", \"street\": \"456 Business Avenue\", \"country\": \"USA\", \"pincode\": \"10002\"}"
}
```

## Business Logic

### 1. **Customer Creation**
- Automatic ID generation with `CUST_` prefix
- Default values for financial fields as strings
- Email uniqueness validation
- Customer type and status defaults

### 2. **Customer Updates**
- Email uniqueness check on updates
- Financial field updates as strings
- Address handling for both basic and JSON formats

### 3. **Order Integration**
- Customer statistics updated when orders are created
- `total_orders` incremented
- `total_value` updated as string
- `last_order_date` updated

### 4. **Statistics Calculation**
- Proper parsing of string values for calculations
- Outstanding amount filtering
- Business vs individual customer counts

## Validation Rules

### 1. **Required Fields**
- `name`: Customer name
- `email`: Unique email address
- `phone`: Phone number

### 2. **Email Validation**
- Must be unique across all customers
- Checked on both create and update operations

### 3. **Financial Field Validation**
- Credit limit cannot be negative
- All financial fields stored as strings with decimal formatting

### 4. **Customer Type Validation**
- Must be either 'individual' or 'business'
- Business customers can have company_name and gst_number

## Error Handling

### 1. **Duplicate Email**
```javascript
{
  "success": false,
  "error": "A customer with this email already exists"
}
```

### 2. **Customer Not Found**
```javascript
{
  "success": false,
  "error": "Customer not found"
}
```

### 3. **Invalid Credit Limit**
```javascript
{
  "success": false,
  "error": "Credit limit cannot be negative"
}
```

### 4. **Orders Exist**
```javascript
{
  "success": false,
  "error": "Cannot delete customer. X order(s) are associated with this customer."
}
```

## Performance Considerations

### 1. **Indexing**
- Email field indexed for uniqueness
- Phone field indexed for searches
- Status and customer_type indexed for filtering

### 2. **Query Optimization**
- Efficient filtering by status, type, and search terms
- Pagination support for large customer lists
- Population of related orders when needed

### 3. **Data Consistency**
- Atomic operations for customer creation/updates
- Proper handling of string-based financial calculations
- Automatic timestamp updates

## Integration Points

### 1. **Order System**
- Customer statistics updated on order creation
- Order history retrieval
- Outstanding amount tracking

### 2. **Address Management**
- Support for both basic and structured addresses
- JSON string storage for complex address data
- Backward compatibility with simple address fields

### 3. **Business Logic**
- Customer type-specific handling
- GST number management for business customers
- Credit limit enforcement

This corrected customer system now perfectly matches the Supabase data structure while maintaining all the necessary functionality for customer management in the MongoDB backend.
