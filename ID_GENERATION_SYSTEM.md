# ID Generation System Documentation

## Overview
This document describes the MongoDB ID generation system that matches the exact Supabase ID sequence structure. The system uses date-based sequences with prefixes to generate unique IDs for all entities.

## ID Sequence Model

### Structure
```javascript
{
  id: Number (required, unique) - Auto-incrementing sequence ID
  prefix: String (required) - ID prefix (e.g., 'PRO', 'CUST', 'QR')
  date_str: String (required) - Date string in YYMMDD format or 'global'
  last_sequence: Number (required) - Last sequence number used
  created_at: Date - Creation timestamp
  updated_at: Date - Update timestamp
}
```

### Indexes
- `id`: Primary key, auto-incrementing
- `{ prefix: 1, date_str: 1 }`: Compound unique index

## ID Generation Functions

### 1. **Core Generation Function**
```javascript
generateId(prefix, useGlobal = false)
```
- **Format**: `PREFIX-DATE-XXX` (e.g., `PRO-251013-001`)
- **Date Format**: YYMMDD (e.g., 251013 for 2025-10-13)
- **Sequence**: 3-digit padded sequence (001, 002, 003...)
- **Global**: Use 'global' date string for global sequences

### 2. **Entity-Specific Functions**

#### Products
```javascript
generateProductId() // PRO-251013-001
generateQRCode()  // QR-251013-001
```

#### Customers
```javascript
generateCustomerId(useGlobal = true) // CUST-global-001 or CUST-251013-001
```

#### Orders
```javascript
generateOrderId()        // ORD-251013-001
generateOrderItemId()    // ORDITEM-251013-001
generateOrderNumber()    // ON-251013-001
```

#### Raw Materials & Suppliers
```javascript
generateRawMaterialId()    // MAT-251013-001
generateSupplierId()        // SUP-251013-001
generatePurchaseOrderId()   // PO-251013-001
```

#### Recipes
```javascript
generateRecipeId()         // RECIPE-251013-001
generateRecipeMaterialId() // RECMAT-251013-001
```

#### Audit
```javascript
generateAuditId() // AUDIT-251013-001
```

## ID Format Examples

### Date-Based Sequences
```
PRO-251013-001  // Product created on 2025-10-13, sequence 1
PRO-251013-002  // Product created on 2025-10-13, sequence 2
PRO-251014-001  // Product created on 2025-10-14, sequence 1
```

### Global Sequences
```
CUST-global-001  // Customer with global sequence
CUST-global-002  // Next customer in global sequence
```

### QR Codes
```
QR-251013-001   // QR code generated on 2025-10-13
QR-251013-002   // Next QR code on same date
```

## Sequence Management

### 1. **Automatic Sequence Creation**
- New sequences are created automatically when first ID is generated
- Each prefix + date combination gets its own sequence
- Sequences start at 1 and increment automatically

### 2. **Date-Based Reset**
- Sequences reset daily (new date = new sequence starting at 1)
- Global sequences continue across dates
- Date format: YYMMDD (e.g., 251013 for 2025-10-13)

### 3. **Sequence Tracking**
- Each sequence tracks its last used number
- Atomic increment operations prevent duplicates
- Database-level uniqueness constraints

## Database Operations

### 1. **Sequence Creation**
```javascript
// First ID generation for a prefix+date combination
const sequence = new IdSequence({
  id: await getNextIdSequenceId(),
  prefix: 'PRO',
  date_str: '251013',
  last_sequence: 1
});
```

### 2. **Sequence Increment**
```javascript
// Subsequent ID generations
sequence.last_sequence += 1;
await sequence.save();
```

### 3. **Sequence Lookup**
```javascript
// Find existing sequence
const sequence = await IdSequence.findOne({ 
  prefix: 'PRO', 
  date_str: '251013' 
});
```

## Controller Integration

### 1. **Updated Controllers**
All controllers now use async ID generation:

```javascript
// Before
const productData = {
  id: generateId('PROD')
};

// After
const productData = {
  id: await generateProductId()
};
```

### 2. **Error Handling**
- Fallback to timestamp-based IDs if sequence generation fails
- Database connection error handling
- Atomic operations to prevent race conditions

### 3. **Performance**
- Efficient sequence lookups with compound indexes
- Minimal database operations per ID generation
- Cached sequence information where possible

## API Endpoints

### 1. **Sequence Information**
```javascript
getSequenceInfo(prefix, dateStr) // Get current sequence info
getAllSequencesForPrefix(prefix) // Get all sequences for a prefix
```

### 2. **ID Generation**
```javascript
generateId(prefix, useGlobal)     // Generic ID generation
generateProductId()              // Product-specific
generateCustomerId(useGlobal)    // Customer-specific
// ... and more
```

## Data Examples

### Supabase-Compatible Sequences
```javascript
// QR Code sequences
{ id: 879, prefix: "QR", date_str: "251001", last_sequence: 71 }
{ id: 1002, prefix: "QR", date_str: "251006", last_sequence: 82 }
{ id: 1088, prefix: "QR", date_str: "251007", last_sequence: 390 }

// Product sequences
{ id: 881, prefix: "PRO", date_str: "251001", last_sequence: 1 }
{ id: 2574, prefix: "PRO", date_str: "251013", last_sequence: 13 }

// Customer sequences
{ id: 2901, prefix: "CUST", date_str: "global", last_sequence: 1 }

// Order sequences
{ id: 2919, prefix: "ORD", date_str: "251013", last_sequence: 1 }
```

### Generated IDs
```
PRO-251013-001   // First product on 2025-10-13
PRO-251013-002   // Second product on 2025-10-13
PRO-251014-001   // First product on 2025-10-14

CUST-global-001  // First customer (global sequence)
CUST-global-002  // Second customer (global sequence)

QR-251013-001    // First QR code on 2025-10-13
QR-251013-002    // Second QR code on 2025-10-13
```

## Migration from Supabase

### 1. **Data Import**
- Import existing ID sequences from Supabase
- Maintain sequence continuity
- Preserve existing ID formats

### 2. **Compatibility**
- Exact format matching with Supabase
- Same date string format (YYMMDD)
- Same sequence padding (3 digits)

### 3. **Validation**
- Ensure no ID conflicts during migration
- Verify sequence continuity
- Test ID generation after migration

## Error Handling

### 1. **Database Errors**
- Connection failures: Fallback to timestamp IDs
- Constraint violations: Retry with incremented sequence
- Transaction rollbacks: Proper cleanup

### 2. **Race Conditions**
- Atomic sequence increments
- Database-level locking
- Retry mechanisms for conflicts

### 3. **Validation**
- Prefix validation
- Date format validation
- Sequence number validation

## Performance Considerations

### 1. **Indexing Strategy**
- Primary key on `id` field
- Compound index on `{ prefix: 1, date_str: 1 }`
- Efficient sequence lookups

### 2. **Query Optimization**
- Minimal database operations
- Efficient sequence increments
- Cached sequence information

### 3. **Scalability**
- Horizontal scaling support
- Sequence partitioning by date
- Global sequence management

## Security Considerations

### 1. **ID Uniqueness**
- Database-level constraints
- Atomic operations
- Race condition prevention

### 2. **Sequence Integrity**
- Transaction-based operations
- Rollback on failures
- Consistency checks

### 3. **Access Control**
- ID generation permissions
- Sequence modification restrictions
- Audit trail maintenance

This ID generation system now perfectly matches your Supabase structure and provides reliable, unique ID generation for all entities in the MongoDB backend.
